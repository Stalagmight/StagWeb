(function () {
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var yearNodes = document.querySelectorAll('[data-year]');
  var year = new Date().getUTCFullYear();

  yearNodes.forEach(function (node) {
    node.textContent = String(year);
  });

  if (!reveals.length) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    reveals.forEach(function (el) {
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
    { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach(function (el) {
    io.observe(el);
  });
})();
