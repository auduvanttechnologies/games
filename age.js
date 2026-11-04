/* Korvyn Games: ads on this site's pages, only for visitors who say they are 18 or older.
   Asks once for a year of birth. The answer stays in this browser and is never sent anywhere.
   Until the visitor says they are 18 or older, the ad server is not contacted at all. */
(function () {
  'use strict';

  var KEY = 'korvyn_birth_year';
  var LOADER = 'https://ads.auduvanttechnologies.com/v1/loader.js';

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* storage blocked: ask again next visit */ }
  }

  // With only a year, someone born in (this year - 18) may still be 17, so they count as 18 from the next year.
  function isAdult(value) {
    var year = parseInt(value, 10);
    if (!year) { return false; }
    return new Date().getFullYear() - year - 1 >= 18;
  }

  function showAds() {
    var slots = document.querySelectorAll('.zawadi-slot');
    if (!slots.length) { return; }
    for (var i = 0; i < slots.length; i++) { slots[i].hidden = false; }
    var s = document.createElement('script');
    s.src = LOADER;
    s.async = true;
    document.body.appendChild(s);
  }

  var STYLE =
    '.zawadi-slot{display:flex;justify-content:center;margin:48px auto;padding:0 16px;}' +
    '.zawadi-slot[hidden],.zawadi-slot:has(ins[data-zawadi-empty]){display:none;}' +
    '.kg-age{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#171717;color:#F4F1E8;' +
      'padding:16px 20px;font-family:Inter,-apple-system,"Segoe UI",Arial,sans-serif;font-size:15px;line-height:1.5;' +
      'box-shadow:0 -6px 24px rgba(0,0,0,0.25);}' +
    '.kg-age form{max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;}' +
    '.kg-age label{font-weight:600;}' +
    '.kg-age select{font:inherit;padding:8px 10px;border-radius:8px;border:1px solid rgba(244,241,232,0.4);' +
      'background:#F4F1E8;color:#171717;min-width:8rem;}' +
    '.kg-age .kg-go{font:inherit;font-weight:700;border:0;border-radius:999px;padding:9px 20px;' +
      'background:#F4C542;color:#171717;cursor:pointer;}' +
    '.kg-age .kg-go[disabled]{opacity:0.5;cursor:not-allowed;}' +
    '.kg-age .kg-skip{font:inherit;background:none;border:0;color:#F4F1E8;text-decoration:underline;cursor:pointer;padding:8px 4px;}' +
    '.kg-age :focus-visible{outline:3px solid #F4C542;outline-offset:2px;}' +
    '.kg-age .kg-note{flex-basis:100%;margin:0;font-size:13px;color:rgba(244,241,232,0.72);}' +
    '.kg-age .kg-note a{color:#F4F1E8;}';

  function ask() {
    var bar = document.createElement('section');
    bar.className = 'kg-age';
    bar.setAttribute('aria-label', 'Year of birth');

    var form = document.createElement('form');
    var label = document.createElement('label');
    label.setAttribute('for', 'kg-year');
    label.textContent = 'What year were you born?';

    var select = document.createElement('select');
    select.id = 'kg-year';
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Year';
    select.appendChild(blank);
    var now = new Date().getFullYear();
    for (var y = now; y >= now - 100; y--) {
      var o = document.createElement('option');
      o.value = String(y);
      o.textContent = String(y);
      select.appendChild(o);
    }

    var go = document.createElement('button');
    go.type = 'submit';
    go.className = 'kg-go';
    go.textContent = 'Continue';
    go.disabled = true;
    select.addEventListener('change', function () { go.disabled = !select.value; });

    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'kg-skip';
    skip.textContent = 'Skip';

    var note = document.createElement('p');
    note.className = 'kg-note';
    note.innerHTML = 'We ask once. Your answer stays in this browser and is never sent to us. ' +
      '<a href="/games/privacy.html">Privacy Policy</a>';

    form.appendChild(label);
    form.appendChild(select);
    form.appendChild(go);
    form.appendChild(skip);
    form.appendChild(note);
    bar.appendChild(form);
    document.body.appendChild(bar);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!select.value) { return; }
      save(select.value);
      bar.remove();
      if (isAdult(select.value)) { showAds(); }
    });
    skip.addEventListener('click', function () {
      save('skipped');
      bar.remove();
    });
  }

  function start() {
    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    var answer = read();
    if (answer === null) {
      ask();
    } else if (isAdult(answer)) {
      showAds();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
