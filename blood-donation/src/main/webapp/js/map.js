/* BloodCare — request map (Leaflet) */
(function () {
  'use strict';

  let map = null;
  let markerLayer = null;
  let mapReady = false;
  let initAttempts = 0;
  let initialFitDone = false;
  let userAdjustedView = false;

  const SL_CENTER = [7.8731, 80.7718];
  const SL_ZOOM = 7;

  function lockUserView() {
    userAdjustedView = true;
  }

  function fitMapToMarkers(bounds) {
    if (!map || !bounds.length) return;
    if (bounds.length === 1) {
      map.setView(bounds[0], 10);
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }
    initialFitDone = true;
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getCoords(req) {
    return typeof window.getRequestCoords === 'function'
      ? window.getRequestCoords(req)
      : SL_CENTER;
  }

  function levelColor(level) {
    return (window.REQUEST_LEVEL_COLORS || {})[level] || '#c0392b';
  }

  function setMapStatus(msg, isError) {
    const el = document.getElementById('mapLoading');
    if (!el) return;
    el.textContent = msg;
    el.className = 'map-loading' + (isError ? ' map-loading-error' : '');
    el.style.display = msg ? 'flex' : 'none';
  }

  function hideMapLoading() {
    setMapStatus('');
  }

  function buildPopup(req) {
    const gps = typeof window.hasGpsCoords === 'function' && window.hasGpsCoords(req);
    return `
      <div class="map-popup">
        <strong>${esc(req.hospital)}</strong>
        <div class="map-popup-row">🩸 <b>${esc(req.blood)}</b> — ${req.units || 1} unit(s)</div>
        <div class="map-popup-row">📍 ${esc(req.location)}${gps ? ' (GPS)' : ''}</div>
        <div class="map-popup-row">
          <span class="req-badge ${req.level}" style="display:inline-block;font-size:0.7rem">${(req.level || 'normal').toUpperCase()}</span>
        </div>
        <div class="map-popup-row muted">${esc(req.date || '')} ${esc(req.time || '')}</div>
      </div>`;
  }

  function addTileLayer() {
    const layers = [
      {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        opts: {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        },
      },
      {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        opts: {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        },
      },
    ];

    for (const layer of layers) {
      try {
        L.tileLayer(layer.url, layer.opts).addTo(map);
        return;
      } catch (e) {
        console.warn('Tile layer failed:', e);
      }
    }
  }

  function renderMarkers(requests, options) {
    if (!map || !markerLayer) return;

    const opts = options || {};
    const forceFit = opts.forceFit === true;
    const shouldFit = forceFit || (!userAdjustedView && !initialFitDone);

    markerLayer.clearLayers();
    const list = requests || (typeof window.getRequests === 'function' ? window.getRequests() : []);

    if (!list.length) {
      if (shouldFit) map.setView(SL_CENTER, SL_ZOOM);
      return;
    }

    const bounds = [];

    list.forEach((req, i) => {
      const [lat, lng] = getCoords(req);
      const offset = (typeof window.hasGpsCoords === 'function' && window.hasGpsCoords(req))
        ? [0, 0]
        : [(i % 3 - 1) * 0.018, (Math.floor(i / 3) % 3 - 1) * 0.018];

      const pos = [lat + offset[0], lng + offset[1]];
      bounds.push(pos);

      const marker = L.circleMarker(pos, {
        radius: req.level === 'critical' ? 11 : req.level === 'urgent' ? 9 : 7,
        fillColor: levelColor(req.level),
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      });

      marker.bindPopup(buildPopup(req));
      markerLayer.addLayer(marker);
    });

    if (shouldFit) fitMapToMarkers(bounds);
  }

  function fixMapSize() {
    if (!map) return;
    map.invalidateSize({ animate: false });
  }

  function watchMapVisibility() {
    const section = document.getElementById('requestMapSection');
    if (!section || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(fixMapSize, 50);
          setTimeout(fixMapSize, 300);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(section);
  }

  function initRequestMap() {
    if (mapReady) {
      fixMapSize();
      renderMarkers();
      return;
    }

    const el = document.getElementById('requestMap');
    if (!el) return;

    if (typeof L === 'undefined') {
      initAttempts++;
      if (initAttempts < 20) {
        setMapStatus('Loading map library…');
        setTimeout(initRequestMap, 400);
      } else {
        setMapStatus('Map library failed to load. Check your internet connection.', true);
      }
      return;
    }

    try {
      setMapStatus('Loading map…');
      mapReady = true;

      map = L.map(el, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView(SL_CENTER, SL_ZOOM);

      map.on('zoomend dragend', lockUserView);

      addTileLayer();
      markerLayer = L.layerGroup().addTo(map);

      map.whenReady(() => {
        hideMapLoading();
        fixMapSize();
        renderMarkers();
      });

      if (typeof window.subscribeRequests === 'function') {
        window.subscribeRequests(renderMarkers);
      }

      watchMapVisibility();
      window.addEventListener('resize', fixMapSize);

      setTimeout(fixMapSize, 100);
      setTimeout(fixMapSize, 500);
      setTimeout(() => renderMarkers(), 800);
    } catch (err) {
      console.error('Map init failed:', err);
      mapReady = false;
      setMapStatus('Could not load map. Please refresh the page.', true);
    }
  }

  function tryInitMap() {
    if (document.getElementById('requestMap')) initRequestMap();
  }

  window.initRequestMap = initRequestMap;
  window.renderRequestMap = renderMarkers;

  document.addEventListener('DOMContentLoaded', tryInitMap);
  window.addEventListener('load', tryInitMap);
})();
