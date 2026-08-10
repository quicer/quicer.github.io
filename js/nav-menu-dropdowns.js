(function () {
  'use strict';

  function initNavMenuDropdowns() {
    var menusItems = document.querySelector('#menus .menus_items');
    if (!menusItems) return;

    var triggers = Array.from(menusItems.querySelectorAll('.menus_item[data-menu-trigger]'));
    var dropdowns = Array.from(document.querySelectorAll('.menus-dropdown-fixed[data-menu-for]'));
    if (!triggers.length || !dropdowns.length) return;

    var navGroup = document.getElementById('nav-group');
    var openTrigger = null;
    var closeTimer = null;
    var CLOSE_DELAY = 280;

    var dropdownMap = new Map();
    triggers.forEach(function (trigger) {
      var key = trigger.getAttribute('data-menu-trigger');
      var dropdown = document.querySelector('.menus-dropdown-fixed[data-menu-for="' + key + '"]');
      if (dropdown) dropdownMap.set(trigger, dropdown);
    });

    function getTriggerRect(trigger) {
      var page = trigger.querySelector('.site-page');
      return page ? page.getBoundingClientRect() : trigger.getBoundingClientRect();
    }

    function positionDropdown(trigger, dropdown) {
      if (!navGroup) return;
      var triggerRect = getTriggerRect(trigger);
      var navRect = navGroup.getBoundingClientRect();
      var ddWidth = dropdown.offsetWidth || 0;

      var left = triggerRect.left + triggerRect.width / 2 - navRect.left - ddWidth / 2;
      var maxLeft = navRect.width - ddWidth - 8;
      left = Math.max(8, Math.min(left, maxLeft));

      dropdown.style.position = 'absolute';
      dropdown.style.left = left + 'px';
      dropdown.style.top = (triggerRect.bottom + 8 - navRect.top) + 'px';
    }

    function closeDropdown(trigger) {
      if (!trigger) return;
      var dropdown = dropdownMap.get(trigger);
      if (dropdown) dropdown.classList.remove('show');
      trigger.classList.remove('menu-open');
      if (openTrigger === trigger) {
        openTrigger = null;
        menusItems.classList.remove('menu-open');
      }
    }

    function openDropdown(trigger) {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      if (openTrigger && openTrigger !== trigger) {
        closeDropdown(openTrigger);
      }

      var dropdown = dropdownMap.get(trigger);
      if (!dropdown) return;

      openTrigger = trigger;
      menusItems.classList.add('menu-open');
      trigger.classList.add('menu-open');
      dropdown.classList.add('show');
      positionDropdown(trigger, dropdown);
    }

    function scheduleClose() {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        if (openTrigger) closeDropdown(openTrigger);
      }, CLOSE_DELAY);
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('mouseenter', function () { openDropdown(trigger); });
      trigger.addEventListener('mouseleave', scheduleClose);
    });

    dropdowns.forEach(function (dropdown) {
      dropdown.addEventListener('mouseenter', function () {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      });
      dropdown.addEventListener('mouseleave', scheduleClose);
    });

    window.addEventListener('resize', function () {
      if (openTrigger) positionDropdown(openTrigger, dropdownMap.get(openTrigger));
    });

    window.addEventListener('scroll', function () {
      if (openTrigger) positionDropdown(openTrigger, dropdownMap.get(openTrigger));
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavMenuDropdowns);
  } else {
    initNavMenuDropdowns();
  }
})();
