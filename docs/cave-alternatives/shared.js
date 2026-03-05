(function () {
  var yearNodes = document.querySelectorAll('[data-year]');
  var year = new Date().getUTCFullYear();
  yearNodes.forEach(function (node) {
    node.textContent = String(year);
  });

  var revealNodes = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!revealNodes.length) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    revealNodes.forEach(function (node) {
      node.classList.add('is-visible');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  revealNodes.forEach(function (node) {
    observer.observe(node);
  });
})();
