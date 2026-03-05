(function () {
  var yearNodes = document.querySelectorAll('[data-year]');
  var year = new Date().getUTCFullYear();

  yearNodes.forEach(function (n) {
    n.textContent = String(year);
  });

  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!items.length) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) {
      el.classList.add('show');
    });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -30px 0px' }
  );

  items.forEach(function (el) {
    io.observe(el);
  });
})();
