/*
 * 热门文章页 /hot/ 脚本
 * ------------------------------------------------------------
 * 排版复刻 /archives/：使用 .archive-page-item / .archive-page-number /
 * .archive-page-extend 等类名，仅 meta 文字由"日期"改为"浏览量"。
 * 数据源：用户自有的 Umami Worker（Cloudflare 域名）
 *   https://hot.quicer-umami.indevs.in?days=N&limit=20
 *   返回 [{ url, title, views, cover }]，已按浏览量降序。
 */
(function () {
  var shell = null;
  var list = null;
  var pagination = null;
  var paginationSection = null;
  var countEl = null;
  var cache = {};
  var state = { days: '30', page: 1, items: [] };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function formatNumber(n) {
    if (typeof n !== 'number') return n;
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isHotPage() {
    return document.body.getAttribute('data-type') === 'hot';
  }

  function getShell() {
    if (!shell) shell = document.getElementById('hot-page');
    return shell;
  }

  function bindRefs() {
    var s = getShell();
    if (!s) return;
    list = s.querySelector('#hot-posts-list');
    pagination = s.querySelector('#hot-pagination .pagination');
    paginationSection = s.querySelector('.archive-page-section-pagination');
    countEl = s.querySelector('.hot-posts-count');
  }

  function renderItem(item, index) {
    var rank = index + 1;
    var hasCover = !!item.cover;
    var thumbClass = hasCover ? 'archive-page-thumb' : 'archive-page-thumb is-fallback';
    var thumbInner = hasCover
      ? '<img src="' + escapeHtml(item.cover) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
      : '';
    var fallbackInner = hasCover ? '' : '<span class="archive-page-thumb-fallback">' + rank + '</span>';

    return '<a class="archive-page-item" href="' + escapeHtml(item.url) + '" title="' + escapeHtml(item.title) + '">'
      + '<div class="' + thumbClass + '">' + thumbInner + fallbackInner + '</div>'
      + '<div class="archive-page-item-main">'
      + '<div class="archive-page-item-title">' + escapeHtml(item.title) + '</div>'
      + '<div class="archive-page-item-meta">'
      + '<span class="archive-page-item-category"><i class="solitude fas fa-fire-flame-curved"></i> ' + formatNumber(item.views) + ' 次访问</span>'
      + '</div>'
      + '</div>'
      + '<div class="archive-page-item-arrow" aria-hidden="true"><i class="solitude fas fa-chevron-right"></i></div>'
      + '</a>';
  }

  function setLoading() {
    if (!list) return;
    list.innerHTML =
      '<div class="hot-page-state hot-page-skeleton" aria-busy="true" role="status">' +
      [1, 2, 3, 4, 5, 6].map(function () {
        return '<div class="archive-page-item hot-page-skeleton-row">' +
          '<div class="hot-page-skeleton-thumb"></div>' +
          '<div class="hot-page-skeleton-body">' +
          '<div class="hot-page-skeleton-line title"></div>' +
          '<div class="hot-page-skeleton-line meta"></div>' +
          '</div>' +
          '</div>';
      }).join('') +
      '</div>';
    if (paginationSection) paginationSection.hidden = true;
  }

  function setState(message) {
    if (!list) return;
    list.innerHTML = '<div class="archive-page-state">' + escapeHtml(message) + '</div>';
    if (paginationSection) paginationSection.hidden = true;
  }

  function renderList() {
    bindRefs();
    if (!list) return;
    var total = state.items.length;
    if (total === 0) {
      setState('暂无热门数据');
      renderPagination(0, 0);
      return;
    }

    var pageSize = Math.max(Number(getShell().dataset.pageSize) || 10, 1);
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    var start = (state.page - 1) * pageSize;
    var pageItems = state.items.slice(start, start + pageSize);

    list.innerHTML = pageItems.map(function (item, i) {
      return renderItem(item, start + i);
    }).join('');

    if (countEl) countEl.textContent = '共 ' + total + ' 篇';
    renderPagination(totalPages, state.page);
  }

  function renderPagination(totalPages, current) {
    bindRefs();
    if (!pagination) return;
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      if (paginationSection) paginationSection.hidden = true;
      return;
    }
    if (paginationSection) paginationSection.hidden = false;

    var html = '';

    // 上页
    html += '<button class="archive-page-extend prev" type="button" data-page="' + (current - 1) + '" aria-label="上页"' + (current === 1 ? ' disabled' : '') + '>';
    html += '<i class="solitude fas fa-chevron-left"></i><span>上页</span></button>';

    // 页码
    getPageRange(totalPages, current).forEach(function (p) {
      if (p === 'space') {
        html += '<span class="archive-page-space">...</span>';
        return;
      }
      var isCurrent = p === current;
      html += '<button class="archive-page-number' + (isCurrent ? ' is-current' : '') + '" type="button" data-page="' + p + '"' + (isCurrent ? ' aria-current="page"' : '') + ' aria-label="第 ' + p + ' 页">' + p + '</button>';
    });

    // 下页
    html += '<button class="archive-page-extend next" type="button" data-page="' + (current + 1) + '" aria-label="下页"' + (current === totalPages ? ' disabled' : '') + '>';
    html += '<span>下页</span><i class="solitude fas fa-chevron-right"></i></button>';

    pagination.innerHTML = html;
  }

  function getPageRange(totalPages, current) {
    if (totalPages <= 7) return Array.from({ length: totalPages }, function (_, i) { return i + 1; });
    if (current <= 4) return [1, 2, 3, 4, 5, 'space', totalPages];
    if (current >= totalPages - 3) return [1, 'space', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, 'space', current - 1, current, current + 1, 'space', totalPages];
  }

  function updateActiveTab() {
    var s = getShell();
    if (!s) return;
    s.querySelectorAll('.archive-year-button').forEach(function (btn) {
      var active = btn.dataset.days === state.days;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function loadHot(days, force) {
    var key = 'd' + days;
    if (!force && cache[key]) {
      state.items = cache[key];
      state.page = 1;
      updateActiveTab();
      renderList();
      return;
    }
    bindRefs();
    setLoading();
    var worker = (getShell().dataset.worker || 'https://hot.quicer-umami.indevs.in');
    var limit = Math.max(Number(getShell().dataset.limit) || 20, 1);
    fetch(worker + '?days=' + days + '&limit=' + limit, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        cache[key] = data || [];
        state.items = cache[key];
        state.page = 1;
        updateActiveTab();
        renderList();
      })
      .catch(function (err) {
        console.warn('[home-hot] 加载失败:', err);
        setState('热门数据加载失败，请稍后再试');
        renderPagination(0, 0);
      });
  }

  function bindEvents() {
    var s = getShell();
    if (!s) return;

    s.addEventListener('click', function (e) {
      var tab = e.target.closest('.archive-year-button');
      if (tab) {
        state.days = tab.dataset.days;
        loadHot(state.days, true);
        return;
      }

      var pageBtn = e.target.closest('[data-page]');
      if (!pageBtn || pageBtn.disabled) return;
      var page = Number(pageBtn.dataset.page);
      if (isNaN(page) || page === state.page) return;
      state.page = page;
      renderList();
      if (s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function markHotSelected() {
    if (!isHotPage()) return;
    var trigger = document.getElementById('category-bar-hot');
    if (!trigger) return;
    $$('.category-bar-item').forEach(function (item) { item.classList.remove('select'); });
    trigger.classList.add('select');
  }

  function init() {
    if (!isHotPage()) return;
    shell = document.getElementById('hot-page');
    if (!shell) return;
    bindRefs();
    bindEvents();

    var activeTab = shell.querySelector('.archive-year-button.is-active');
    state.days = activeTab ? activeTab.dataset.days : '30';
    state.page = 1;
    loadHot(state.days);
    markHotSelected();
    setTimeout(markHotSelected, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (!window.__homeHotPjaxBound) {
    window.__homeHotPjaxBound = true;
    document.addEventListener('pjax:complete', function () {
      shell = null;
      list = null;
      pagination = null;
      paginationSection = null;
      countEl = null;
      setTimeout(init, 200);
    });
  }
})();
