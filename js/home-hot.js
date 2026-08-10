/*
 * 首页「热门文章」面板
 * ------------------------------------------------------------
 * 数据源：用户自有的 Umami Worker（Cloudflare 域名）
 *   https://hot.quicer-umami.indevs.in?days=N&limit=20
 *   返回 [{ url, title, views, cover }]，已按浏览量降序。
 *
 * 功能：
 *  1) 点击分类栏「热门」按钮，切换到热门面板，隐藏默认文章列表与分页；
 *  2) 支持时间范围切换：当日 / 近一个月 / 近一年；
 *  3) 每条显示封面、标题、分类占位、浏览量；
 *  4) 失败时显示占位/错误提示；
 *  5) 监听 pjax:complete，首页被局部刷新后重新绑定事件。
 */
(function () {
  var WORKER = "https://hot.quicer-umami.indevs.in";
  var LIMIT = 20;
  var cache = {};

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function formatNumber(n) {
    if (typeof n !== "number") return n;
    if (n >= 10000) return (n / 10000).toFixed(1) + "w";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getCoverStyle(item) {
    if (item.cover) return 'style="background-image:url(' + escapeHtml(item.cover) + ')"';
    return '';
  }

  function renderItem(item, index) {
    var rank = index + 1;
    var coverHtml = item.cover
      ? '<a class="post_cover" href="' + escapeHtml(item.url) + '"><img class="post_bg" src="' + escapeHtml(item.cover) + '" alt="' + escapeHtml(item.title) + '" loading="lazy"></a>'
      : '<a class="post_cover hot-cover-placeholder" href="' + escapeHtml(item.url) + '"><span class="hot-rank-number">' + rank + '</span></a>';

    return '<div class="recent-post-item hot-post-item" data-solitude-action="navigateTo" data-solitude-url="' + escapeHtml(item.url) + '">'
      + coverHtml
      + '<div class="recent-post-info">'
      + '<div class="recent-post-info-top">'
      + '<div class="article-meta-wrap">'
      + '<span class="article-meta hot-post-views">'
      + '<i class="solitude fas fa-fire-flame-curved"></i>'
      + '<span>' + formatNumber(item.views) + ' 次访问</span>'
      + '</span>'
      + '</div>'
      + '<a class="article-title" href="' + escapeHtml(item.url) + '" title="' + escapeHtml(item.title) + '">' + escapeHtml(item.title) + '</a>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function renderList(items) {
    var list = $("#hot-posts-list");
    if (!items || items.length === 0) {
      list.innerHTML = '<div class="hot-posts-empty">暂无热门数据</div>';
      return;
    }
    list.innerHTML = items.map(renderItem).join("");
  }

  function setLoading() {
    $("#hot-posts-list").innerHTML = '<div class="hot-posts-loading"><i class="solitude fas fa-spinner fa-spin"></i><span>加载中...</span></div>';
  }

  function loadHot(days, force) {
    var key = "d" + days;
    if (!force && cache[key]) {
      renderList(cache[key]);
      return;
    }
    setLoading();
    fetch(WORKER + "?days=" + days + "&limit=" + LIMIT, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        cache[key] = data;
        renderList(data);
      })
      .catch(function (err) {
        console.warn("[home-hot] 加载失败:", err);
        $("#hot-posts-list").innerHTML = '<div class="hot-posts-empty">热门数据加载失败，请稍后再试</div>';
      });
  }

  function switchHotPanel(show) {
    var recent = $("#recent-posts");
    var hot = $("#hot-posts");
    var pagination = $("#pagination, .pagination");
    if (!recent || !hot) return;

    if (show) {
      recent.classList.add("hidden");
      hot.classList.remove("hidden");
      if (pagination) pagination.classList.add("hidden");
      var activeTab = $(".hot-posts-tab.active");
      var days = activeTab ? activeTab.getAttribute("data-days") : "30";
      loadHot(days);
    } else {
      recent.classList.remove("hidden");
      hot.classList.add("hidden");
      if (pagination) pagination.classList.remove("hidden");
    }
  }

  function bindEvents() {
    var trigger = $("#category-bar-hot");
    var recent = $("#recent-posts");
    if (!trigger || !recent) return;

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      // 切换选中态
      $$(".category-bar-item").forEach(function (item) { item.classList.remove("select"); });
      trigger.classList.add("select");
      switchHotPanel(true);
    });

    // 时间范围切换
    $$(".hot-posts-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        $$(".hot-posts-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        loadHot(tab.getAttribute("data-days"), true);
      });
    });

    // 点击其它分类/首页/归档时退出热门面板
    $$(".category-bar-item").forEach(function (item) {
      if (item.id === "category-bar-hot") return;
      var link = item.querySelector("a");
      if (!link) return;
      item.addEventListener("click", function () {
        // 仅当当前是热门态时才处理（避免普通导航多做事）
        if ($("#hot-posts") && !$("#hot-posts").classList.contains("hidden")) {
          trigger.classList.remove("select");
          switchHotPanel(false);
        }
      });
    });
  }

  function init() {
    if (!$("#category-bar-hot")) return;
    bindEvents();
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
