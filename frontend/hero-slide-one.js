/* Observe the existing carousel indicator; do not replace its timer/controls. */
(() => {
  const slide = document.querySelector('.cfp-campaign-slide');
  const indicator = document.querySelector('.dot-btn[data-slide="0"]');
  if (!slide || !indicator) return;
  const sync = () => {
    const active = indicator.classList.contains('active');
    slide.classList.toggle('is-active', active);
    slide.inert = !active;
    slide.querySelector('.cfp-campaign-shop').tabIndex = active ? 0 : -1;
  };
  sync();
  new MutationObserver(sync).observe(indicator, {attributes:true,attributeFilter:['class']});
})();
