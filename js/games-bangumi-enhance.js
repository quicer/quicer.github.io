/*
 * games-bangumi-enhance.js
 * ---------------------------------------------------------------
 * 为 games(/games/ · idouban/React) 与 bangumis(/bangumis/ · hexo-bilibili-bangumi/vanilla)
 * 两个页面提供一致的交互增强：
 *   1) 切换分类时的入场动画（卡片淡入上移）
 *   2) 独立的加载动画（覆盖内容区的旋转环，区别于站点全局 preloader）
 *   3) 分类下无内容时显示「这里暂时没有游戏/番剧哦」
 *   4) 当某分类仅 1 页时隐藏其分页按钮
 * 通过 MutationObserver 兼容 idouban 的 React 重渲染，并对 bangumi 插件的 onclick 做包裹兼容。
 * 纯原生 JS，无外部依赖；自守卫，重复调用安全。
 */
(function () {
  'use strict';

  function qsa(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  var SEL = {
    game: {
      root: '#idouban',
      tabs: '#idouban .idouban-tabs',
      tab: '#idouban .idouban-tab',
      itemsAll: '#idouban .idouban-item',
      pagination: '#idouban .idouban-pagination',
      pageNum: '#idouban .idouban-page-num',
      btn: '#idouban .idouban-button'
    },
    bangumi: {
      root: '.bangumi-container',
      tabs: '.bangumi-container .bangumi-tabs',
      tab: '.bangumi-container .bangumi-tab',
      itemsAll: '.bangumi-container .bangumi-item',
      pagination: '.bangumi-container .bangumi-pagination',
      pageNum: '.bangumi-container .bangumi-pagenum',
      btn: '.bangumi-container .bangumi-button'
    }
  };

  function detectType(el) {
    if (el.id === 'idouban') return 'game';
    if (el.classList && el.classList.contains('bangumi-container')) return 'bangumi';
    if (el.querySelector && el.querySelector('.bangumi-container')) return 'bangumi';
    return null;
  }

  // 只统计「当前显示的分类」下的卡片
  function getActiveItems(container, type) {
    if (type === 'game') {
      return qsa(SEL.game.itemsAll, container);
    }
    var panel = qs('.bangumi-show', container) || qs('#bangumi-item1', container);
    return panel ? qsa('.bangumi-item', panel) : [];
  }

  function setup(el) {
    if (el.dataset && el.dataset.bgmFx === '1') return;
    var type = detectType(el);
    if (!type) return;
    el.dataset.bgmFx = '1';

    var sel = SEL[type];
    var emptyText = type === 'game' ? '这里暂时没有游戏哦' : '这里暂时没有番剧哦';
    // 🎮 / 📺
    var emptyIcon = type === 'game' ? '🎮' : '📺';

    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }

    // 加载动画遮罩
    var loader = document.createElement('div');
    loader.className = 'bgm-fx-spinner-wrap';
    loader.innerHTML = '<div class="bgm-fx-spinner"></div>';
    el.appendChild(loader);

    // 空状态
    var empty = document.createElement('div');
    empty.className = 'bgm-fx-empty';
    var icon = document.createElement('span');
    icon.className = 'bgm-fx-empty-icon';
    icon.textContent = emptyIcon;
    empty.appendChild(icon);
    empty.appendChild(document.createTextNode(emptyText));
    el.appendChild(empty);

    var spinnerTimer = null;
    var applying = false;   // 自守卫：我们自己的 class/style 变更不触发 observer 死循环
    var lastSig = null;     // 当前显示分类的卡片签名，仅在结构变化时重放入场动画

    function showSpinner() { loader.classList.add('is-show'); }
    function hideSpinner() { loader.classList.remove('is-show'); }

    function replayItems() {
      var items = getActiveItems(el, type);
      items.forEach(function (node, i) {
        node.classList.remove('bgm-fx-in');
        void node.offsetWidth;                 // 强制回流以重启动画
        node.style.animationDelay = (Math.min(i, 12) * 0.04) + 's';
        node.classList.add('bgm-fx-in');
      });
    }

    function updateEmpty() {
      var tabs = qs(sel.tabs, el);
      if (!tabs) { empty.classList.remove('is-show'); return; }
      var items = getActiveItems(el, type);
      if (items.length === 0) empty.classList.add('is-show');
      else empty.classList.remove('is-show');
    }

    function updatePagination() {
      qsa(sel.pagination, el).forEach(function (p) {
        var num = qs(sel.pageNum, p);
        if (!num) return;
        var parts = (num.textContent || '').split('/');
        var total = parseInt((parts[1] || parts[0] || '1').trim(), 10);
        if (!isNaN(total) && total <= 1) p.classList.add('bgm-fx-hide-pagination');
        else p.classList.remove('bgm-fx-hide-pagination');
      });
    }

    // 当前显示分类的卡片签名（数量 + 各卡片链接），用于判断是否需要重放入场动画
    function computeSig() {
      var items = getActiveItems(el, type);
      if (!items.length) return '0';
      var sig = String(items.length);
      for (var i = 0; i < items.length; i++) {
        var a = items[i].querySelector('a');
        sig += '|' + ((a && (a.getAttribute('href') || a.textContent)) || items[i].textContent || '').slice(0, 40);
      }
      return sig;
    }

    // 统一入口：applying 自守卫阻断「自有变更→再触发 observer」死循环；
    // 仅当卡片结构变化（或 force）时才重放入场动画，避免每帧重启动画导致卡片闪烁/不显示
    function applyChanges(force) {
      if (applying) return;
      applying = true;
      try {
        var sig = computeSig();
        if (force || sig !== lastSig) {
          lastSig = sig;
          replayItems();
        }
        updateEmpty();
        updatePagination();
      } finally {
        // 当前同步任务之后、observer 回调执行期间仍视为「自有变更」而跳过；
        // 下一帧再放开，使真正的外部变更（React 重渲染 / 插件切分类）能被响应
        requestAnimationFrame(function () { applying = false; });
      }
    }

    function onSwitch() {
      showSpinner();
      if (spinnerTimer) clearTimeout(spinnerTimer);
      spinnerTimer = setTimeout(function () {
        hideSpinner();
        applyChanges(true);   // 用户主动切分类，强制重放动画
      }, 280);
    }

    function hasStructure() { return !!qs(sel.tabs, el); }

    function settle() {
      if (!hasStructure()) return false;
      applyChanges(true);     // 初次 / 异步挂载后强制重放一次
      return true;
    }

    // 绑定分类标签点击：bangumi 插件用 tab.onclick 赋值，idouban 用 React 事件
    // 这里包裹原生 onclick（若存在），并在其后触发 loading + 动画时序
    qsa(sel.tab, el).forEach(function (tab) {
      var orig = tab.onclick;
      tab.onclick = function (e) {
        var r = orig ? orig.call(this, e) : undefined;
        onSwitch();
        return r;
      };
    });
    qsa(sel.btn, el).forEach(function (btn) {
      btn.addEventListener('click', onSwitch);
    });

    // 观察重渲染：idouban(React) 切分类/分页会重建 DOM；bangumi 分页追加也会变动
    var raf = null;
    var mo = new MutationObserver(function () {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        if (hasStructure()) applyChanges(false);
      });
    });
    mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    // 初次渲染：数据可能已同步渲染，也可能异步挂载（React）
    if (!settle()) {
      var tries = 0;
      (function poll() {
        if (settle()) return;
        if (tries++ < 25) setTimeout(poll, 150);
      })();
    }
  }

  function init() {
    qsa('.bangumi-container, #idouban').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // PJAX / swup 切换后重新初始化新页面
  window.addEventListener('pjax:complete', init);
  window.addEventListener('swup:content:replace', init);
})();
