/*
 * 热门文章页 /hot/ 脚本
 * ------------------------------------------------------------
 * 数据源：用户自有的 Umami Worker（Cloudflare 域名）
 *   https://hot.quicer-umami.indevs.in?days=N&limit=20
 *   返回 [{ url, title, views, cover }]，已按浏览量降序。
 *
 * 功能：
 *  1) 在 /hot/ 页面拉取 Umami 热门数据并渲染横向列表；
 *  2) 支持时间范围切换：当日 / 近一个月 / 近一年；
 *  3) 支持客户端分页，每页 10 篇，分页按钮风格参考主页；
 *  4) 失败时显示占位/错误提示；
 *  5) 监听 pjax:complete，PJAX 进入 /hot/ 后重新初始化。
 */
(function () {
  var WORKER = "https://hot.quicer-umami.indevs.in";
  var LIMIT = 20;
  var PAGE_SIZE = 10;
  var cache = {};
  var state = {
    days: "30",
    page: 1,
    items: []
  };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function formatNumber(n) {
    if (typeof n !== "number") return n;
    if (n >= 10000) return (n / 10000).toFixed(1) + "w";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function isHotPage() {
    return document.body.getAttribute("data-type") === "hot";
  }

  function renderItem(item, index) {
    var rank = index + 1;
    var hasCover = !!item.cover;
    var thumbClass = hasCover ? "hot-page-thumb" : "hot-page-thumb is-fallback";
    var thumbInner = hasCover
      ? '<img src="' + escapeHtml(item.cover) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
      : '<span class="hot-page-thumb-fallback">' + rank + '</span>';

    return '<a class="hot-page-item" href="' + escapeHtml(item.url) + '">'
      + '<div class="' + thumbClass + '">' + thumbInner + '</div>'
      + '<div class="hot-page-item-main">'
      + '<div class="hot-page-item-title">' + escapeHtml(item.title) + '</div>'
      + '<div class="hot-page-item-meta">'
      + '<span class="hot-page-item-views"><i class="solitude fas fa-fire-flame-curved"></i> ' + formatNumber(item.views) + ' 次访问</span>'
      + '</div>'
      + '</div>'
      + '<div class="hot-page-item-arrow"><i class="solitude fas fa-chevron-right"></i></div>'
      + '</a>';
  }

  function setLoading() {
    $("#hot-posts-list").innerHTML = '<div class="hot-page-state"><i class="solitude fas fa-spinner fa-spin"></i> 加载中...</div>';
  }

  function setEmpty() {
    $("#hot-posts-list").innerHTML = '<div class="hot-page-state">暂无热门数据</div>';
  }

  function setError() {
    $("#hot-posts-list").innerHTML = '<div class="hot-page-state">热门数据加载失败，请稍后再试</div>';
  }

  function renderList() {
    var list = $("#hot-posts-list");
    var total = state.items.length;
    if (total === 0) {
      setEmpty();
      renderPagination(0, 0);
      return;
    }

    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    var start = (state.page - 1) * PAGE_SIZE;
    var pageItems = state.items.slice(start, start + PAGE_SIZE);

    list.innerHTML = pageItems.map(function (item, i) {
      return renderItem(item, start + i);
    }).join("");

    var countEl = $(".hot-posts-count");
    if (countEl) {
      countEl.textContent = "共 " + total + " 篇";
    }

    renderPagination(totalPages, state.page);
  }

  function renderPagination(totalPages, current) {
    var wrap = $("#hot-pagination .pagination");
    if (!wrap) return;
    if (totalPages <= 1) {
      wrap.innerHTML = "";
      return;
    }

    var html = "";

    // 上一页
    if (current > 1) {
      html += '<a class="extend prev" data-page="' + (current - 1) + '">'
        + '<i class="solitude fas fa-chevron-left"></i>'
        + '<div class="pagination_tips_prev">' + _prevText() + '</div>'
        + '</a>';
    }

    // 页码：参考 Hexo paginator 风格，简化为连续页码（totalPages 不大，无需折叠）
    for (var i = 1; i <= totalPages; i++) {
      if (i === current) {
        html += '<span class="page-number current">' + i + '</span>';
      } else {
        html += '<a class="page-number" data-page="' + i + '">' + i + '</a>';
      }
    }

    // 下一页
    if (current < totalPages) {
      html += '<a class="extend next" data-page="' + (current + 1) + '">'
        + '<div class="pagination_tips_next">' + _nextText() + '</div>'
        + '<i class="solitude fas fa-chevron-right"></i>'
        + '</a>';
    }

    wrap.innerHTML = html;

    // 绑定分页点击
    $$("#hot-pagination .pagination a[data-page]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var page = parseInt(el.getAttribute("data-page"), 10);
        if (!isNaN(page) && page !== state.page) {
          state.page = page;
          renderList();
          // 平滑滚动到列表顶部
          var header = $(".hot-posts-header");
          if (header && header.scrollIntoView) header.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  // 简单的“上一页/下一页”文案，与主题 _p('pagination.prev') 保持一致（若全局有翻译函数）
  function _prevText() {
    return (typeof _p === "function" && _p("pagination.prev")) || "上一页";
  }
  function _nextText() {
    return (typeof _p === "function" && _p("pagination.next")) || "下一页";
  }

  function loadHot(days, force) {
    var key = "d" + days;
    if (!force && cache[key]) {
      state.items = cache[key];
      state.page = 1;
      renderList();
      return;
    }
    setLoading();
    fetch(WORKER + "?days=" + days + "&limit=" + LIMIT, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        cache[key] = data || [];
        state.items = cache[key];
        state.page = 1;
        renderList();
      })
      .catch(function (err) {
        console.warn("[home-hot] 加载失败:", err);
        setError();
        renderPagination(0, 0);
      });
  }

  function bindEvents() {
    // 时间范围切换
    $$(".hot-posts-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        $$(".hot-posts-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        state.days = tab.getAttribute("data-days");
        loadHot(state.days, true);
      });
    });
  }

  function markHotSelected() {
    // 主题 Solitude.refresh 在 pjax:complete / 加载时会调用 categoriesBarActive()，
    // 它按 pathname 把分类栏高亮重置，但识别不了 /hot/ 对应的 #category-bar-hot。
    // 因此在 /hot/ 页面强制把高亮留给热门按钮。
    if (!isHotPage()) return;
    var trigger = $("#category-bar-hot");
    if (!trigger) return;
    $$(".category-bar-item").forEach(function (item) { item.classList.remove("select"); });
    trigger.classList.add("select");
  }

  function init() {
    if (!isHotPage()) return;
    bindEvents();
    // 默认激活 tab 为 30 天
    var activeTab = $(".hot-posts-tab.active");
    state.days = activeTab ? activeTab.getAttribute("data-days") : "30";
    state.page = 1;
    loadHot(state.days);
    markHotSelected();
    // 主题刷新后可能重置高亮，延时再应用一次
    setTimeout(markHotSelected, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  if (!window.__homeHotPjaxBound) {
    window.__homeHotPjaxBound = true;
    document.addEventListener("pjax:complete", function () {
      setTimeout(init, 200);
    });
  }
})();
