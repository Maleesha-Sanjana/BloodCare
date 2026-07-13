/* BloodCare — notification bell & panel (standalone, works immediately) */
(function () {
  'use strict';

  let panelOpen = false;
  let currentFilter = 'all';
  let initialized = false;

  const TYPE_KEYS = {
    emergency: 'notif_emergency',
    reminder:  'notif_reminder',
    hospital:  'notif_hospital',
  };

  function $(id) { return document.getElementById(id); }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function t(key) {
    return typeof window.t === 'function' ? window.t(key) : key;
  }

  function getList() {
    return typeof window.getNotifications === 'function' ? window.getNotifications() : [];
  }

  function updateBadge() {
    const badge = $('navNotifBadge');
    if (!badge) return;
    const unread = getList().filter(n => !n.read).length;
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function showLoading() {
    const list = $('notifList');
    if (!list) return;
    list.innerHTML = `
      <div class="empty-state nav-notif-empty">
        <div class="empty-icon">⏳</div>
        <p>Loading notifications…</p>
      </div>`;
  }

  function renderList() {
    const list = $('notifList');
    if (!list) return;

    updateBadge();

    const all = getList();
    const filtered = currentFilter === 'all' ? all : all.filter(n => n.type === currentFilter);

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state nav-notif-empty">
          <div class="empty-icon">🔔</div>
          <p>${t('no_notif')}</p>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(n => {
      const typeLabel = t(TYPE_KEYS[n.type] || 'notif_all');
      return `
        <div class="notif-item ${n.type} ${n.read ? '' : 'unread'}">
          <span class="notif-icon">${n.icon || '🔔'}</span>
          <div class="notif-body">
            <div class="notif-item-top">
              <span class="notif-type-badge ${n.type}">${typeLabel}</span>
              ${!n.read ? '<span class="notif-unread-dot"></span>' : ''}
            </div>
            <div class="notif-title">${esc(n.title)}</div>
            <div class="notif-msg">${esc(n.msg)}</div>
            <div class="notif-time">🕐 ${esc(n.time || '—')}</div>
          </div>
          <button type="button" class="notif-dismiss" data-id="${esc(n.id)}" title="Dismiss">✕</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.notif-dismiss').forEach(btn => {
      btn.addEventListener('click', () => dismissNotif(btn.dataset.id));
    });
  }

  async function loadData() {
    try {
      if (typeof window.reloadNotifications === 'function') {
        await window.reloadNotifications();
      }
    } catch (err) {
      console.warn('Notifications load:', err);
    }
    renderList();
  }

  function openPanel() {
    const overlay = $('notifOverlay');
    if (!overlay) return;
    panelOpen = true;
    overlay.classList.add('open');
    $('navNotifBtn')?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('notif-open');
    showLoading();
    loadData();
  }

  function closePanel() {
    const overlay = $('notifOverlay');
    panelOpen = false;
    overlay?.classList.remove('open');
    $('navNotifBtn')?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('notif-open');
  }

  function togglePanel() {
    panelOpen ? closePanel() : openPanel();
  }

  function filterNotif(type, btn) {
    currentFilter = type;
    document.querySelectorAll('.notif-controls .btn-outline').forEach(b => {
      b.classList.toggle('active', b === btn);
    });
    renderList();
  }

  async function dismissNotif(id) {
    if (!id || typeof window.deleteNotification !== 'function') return;
    try {
      await window.deleteNotification(id);
      renderList();
    } catch (err) {
      console.error('dismissNotif:', err);
    }
  }

  async function clearAll() {
    if (typeof window.clearAllNotifications !== 'function') return;
    try {
      await window.clearAllNotifications();
      if (typeof window.showToast === 'function') window.showToast(t('toast_cleared'), 'info');
      renderList();
    } catch (err) {
      console.error('clearNotifications:', err);
    }
  }

  function bindControls() {
    $('navNotifBtn')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    });

    $('notifOverlay')?.addEventListener('click', e => {
      if (e.target === $('notifOverlay')) closePanel();
    });

    $('notifCloseBtn')?.addEventListener('click', closePanel);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panelOpen) closePanel();
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    bindControls();
    renderList();
    updateBadge();

    if (typeof window.subscribeNotifications === 'function') {
      window.subscribeNotifications(() => {
        if (panelOpen) renderList();
        updateBadge();
      });
    }
  }

  window.toggleNotifPanel = togglePanel;
  window.closeNotifPanel = closePanel;
  window.filterNotif = filterNotif;
  window.renderNotifications = renderList;
  window.updateNotifBadge = updateBadge;
  window.dismissNotif = dismissNotif;
  window.clearNotifications = clearAll;
  window.initNotificationUI = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
