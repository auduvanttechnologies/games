/*
  Auduvant Technologies — Consent Manager (GDPR + CCPA)
  Drop this file on any Auduvant site (Genvium, auduvanttechnologies.com, games site).
  Handles: opt-in cookie banner, persistent "manage choices" link, Google Consent Mode v2 wiring.

  USAGE:
  1. Include this script BEFORE your gtag snippet:
       <script src="/consent.js"></script>
     Then set Consent Mode defaults BEFORE loading gtag.js:
       <script>
         gtag('consent', 'default', AZConsent.gtagDefaults);
       </script>
       <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
       <script>
         window.dataLayer = window.dataLayer || [];
         function gtag(){dataLayer.push(arguments);}
         gtag('js', new Date());
         gtag('config', 'G-XXXXXXX');
       </script>
     (AZConsent.gtagDefaults is available immediately, no need to wait for DOMContentLoaded.)

  2. Add a persistent link anywhere (footer is standard) so users can change their mind later:
       <button onclick="AZConsent.open()">Privacy Choices</button>

  That's it. The banner auto-shows on first visit if no choice is stored yet.
*/
(function (window, document) {
  'use strict';

  var STORAGE_KEY = 'auduvant_consent_v1';

  var DEFAULT_STATE = {
    necessary: true,       // always on, not user-toggleable
    analytics: false,      // GDPR: off until accepted
    advertising: false     // GDPR: off until accepted (covers Zawadi Media)
  };

  // Google Consent Mode v2 default signal — denies everything non-essential
  // until the user makes a choice. Read this BEFORE gtag('config', ...) fires.
  var gtagDefaults = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  };

  function getStoredConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function storeConsent(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        state: state,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) { /* localStorage unavailable, fail silently */ }
  }

  function pushToGtag(state) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      analytics_storage: state.analytics ? 'granted' : 'denied',
      ad_storage: state.advertising ? 'granted' : 'denied',
      ad_user_data: state.advertising ? 'granted' : 'denied',
      ad_personalization: state.advertising ? 'granted' : 'denied'
    });
  }

  var STYLE = '' +
    '.azc-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;' +
      'background:#12102e;color:#fff;padding:18px 22px;' +
      'font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;' +
      'box-shadow:0 -4px 24px rgba(0,0,0,0.3);display:flex;flex-wrap:wrap;' +
      'gap:16px;align-items:center;justify-content:space-between;}' +
    '.azc-banner p{margin:0;max-width:620px;color:rgba(255,255,255,0.85);}' +
    '.azc-banner a{color:#1FC8A9;text-decoration:underline;}' +
    '.azc-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}' +
    '.azc-btn{border:none;border-radius:8px;padding:10px 18px;font-size:13px;' +
      'font-weight:700;cursor:pointer;font-family:inherit;}' +
    '.azc-accept{background:#1FC8A9;color:#05332b;}' +
    '.azc-reject{background:transparent;border:1px solid rgba(255,255,255,0.35);color:#fff;}' +
    '.azc-manage{background:transparent;color:rgba(255,255,255,0.75);' +
      'text-decoration:underline;padding:10px 4px;}' +
    '.azc-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.6);' +
      'display:flex;align-items:center;justify-content:center;padding:20px;}' +
    '.azc-panel{background:#1C1660;color:#fff;max-width:460px;width:100%;' +
      'border-radius:16px;padding:28px;font-family:Arial,Helvetica,sans-serif;}' +
    '.azc-panel h3{margin:0 0 6px;font-size:19px;}' +
    '.azc-panel .azc-sub{color:rgba(255,255,255,0.65);font-size:13px;margin-bottom:18px;}' +
    '.azc-row{display:flex;justify-content:space-between;align-items:flex-start;' +
      'gap:14px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.1);font-size:14px;}' +
    '.azc-row:last-of-type{border-bottom:none;}' +
    '.azc-row small{display:block;color:rgba(255,255,255,0.55);font-weight:400;' +
      'margin-top:4px;line-height:1.4;}' +
    '.azc-switch{position:relative;width:42px;height:24px;flex-shrink:0;}' +
    '.azc-switch input{opacity:0;width:0;height:0;}' +
    '.azc-slider{position:absolute;inset:0;background:rgba(255,255,255,0.2);' +
      'border-radius:999px;cursor:pointer;transition:0.15s;}' +
    '.azc-slider:before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;' +
      'background:#fff;border-radius:50%;transition:0.15s;}' +
    'input:checked + .azc-slider{background:#1FC8A9;}' +
    'input:checked + .azc-slider:before{transform:translateX(18px);}' +
    'input:disabled + .azc-slider{opacity:0.5;cursor:not-allowed;}' +
    '.azc-panel-actions{display:flex;gap:10px;margin-top:22px;}' +
    '.azc-hidden{display:none !important;}' +
    '@media (max-width:520px){.azc-banner{flex-direction:column;align-items:stretch;}' +
      '.azc-actions{justify-content:flex-end;}}';

  function injectStyle() {
    var s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  var bannerEl = null;
  var overlayEl = null;

  function buildBanner() {
    bannerEl = document.createElement('div');
    bannerEl.className = 'azc-banner';
    bannerEl.innerHTML =
      '<p>We use cookies for essential site function, analytics, and ads from ' +
      'Zawadi Media (an Auduvant Technologies product). You can accept, reject ' +
      'non-essential cookies, or manage choices anytime. ' +
      '<a href="#privacy">Learn more</a></p>' +
      '<div class="azc-actions">' +
        '<button class="azc-btn azc-manage" data-azc="manage">Manage</button>' +
        '<button class="azc-btn azc-reject" data-azc="reject">Reject Non-Essential</button>' +
        '<button class="azc-btn azc-accept" data-azc="accept">Accept All</button>' +
      '</div>';
    document.body.appendChild(bannerEl);

    bannerEl.querySelector('[data-azc="accept"]').addEventListener('click', function () {
      applyChoice({ necessary: true, analytics: true, advertising: true });
      hideBanner();
    });
    bannerEl.querySelector('[data-azc="reject"]').addEventListener('click', function () {
      applyChoice({ necessary: true, analytics: false, advertising: false });
      hideBanner();
    });
    bannerEl.querySelector('[data-azc="manage"]').addEventListener('click', openPanel);
  }

  function hideBanner() {
    if (bannerEl) bannerEl.classList.add('azc-hidden');
  }
  function showBanner() {
    if (!bannerEl) buildBanner();
    bannerEl.classList.remove('azc-hidden');
  }

  function openPanel() {
    var current = (getStoredConsent() || {}).state || DEFAULT_STATE;

    overlayEl = document.createElement('div');
    overlayEl.className = 'azc-overlay';
    overlayEl.innerHTML =
      '<div class="azc-panel">' +
        '<h3>Privacy Choices</h3>' +
        '<div class="azc-sub">Control which cookies we\'re allowed to use. Necessary cookies keep the site working and can\'t be turned off.</div>' +

        '<div class="azc-row"><div><strong>Necessary</strong>' +
          '<small>Required for basic site functionality. Always on.</small></div>' +
          '<label class="azc-switch"><input type="checkbox" checked disabled>' +
          '<span class="azc-slider"></span></label></div>' +

        '<div class="azc-row"><div><strong>Analytics</strong>' +
          '<small>Helps us understand site usage (Google Analytics).</small></div>' +
          '<label class="azc-switch"><input type="checkbox" id="azc-analytics" ' +
          (current.analytics ? 'checked' : '') + '><span class="azc-slider"></span></label></div>' +

        '<div class="azc-row"><div><strong>Advertising</strong>' +
          '<small>Used by Zawadi Media to show and measure ads across Auduvant sites.</small></div>' +
          '<label class="azc-switch"><input type="checkbox" id="azc-advertising" ' +
          (current.advertising ? 'checked' : '') + '><span class="azc-slider"></span></label></div>' +

        '<div class="azc-panel-actions">' +
          '<button class="azc-btn azc-reject" data-azc="close">Cancel</button>' +
          '<button class="azc-btn azc-accept" data-azc="save">Save Choices</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlayEl);

    overlayEl.querySelector('[data-azc="close"]').addEventListener('click', closePanel);
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) closePanel();
    });
    overlayEl.querySelector('[data-azc="save"]').addEventListener('click', function () {
      var analytics = overlayEl.querySelector('#azc-analytics').checked;
      var advertising = overlayEl.querySelector('#azc-advertising').checked;
      applyChoice({ necessary: true, analytics: analytics, advertising: advertising });
      closePanel();
      hideBanner();
    });
  }

  function closePanel() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
  }

  function applyChoice(state) {
    storeConsent(state);
    pushToGtag(state);
  }

  function init() {
    injectStyle();
    var stored = getStoredConsent();
    if (stored && stored.state) {
      // Re-apply on every page load so gtag gets the signal (Consent Mode
      // doesn't persist across page loads on its own).
      pushToGtag(stored.state);
    } else {
      // No choice yet — show banner once DOM is ready.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showBanner);
      } else {
        showBanner();
      }
    }
  }

  window.AZConsent = {
    gtagDefaults: gtagDefaults,
    open: function () {
      injectStyleOnce();
      openPanel();
    },
    getState: function () {
      var stored = getStoredConsent();
      return stored ? stored.state : DEFAULT_STATE;
    }
  };

  var styleInjected = false;
  function injectStyleOnce() {
    if (!styleInjected) { injectStyle(); styleInjected = true; }
  }

  // Run immediately so gtagDefaults is available before gtag.js loads.
  styleInjected = true;
  injectStyle();
  init();

})(window, document);
