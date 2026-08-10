/*
 * 首页「热门文章」面板
 * ------------------------------------------------------------
 * 数据源：用户自有的 Umami Worker（Cloudflare 域名）
 *   https://hot.quicer-umami.indevs.in?days=N&limit=20
 *   返回 [{ url, title, views, cover }]，已按浏览量降序。
 *
 * 功能：
 *  1) 在首页时，点击分类栏「热门」按钮切换到热门面板，隐藏默认文章列表与分页；
 *  2) 在非首页（分类/归档等）时，点击「热门」按钮跳转回首页并自动展开热门面板；
 *  3) 支持时间范围切换：当日 / 近一个月 / 近一年；
 *  4) 每条显示小封面、标题、浏览量、右侧箭头（参考 /archives/ 横向列表排版）；
 *  5) 失败时显示占位/错误提示；
 *  6) 监听 pjax:complete，首页被局部刷新后重新绑定事件。
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

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function isHomePage() {
    // 首页 #content-inner 是 layout--home；同时存在 #recent-posts 与 #hot-posts
    return !!($("#recent-posts") && $("#hot-posts") && document.querySelector(".layout--home#content-inner"));
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

  function renderList(items) {
    var list = $("#hot-posts-list");
    if (!items || items.length === 0) {
      list.innerHTML = '<div class="hot-page-state">暂无热门数据</div>';
      return;
    }
    list.innerHTML = items.map(renderItem).join("");
  }

  function setLoading() {
    $("#hot-posts-list").innerHTML = '<div class="hot-page-state"><i class="solitude fas fa-spinner fa-spin"></i> 加载中...</div>';
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
        $("#hot-posts-list").innerHTML = '<div class="hot-page-state">热门数据加载失败，请稍后再试</div>';
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
    if (!trigger) return;

    // 捕获阶段监听：PJAX 给每个 <a href> 直接绑了冒泡阶段 click，
    // 会在父级 div 的冒泡处理器之前触发并导致整页 PJAX 导航。
    // 在捕获阶段拦截可确保 PJAX 放弃导航，保留我们自己的切换/跳转逻辑。
    trigger.addEventListener("click", function (e) {
      // 非首页：让链接正常跳回首页，并通过 query 让首页自动展开热门面板
      if (!isHomePage()) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = "/?hot=1";
        return;
      }

      // 首页：阻止默认跳转，本地切换面板
      e.preventDefault();
      e.stopPropagation();
      $$(".category-bar-item").forEach(function (item) { item.classList.remove("select"); });
      trigger.classList.add("select");
      switchHotPanel(true);
    }, true);

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
      item.addEventListener("click", function () {
        if ($("#hot-posts") && !$("#hot-posts").classList.contains("hidden")) {
          trigger.classList.remove("select");
          switchHotPanel(false);
        }
      });
    });
  }

  function autoOpenFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("hot") === "1" && isHomePage()) {
        var trigger = $("#category-bar-hot");
        if (trigger) {
          $$(".category-bar-item").forEach(function (item) { item.classList.remove("select"); });
          trigger.classList.add("select");
          switchHotPanel(true);
        }
        // 替换 URL，去掉 ?hot=1，避免刷新后仍自动打开
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, "", window.location.pathname + window.location.hash);
        }
      }
    } catch (e) {}
  }

  function markHotSelected() {
    // 若面板处于打开状态，确保「热门」按钮高亮。
    // 主题在加载/pjax:complete 时调用 categoriesBarActive() 会把高亮重置回“首页”，
    // 因此需在主题刷新之后重新打高亮（见 init 中的延时重应用）。
    if (!($("#hot-posts") && !$("#hot-posts").classList.contains("hidden"))) return;
    var trigger = $("#category-bar-hot");
    if (!trigger) return;
    $$(".category-bar-item").forEach(function (item) { item.classList.remove("select"); });
    trigger.classList.add("select");
  }

  function init() {
    if (!$("#category-bar-hot")) return;
    bindEvents();
    autoOpenFromUrl();
    markHotSelected();
    // 主题 Solitude.refresh 在 DOMContentLoaded / pjax:complete 之后会重置分类栏高亮，
    // 延时重应用确保“热门”按钮在面板打开时保持高亮。
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
