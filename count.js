/* Korvyn Games visit counter. Sends only this page's name. Stores nothing in the browser. */
(function () {
  var script = document.currentScript;
  var page = script && script.getAttribute('data-page');
  if (!page || !navigator.sendBeacon) return;
  try {
    navigator.sendBeacon('https://korvyn-counter-335157204043.us-central1.run.app/v1/visit', page);
  } catch (e) {}
})();
