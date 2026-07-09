/* BloodCare — GPS location for Post Request form */
(function () {
  'use strict';

  let fetchInProgress = false;
  let activeWatchId = null;
  let activeTimeoutId = null;

  function msg(key, fallback) {
    if (typeof window.t === 'function') return window.t(key);
    return fallback;
  }

  function toast(text, type) {
    if (typeof window.showToast === 'function') window.showToast(text, type || 'success');
  }

  function getSelectedDistrict() {
    const sel = document.getElementById('rLocation');
    if (sel && sel.value && sel.value.trim()) return sel.value.trim();

    const label = document.getElementById('rLocationValue');
    const text = (label && label.textContent || '').trim();
    if (text && text !== '-- Select District --') {
      return text.replace(/^📍\s*/, '').trim();
    }
    return '';
  }

  function setCoordFields(lat, lng, state) {
    const latEl = document.getElementById('rLat');
    const lngEl = document.getElementById('rLng');
    const loadingText = msg('req_gps_fetching', 'Fetching location…');

    [latEl, lngEl].forEach(function (el) {
      if (!el) return;
      el.classList.remove('has-value', 'loading', 'error');
      if (state === 'loading') el.classList.add('loading');
      if (state === 'success') el.classList.add('has-value');
      if (state === 'error') el.classList.add('error');
    });

    if (state === 'loading') {
      if (latEl) latEl.value = loadingText;
      if (lngEl) lngEl.value = loadingText;
      return;
    }

    if (lat != null && lng != null) {
      if (latEl) latEl.value = Number(lat).toFixed(6);
      if (lngEl) lngEl.value = Number(lng).toFixed(6);
    }
  }

  function setStatus(text, cls) {
    const status = document.getElementById('locationStatus');
    if (!status) return;
    status.textContent = text;
    status.className = 'location-status' + (cls ? ' ' + cls : '');
  }

  function cleanupGeo() {
    if (activeWatchId != null) {
      navigator.geolocation.clearWatch(activeWatchId);
      activeWatchId = null;
    }
    if (activeTimeoutId != null) {
      clearTimeout(activeTimeoutId);
      activeTimeoutId = null;
    }
    fetchInProgress = false;
    const btn = document.getElementById('fetchLocationBtn');
    if (btn) btn.disabled = false;
  }

  function applyCoords(lat, lng, source) {
    setCoordFields(lat, lng, 'success');
    const label = source === 'gps'
      ? '✓ GPS: ' + Number(lat).toFixed(6) + ', ' + Number(lng).toFixed(6)
      : '✓ ' + source + ': ' + Number(lat).toFixed(6) + ', ' + Number(lng).toFixed(6);
    setStatus(label, 'success');
    cleanupGeo();
    toast(msg('req_gps_success', '📍 Location saved.'), 'success');
  }

  function showGeoError(err) {
    const codes = {
      1: msg('req_gps_denied', 'Location access denied.'),
      2: msg('req_gps_unavailable', 'GPS unavailable.'),
      3: msg('req_gps_timeout', 'Location timed out.'),
    };
    const errText = codes[err && err.code] || msg('req_gps_failed', 'Could not get location.');

    setCoordFields(null, null, 'error');
    const latEl = document.getElementById('rLat');
    const lngEl = document.getElementById('rLng');
    if (latEl) latEl.value = errText;
    if (lngEl) lngEl.value = errText;
    setStatus(errText, 'error');
    cleanupGeo();
    toast(errText, 'error');
  }

  function useDistrictFallback() {
    const district = getSelectedDistrict();
    const coords = district && window.DISTRICT_COORDS && window.DISTRICT_COORDS[district];
    if (!coords) return false;
    applyCoords(coords[0], coords[1], district);
    toast(
      msg('req_gps_district_used', 'Using {district} coordinates.').replace('{district}', district),
      'info'
    );
    return true;
  }

  function requestBrowserLocation() {
    if (!navigator.geolocation) {
      if (!useDistrictFallback()) toast(msg('req_gps_unsupported', 'GPS not supported.'), 'error');
      return;
    }

    if (!window.isSecureContext) {
      if (!useDistrictFallback()) toast(msg('req_gps_secure', 'GPS needs HTTPS or localhost.'), 'error');
      return;
    }

    let settled = false;

    function finishSuccess(pos) {
      if (settled) return;
      settled = true;
      applyCoords(pos.coords.latitude, pos.coords.longitude, 'gps');
    }

    function finishError(err) {
      if (settled) return;
      settled = true;
      console.warn('Geolocation error:', err);
      if (!useDistrictFallback()) showGeoError(err);
    }

    // Method 1: watchPosition (works better on some Safari versions)
    activeWatchId = navigator.geolocation.watchPosition(
      finishSuccess,
      function () { /* wait for timeout or getCurrentPosition */ },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
    );

    // Method 2: getCurrentPosition backup
    navigator.geolocation.getCurrentPosition(finishSuccess, function () {}, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000,
    });

    // Hard timeout — always resolve
    activeTimeoutId = setTimeout(function () {
      if (settled) return;
      finishError({ code: 3, message: 'timeout' });
    }, 22000);
  }

  function fetchRequestLocation() {
    if (fetchInProgress) return;
    fetchInProgress = true;

    const btn = document.getElementById('fetchLocationBtn');
    if (btn) btn.disabled = true;

    setCoordFields(null, null, 'loading');
    setStatus(msg('req_gps_fetching', 'Fetching location…'), 'loading');

    // Show district coordinates immediately so user always sees lat/lng
    const district = getSelectedDistrict();
    const districtCoords = district && window.DISTRICT_COORDS && window.DISTRICT_COORDS[district];
    if (districtCoords) {
      setCoordFields(districtCoords[0], districtCoords[1], 'success');
      setStatus('✓ ' + district + ' — trying GPS for exact location…', 'loading');
    }

    try {
      requestBrowserLocation();
    } catch (err) {
      console.error('fetchRequestLocation:', err);
      if (districtCoords) {
        applyCoords(districtCoords[0], districtCoords[1], district);
        toast(
          msg('req_gps_district_used', 'Using {district} coordinates.').replace('{district}', district),
          'info'
        );
      } else if (!useDistrictFallback()) {
        showGeoError(err);
      }
    }
  }

  function clearRequestLocation() {
    cleanupGeo();
    const lat = document.getElementById('rLat');
    const lng = document.getElementById('rLng');
    if (lat) { lat.value = ''; lat.classList.remove('has-value', 'loading', 'error'); }
    if (lng) { lng.value = ''; lng.classList.remove('has-value', 'loading', 'error'); }
    setStatus('', '');
  }

  function initGpsButton() {
    const btn = document.getElementById('fetchLocationBtn');
    if (!btn || btn.dataset.gpsBound) return;
    btn.dataset.gpsBound = '1';
    btn.removeAttribute('onclick');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      fetchRequestLocation();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGpsButton);
  } else {
    initGpsButton();
  }

  window.fetchRequestLocation = fetchRequestLocation;
  window.clearRequestLocation = clearRequestLocation;
  window.initGpsButton = initGpsButton;
})();
