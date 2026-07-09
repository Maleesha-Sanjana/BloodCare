/* BloodCare custom dropdowns — standalone, no dependencies */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function setCheckmarks(container, selected) {
    container.querySelectorAll('.cs-option').forEach(function (o) {
      o.classList.remove('cs-selected');
      var check = o.querySelector('.cs-check');
      if (check) check.textContent = '';
    });
    if (selected) {
      selected.classList.add('cs-selected');
      var c = selected.querySelector('.cs-check');
      if (c) c.textContent = '✓';
    }
  }

  function closeAll() {
    document.querySelectorAll('.custom-select-wrap.open').forEach(function (w) {
      w.classList.remove('open');
    });
  }

  function toggleWrap(wrap) {
    if (!wrap) return;
    var isOpen = wrap.classList.contains('open');
    closeAll();
    if (!isOpen) wrap.classList.add('open');
  }

  function optionLabel(option) {
    var badge = option.querySelector('.cs-badge');
    if (badge) return badge.textContent.trim();
    return option.textContent.replace(/✓/g, '').trim();
  }

  function pickBlood(el, value, label) {
    $('sBlood').value = value;
    $('bloodValue').textContent = label;
    var wrap = $('bloodWrap');
    wrap.classList.toggle('has-value', value !== '');
    setCheckmarks($('bloodDropdown'), el);
    wrap.classList.remove('open');
  }

  function pickLocation(el, value, label) {
    $('sLocation').value = value;
    $('locationValue').textContent = label;
    var wrap = $('locationWrap');
    wrap.classList.toggle('has-value', value !== '');
    setCheckmarks($('locationOptionsList'), el);
    wrap.classList.remove('open');
    var search = document.querySelector('#locationDropdown .cs-search');
    if (search) { search.value = ''; filterLocationOptions(''); }
  }

  function pickReqBlood(el, value, label) {
    $('rBlood').value = value;
    $('rBloodValue').textContent = label;
    var wrap = $('rBloodWrap');
    wrap.classList.toggle('has-value', value !== '');
    setCheckmarks($('rBloodDropdown'), el);
    wrap.classList.remove('open');
  }

  function pickReqLocation(el, value) {
    $('rLocation').value = value;
    $('rLocationValue').textContent = value;
    var wrap = $('rLocationWrap');
    wrap.classList.toggle('has-value', value !== '');
    setCheckmarks($('rLocationOptionsList'), el);
    wrap.classList.remove('open');
    var search = document.querySelector('#rLocationDropdown .cs-search');
    if (search) { search.value = ''; filterReqLocationOptions(''); }
  }

  function pickReqLevel(el, value, label) {
    $('rLevel').value = value;
    $('rLevelValue').textContent = label;
    var wrap = $('rLevelWrap');
    wrap.classList.remove('has-value', 'level-critical', 'level-urgent', 'level-normal');
    if (value) wrap.classList.add('has-value', 'level-' + value);
    setCheckmarks($('rLevelDropdown'), el);
    wrap.classList.remove('open');
  }

  function filterOptions(listId, query) {
    var q = query.toLowerCase();
    document.querySelectorAll('#' + listId + ' .cs-option').forEach(function (o) {
      var text = o.textContent.toLowerCase();
      o.classList.toggle('cs-hidden', q !== '' && text.indexOf(q) === -1);
    });
  }

  function filterLocationOptions(query) { filterOptions('locationOptionsList', query); }
  function filterReqLocationOptions(query) { filterOptions('rLocationOptionsList', query); }

  function onOptionClick(option) {
    var wrap = option.closest('.custom-select-wrap');
    if (!wrap) return;
    var value = option.getAttribute('data-value') || '';

    switch (wrap.id) {
      case 'bloodWrap':
        pickBlood(option, value, value ? optionLabel(option) : 'All Groups');
        break;
      case 'locationWrap':
        pickLocation(option, value, value || 'All Districts');
        break;
      case 'rBloodWrap':
        pickReqBlood(option, value, optionLabel(option));
        break;
      case 'rLocationWrap':
        pickReqLocation(option, value);
        break;
      case 'rLevelWrap':
        var labels = { critical: '🔴 Critical', urgent: '🟠 Urgent', normal: '🟢 Normal' };
        pickReqLevel(option, value, labels[value] || value);
        break;
    }
  }

  function resetReqDropdowns() {
    if ($('rBloodValue')) $('rBloodValue').textContent = '-- Select --';
    if ($('rBloodWrap')) $('rBloodWrap').classList.remove('has-value');
    if ($('rBloodDropdown')) setCheckmarks($('rBloodDropdown'), null);
    if ($('rLocationValue')) $('rLocationValue').textContent = '-- Select District --';
    if ($('rLocationWrap')) $('rLocationWrap').classList.remove('has-value');
    if ($('rLocationOptionsList')) setCheckmarks($('rLocationOptionsList'), null);
    if ($('rLevelValue')) $('rLevelValue').textContent = '-- Select --';
    if ($('rLevelWrap')) $('rLevelWrap').classList.remove('has-value', 'level-critical', 'level-urgent', 'level-normal');
    if ($('rLevelDropdown')) setCheckmarks($('rLevelDropdown'), null);
  }

  function init() {
    document.querySelectorAll('.custom-select-trigger').forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleWrap(trigger.closest('.custom-select-wrap'));
      });
    });

    document.querySelectorAll('.custom-select-wrap .cs-option').forEach(function (option) {
      option.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        onOptionClick(option);
      });
    });

    var locSearch = document.querySelector('#locationDropdown .cs-search');
    if (locSearch) locSearch.addEventListener('input', function () { filterLocationOptions(locSearch.value); });

    var reqLocSearch = document.querySelector('#rLocationDropdown .cs-search');
    if (reqLocSearch) reqLocSearch.addEventListener('input', function () { filterReqLocationOptions(reqLocSearch.value); });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.custom-select-wrap')) closeAll();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.resetReqDropdowns = resetReqDropdowns;
  window.filterLocationOptions = filterLocationOptions;
  window.filterReqLocationOptions = filterReqLocationOptions;
})();
