#!/usr/bin/env python3
"""Turn a folder of app screenshots into a registered, cropped animated WebP.

Screen captures of the same window are never pixel-identical: the window sits a
few pixels off between shots and the capture includes desktop around it. Encoding
them straight produces a visible twitch on every frame change, so this does three
things before handing anything to the encoder:

  1. finds the app window in each frame and crops the desktop away,
  2. registers the crops against a reference by FFT phase correlation, so the
     residual sub-window jitter is removed too,
  3. trims to the region every frame has after shifting, so no frame contributes
     a blank edge.

Holds are given in tenths of a second per frame. They are written out as repeated
frames at 10 fps and libwebp collapses each run into one frame with a longer
delay, so the encoded file has exactly as many frames as there are inputs.

Usage:
    build-anim.py SRC_DIR OUT.webp --holds 9,7,9,13,9,5,6,13,9,20 [--width 1000]
                  [--quality 76] [--inset 3] [--band 56] [--report]
"""
from __future__ import annotations

import argparse
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image


# ── 1. locate the application window ────────────────────────────────────────
def window_bbox(rgb: np.ndarray, tol: int = 20, frac: float = 0.97) -> tuple[int, int, int, int]:
    """Bounding box of the app window inside a capture that includes desktop.

    Walks in from each edge for as long as the row or column is almost entirely
    the desktop colour, sampled from the extreme corners. The window starts at
    the first line that is not.

    This replaced a "keep lines that are >40% non-desktop" rule, which looked
    equivalent and was not: the bottom of this app is a dimmed data table or a
    modal's backdrop, mostly dark and therefore mostly *within* tolerance of a
    dark desktop. Those rows were discarded as desktop, so the detected window
    ended ~73px above its real bottom and the dialog's confirm buttons were
    sliced in half. Requiring a line to be essentially *all* desktop before
    treating it as outside the window keeps sparse content.
    """
    h, w, _ = rgb.shape
    corners = np.concatenate([
        rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3),
        rgb[-8:, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3),
    ])
    desktop = np.median(corners, axis=0)
    near = np.abs(rgb.astype(int) - desktop).sum(axis=2) <= tol

    top = 0
    while top < h - 1 and near[top].mean() > frac:
        top += 1
    bot = h
    while bot > top + 1 and near[bot - 1].mean() > frac:
        bot -= 1
    lef = 0
    while lef < w - 1 and near[:, lef].mean() > frac:
        lef += 1
    rig = w
    while rig > lef + 1 and near[:, rig - 1].mean() > frac:
        rig -= 1
    return lef, top, rig, bot


# ── 2. registration ─────────────────────────────────────────────────────────
def _ring(gray: np.ndarray, band: int) -> np.ndarray:
    """Gray image reduced to a `band`-px frame around the edges, Hann-windowed.

    An absolute band, not a fraction of the frame. The feature being registered
    is the window border, which is high-contrast and static; the interior is
    where menus and dialogs open. A proportional mask is not tight enough — the
    SpeleoDB history dialog is large enough to reach into a 24%-inset ring, so
    correlation locked onto the dialog's own edges and never converged.
    """
    g = gray.astype(np.float64)
    g = g - g.mean()
    h, w = g.shape
    m = np.zeros_like(g)
    b = max(8, min(band, h // 2 - 1, w // 2 - 1))
    m[:b, :] = 1.0
    m[-b:, :] = 1.0
    m[:, :b] = 1.0
    m[:, -b:] = 1.0
    g *= m
    g *= np.hanning(h)[:, None] * np.hanning(w)[None, :]
    return g


def shift_of(ref: np.ndarray, other: np.ndarray, band: int, radius: int) -> tuple[int, int]:
    """Integer (dy, dx) that best moves `other` onto `ref`.

    The peak is searched only within +-radius. A capture of the same window
    jitters by a handful of pixels, so a peak hundreds of pixels out is always a
    false match on repeated UI structure — taking the global argmax let one
    dialog-heavy frame register 300px off and collapse the common crop.
    """
    A = np.fft.rfft2(_ring(ref, band))
    B = np.fft.rfft2(_ring(other, band))
    R = A * np.conj(B)
    R /= np.abs(R) + 1e-12                      # phase only
    corr = np.fft.irfft2(R, s=ref.shape)
    best, bdy, bdx = -np.inf, 0, 0
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            v = corr[dy % corr.shape[0], dx % corr.shape[1]]
            if v > best:
                best, bdy, bdx = v, dy, dx
    return bdy, bdx


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--holds", required=True, help="tenths of a second per frame, comma separated")
    ap.add_argument("--width", type=int, default=1000)
    ap.add_argument("--quality", type=int, default=76)
    ap.add_argument("--inset", default="3,3,0,3",
                    help="px trimmed inside the window edge: one value, or T,R,B,L")
    ap.add_argument("--band", type=int, default=56, help="px of edge band used for correlation")
    ap.add_argument("--maxshift", type=int, default=14, help="largest plausible jitter, in px")
    ap.add_argument("--passes", type=int, default=5, help="registration refinement iterations")
    ap.add_argument("--fps", type=int, default=10)
    ap.add_argument("--window", choices=("auto","full"), default="auto",
                    help="auto = find the app window; full = capture is already only the app")
    ap.add_argument("--order", help="reorder frames, 1-based indices into the sorted list;\n                          --holds is then given in this new order")
    ap.add_argument("--crop", help="tighter crop after registration, WxH+X+Y")
    ap.add_argument("--report", action="store_true")
    a = ap.parse_args()

    files = sorted(pathlib.Path(a.src).glob("*.png"))
    if not files:
        sys.exit(f"no PNGs in {a.src}")

    # --order takes 1-based indices into the timestamp-sorted list. Capture order
    # is not always the order that reads best: the finished result can make a
    # better opening frame than the dialog that started it, and frame one is also
    # what becomes the reduced-motion still.
    if a.order:
        idx = [int(v) for v in a.order.split(",")]
        if sorted(idx) != list(range(1, len(files) + 1)):
            sys.exit(f"--order must be a permutation of 1..{len(files)}, got {idx}")
        files = [files[i - 1] for i in idx]

    holds = [int(x) for x in a.holds.split(",")]
    if len(holds) != len(files):
        sys.exit(f"{len(files)} frames but {len(holds)} holds")

    # Per-frame window boxes, then a consensus. A menu or dialog reaching the
    # frame edge throws off an individual detection, so the left/right/top edges
    # are taken as medians; the height is the smallest any frame offers, since
    # reading past a shorter window's bottom would pull in desktop.
    # --window full is for captures that are already only the app (a full-screen
    # grab). Detection cannot tell those apart reliably: a dark app on a dark
    # desktop has no contrast at the window edge, so the detector locks onto the
    # bright content core instead and silently crops the panels off. Better to
    # be told than to guess.
    raws = []
    for f in files:
        rgb = np.asarray(Image.open(f).convert("RGB"))
        if a.window == "full":
            h, w, _ = rgb.shape
            raws.append((rgb, (0, 0, w, h)))
        else:
            raws.append((rgb, window_bbox(rgb)))

    if a.window == "auto":
        for f, (rgb, b) in zip(files, raws):
            fh, fw, _ = rgb.shape
            if (b[2] - b[0]) * (b[3] - b[1]) < 0.60 * fw * fh:
                print(f"warning: {f.name}: detected window {b[2]-b[0]}x{b[3]-b[1]} is under 60% "
                      f"of the {fw}x{fh} frame — if these are full-screen captures pass --window full",
                      file=sys.stderr)
                break

    med_x0 = int(np.median([b[0] for _, b in raws]))
    med_y0 = int(np.median([b[1] for _, b in raws]))
    med_x1 = int(np.median([b[2] for _, b in raws]))
    min_h = min(b[3] - b[1] for _, b in raws)
    cw, ch = med_x1 - med_x0, min_h

    boxes = [b for _, b in raws]
    crops = []
    for rgb, _ in raws:
        h, w, _ = rgb.shape
        x0 = min(med_x0, w - cw)
        y0 = min(med_y0, h - ch)
        crops.append(rgb[y0:y0 + ch, x0:x0 + cw])
    grays = [np.asarray(Image.fromarray(c).convert("L")) for c in crops]

    # register against the frame whose window box is the median size, which is
    # less likely to be an outlier than simply taking the first
    ref_i = int(np.argsort([(b[2] - b[0]) * (b[3] - b[1]) for b in boxes])[len(boxes) // 2])
    shifts = [(0, 0)] * len(crops)
    for i, g in enumerate(grays):
        if i == ref_i:
            continue
        # Iterate to convergence. A single pass is not always enough: where a
        # large centred dialog competes with the window edges the first peak can
        # be a few pixels out, and the correction only shows up once the frame
        # has been moved and re-correlated.
        tdy = tdx = 0
        cur = g
        for _ in range(a.passes):
            dy, dx = shift_of(grays[ref_i], cur, a.band, a.maxshift)
            if dy == 0 and dx == 0:
                break
            tdy, tdx = tdy + dy, tdx + dx
            cur = np.roll(np.roll(g, tdy, axis=0), tdx, axis=1)
        shifts[i] = (tdy, tdx)

    # trim to what every frame still covers after shifting, plus the inset that
    # removes the window's own rounded corners and border antialiasing
    # --inset is per-edge (T,R,B,L, or one value for all). It exists to clear the
    # window's rounded corners and border antialiasing, which is a top/side
    # problem — the bottom edge is straight, and taking 3px off it clipped the
    # status bar. Default keeps the bottom intact.
    ins = [int(v) for v in str(a.inset).split(",")]
    if len(ins) == 1:
        ins *= 4
    if len(ins) != 4:
        sys.exit("--inset wants one value or T,R,B,L")
    i_t, i_r, i_b, i_l = ins

    top = max(0, max(dy for dy, _ in shifts)) + i_t
    bot = ch + min(0, min(dy for dy, _ in shifts)) - i_b
    lef = max(0, max(dx for _, dx in shifts)) + i_l
    rig = cw + min(0, min(dx for _, dx in shifts)) - i_r

    # Optional tighter crop, WxH+X+Y relative to the registered region. Needed
    # for full-screen captures: the whole app at 640px on the page is unreadable,
    # so those get narrowed to the panel the action happens in.
    if a.crop:
        m = re.fullmatch(r"(\d+)x(\d+)\+(-?\d+)\+(-?\d+)", a.crop)
        if not m:
            sys.exit("--crop wants WxH+X+Y")
        cwid, chei, cx, cy = (int(v) for v in m.groups())
        l2, t2 = lef + cx, top + cy
        lef, top = max(lef, l2), max(top, t2)
        rig, bot = min(rig, l2 + cwid), min(bot, t2 + chei)
        if rig <= lef or bot <= top:
            sys.exit(f"--crop leaves nothing inside the registered {rig-lef}x{bot-top} region")

    if a.report:
        print(f"reference frame : {files[ref_i].name}")
        print(f"window boxes    : {sorted({(b[2]-b[0], b[3]-b[1]) for b in boxes})}")
        print(f"common crop     : {cw}x{ch}")
        for f, b, s in zip(files, boxes, shifts):
            print(f"  {f.name}  win={b[2]-b[0]}x{b[3]-b[1]}+{b[0]}+{b[1]}  shift dy={s[0]:+d} dx={s[1]:+d}")
        print(f"final crop      : {rig - lef}x{bot - top}  (inset T{i_t} R{i_r} B{i_b} L{i_l})")

    tmp = pathlib.Path(tempfile.mkdtemp(prefix="anim-"))
    try:
        seq, n = tmp / "seq", 0
        seq.mkdir()
        out_w = a.width
        residuals = []
        aligned = []
        for i, c in enumerate(crops):
            dy, dx = shifts[i]
            # shifting the source window by (dy,dx) means reading from (top-dy, lef-dx)
            piece = c[top - dy:bot - dy, lef - dx:rig - dx]
            aligned.append(np.asarray(Image.fromarray(piece).convert("L")))
            img = Image.fromarray(piece)
            img = img.resize((out_w, round(out_w * piece.shape[0] / piece.shape[1])), Image.LANCZOS)
            p = tmp / f"f{i:02d}.png"
            img.save(p)
            for _ in range(holds[i]):
                n += 1
                (seq / f"{n:04d}.png").symlink_to(p)

        if a.report:
            # The honest check: re-register the aligned frames. Any non-zero
            # residual means a frame is still off, which is what shows up as a
            # twitch when the animation plays. RMSE is not usable here — the ring
            # contains content that genuinely changes between frames.
            resid = [shift_of(aligned[ref_i], g, a.band, a.maxshift) for g in aligned]
            bad = [(files[i].name, r) for i, r in enumerate(resid) if r != (0, 0)]
            print("residual after  : " + " ".join(f"{dy:+d},{dx:+d}" for dy, dx in resid))
            print("registration    : " + ("all frames aligned" if not bad
                                           else f"STILL OFF -> {bad}"))

        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-framerate", str(a.fps), "-i", str(seq / "%04d.png"),
            "-c:v", "libwebp_anim", "-lossless", "0",
            "-q:v", str(a.quality), "-compression_level", "6", "-loop", "0",
            a.out,
        ], check=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    size = pathlib.Path(a.out).stat().st_size
    print(f"wrote {a.out}  {size} B ({size // 1024} KB)  {n} input frames @ {a.fps}fps = {n / a.fps:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
