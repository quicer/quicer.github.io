// ============================================================
// Liquid Glass — SVG displacement filter (edge-refraction variant)
// Based on https://github.com/shuding/liquid-glass by Shu Ding
// Adapted for Solitude / Aether Hexo theme
//
// 原理：用 Canvas 基于「贴合元素边框」的圆角矩形 SDF 生成位移贴图，
// 通过 SVG feDisplacementMap 让元素后方内容产生透镜折射。
// 关键差异（相对 shuding 原版的小中心透镜）：
//   位移只集中在元素「边框附近的薄带」，内部(dist < -band)保持 0 位移，
//   即 —— 边缘折射，中间清晰无折射。
// 升级 --glass-blur 变量为 url(#liquid-glass) + blur + saturate 组合。
// 若 JS 未加载或浏览器不支持，CSS 变量回退到 blur+saturate（普通毛玻璃）。
// ============================================================

(function () {
  'use strict';

  var FILTER_ID = 'liquid-glass';
  var SVG_ID = 'lg-svg-defs';
  var MAP_SIZE = 256;
  // 边框折射强度：位移贴图中边框带的最大位移（objectBoundingBox 单位 = 元素比例）
  var SCALE = 0.12;
  // 折射环贴合元素边框的圆角半径（归一化，相对元素半边 0.5）
  var CORNER = 0.08;
  // 折射环厚度：SDF 中 dist ∈ [-band, 0] 的薄带产生折射，内部保持清晰
  var BAND = 0.05;

  // ---- 数学工具 ----
  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function vecLen(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  // 圆角矩形有向距离场（Signed Distance Field）
  // 返回值：负数=矩形内部，正数=矩形外部
  function roundedRectSDF(x, y, w, h, r) {
    var qx = Math.abs(x) - w + r;
    var qy = Math.abs(y) - h + r;
    return Math.min(Math.max(qx, qy), 0) + vecLen(Math.max(qx, 0), Math.max(qy, 0)) - r;
  }

  // ---- 生成位移贴图 ----
  // 在 Canvas 上逐像素计算 SDF 位移，编码到 R/G 通道（128=无位移）
  // 几何参数完全照搬 shuding 原版：(0.3, 0.2, 0.6)
  function generateDisplacementMap() {
    var w = MAP_SIZE;
    var h = MAP_SIZE;
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    var data = new Uint8ClampedArray(w * h * 4);
    var raw = new Float32Array(w * h * 2);
    var maxScale = 0;

    for (var p = 0; p < w * h; p++) {
      var px = p % w;
      var py = (p - px) / w;
      // 归一化坐标，以中心为原点，范围约 [-0.5, 0.5]
      var ix = px / w - 0.5;
      var iy = py / h - 0.5;

      // 贴合元素边框的圆角矩形 SDF（边框正好落在元素边缘）
      var halfW = 0.5 - CORNER;
      var halfH = 0.5 - CORNER;
      var dist = roundedRectSDF(ix, iy, halfW, halfH, CORNER);

      // 边缘折射：内部(dist < -BAND)位移=0 → 清晰无折射；
      // 边框薄带(dist ≈ 0)位移最大 → 折射；外部被元素圆角裁剪。
      // smoothStep(0, -BAND, dist)：dist≤-BAND→1(无位移)，dist≥0→0(最大位移)
      var disp = smoothStep(0, -BAND, dist);
      var scaled = smoothStep(0, 1, disp);

      // 计算位移后的 UV 坐标（内部 scaled=1 → 无偏移；边框 scaled=0 → 最大偏移）
      var newU = ix * scaled + 0.5;
      var newV = iy * scaled + 0.5;
      var dx = newU * w - px;
      var dy = newV * h - py;

      if (Math.abs(dx) > maxScale) maxScale = Math.abs(dx);
      if (Math.abs(dy) > maxScale) maxScale = Math.abs(dy);
      raw[p * 2] = dx;
      raw[p * 2 + 1] = dy;
    }

    // 归一化到 0-255（128 = 无位移）
    maxScale = Math.max(maxScale, 1) * 0.5;
    for (var j = 0; j < data.length; j += 4) {
      var k = (j / 4) * 2;
      data[j] = Math.round((raw[k] / maxScale + 0.5) * 255);
      data[j + 1] = Math.round((raw[k + 1] / maxScale + 0.5) * 255);
      data[j + 2] = 0;
      data[j + 3] = 255;
    }

    ctx.putImageData(new ImageData(data, w, h), 0, 0);
    return { url: canvas.toDataURL(), maxScale: maxScale };
  }

  // ---- 注入 SVG 滤镜到 DOM ----
  function injectSVGFilter() {
    if (document.getElementById(SVG_ID)) {
      activateFilter();
      return;
    }

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.id = SVG_ID;
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';

    var result = generateDisplacementMap();

    var filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', FILTER_ID);
    // objectBoundingBox 模式：filter 区域随元素自动缩放，避免 resize 时重建
    filter.setAttribute('filterUnits', 'objectBoundingBox');
    filter.setAttribute('primitiveUnits', 'objectBoundingBox');
    filter.setAttribute('colorInterpolationFilters', 'sRGB');
    filter.setAttribute('x', '0%');
    filter.setAttribute('y', '0%');
    filter.setAttribute('width', '100%');
    filter.setAttribute('height', '100%');

    // feImage：引用 SDF 位移贴图，拉伸填充整个滤镜区域
    var feImage = document.createElementNS(svgNS, 'feImage');
    feImage.setAttribute('id', 'lg-map');
    feImage.setAttribute('x', '0%');
    feImage.setAttribute('y', '0%');
    feImage.setAttribute('width', '100%');
    feImage.setAttribute('height', '100%');
    feImage.setAttribute('preserveAspectRatio', 'none');
    feImage.setAttribute('result', 'map');
    feImage.setAttribute('href', result.url);
    feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', result.url);

    // feDisplacementMap：用位移贴图扭曲元素后方的背景内容
    // SourceGraphic 在 backdrop-filter 上下文中是元素后方的图像
    // scale 在 objectBoundingBox 模式下是元素短边的比例
    var feDisp = document.createElementNS(svgNS, 'feDisplacementMap');
    feDisp.setAttribute('in', 'SourceGraphic');
    feDisp.setAttribute('in2', 'map');
    feDisp.setAttribute('xChannelSelector', 'R');
    feDisp.setAttribute('yChannelSelector', 'G');
    feDisp.setAttribute('scale', SCALE.toString());

    filter.appendChild(feImage);
    filter.appendChild(feDisp);
    svg.appendChild(filter);
    document.body.appendChild(svg);

    activateFilter();

    // 调试日志：用户可在控制台确认已加载
    if (window.console && console.log) {
      console.log('[liquid-glass] filter injected, maxScale=' + result.maxScale.toFixed(2) + ', scale=' + SCALE);
    }
  }

  // ---- 升级 CSS 变量 ----
  // 把 --glass-blur 从普通 blur+saturate 升级为带 SVG 位移滤镜的版本
  // 精简滤镜链：去掉 contrast/brightness（逐像素开销大、视觉增益小）
  // 只保留 displacement + blur + saturate 三个，性能友好
  function activateFilter() {
    var backdrop = 'url(#' + FILTER_ID + ') blur(6px) saturate(1.5)';
    document.documentElement.style.setProperty('--glass-blur', backdrop);
  }

  // ---- 初始化 ----
  function init() {
    requestAnimationFrame(injectSVGFilter);
    initMenuBackdropFix();
    initNavDropdowns();
  }

  // ---- 中间 nav 下拉菜单 ----
  // 关键动作：把 #menus-dropdowns 提升为 <body> 的直属子节点。
  // 它在模板里位于 #menus 内，而 #menus 有 transform: translateZ(0)，
  // .menus_items 有 backdrop-filter —— 两者都会创建 backdrop root 并劫持
  // 后代 fixed 定位的参考系，导致下拉的 backdrop-filter 失效、定位错乱。
  // 提到 body 后：fixed 参考真实 viewport，backdrop-filter 直接模糊真实页面背景。
  // 对应 CSS 写在 header.styl 顶层（#menus-dropdowns，不带 #nav 前缀）。
  function initNavDropdowns() {
    var menus = document.getElementById('menus');
    if (!menus) return;

    // 优先取模板里新渲染的那个；PJAX 切页后 body 下可能残留上一份，先清掉避免重复。
    var dropdowns = menus.querySelector('#menus-dropdowns');
    if (dropdowns) {
      var stale = document.querySelectorAll('body > #menus-dropdowns');
      for (var s = 0; s < stale.length; s++) {
        if (stale[s] !== dropdowns) stale[s].parentNode.removeChild(stale[s]);
      }
      document.body.appendChild(dropdowns);
    } else {
      dropdowns = document.querySelector('body > #menus-dropdowns');
    }
    if (!dropdowns) return;

    var pages = menus.querySelectorAll('.menus_item .site-page[data-menu]');
    var dropEls = dropdowns.querySelectorAll('.menus_dropdown');
    if (!pages.length || !dropEls.length) return;

    var timers = new WeakMap();
    var CLOSE_DELAY = 90;
    var openPairs = [];

    function findDrop(label) {
      for (var i = 0; i < dropEls.length; i++) {
        if (dropEls[i].getAttribute('data-menu') === label) return dropEls[i];
      }
      return null;
    }

    // fixed 定位：用触发项 a.site-page 的实时 viewport 坐标。
    // 用触发项（而非 .menus_item 包装）作锚点，让下拉精确居中在菜单文字下方，
    // 避免 .menus_item 比 a 宽导致的几个像素偏移。水平居中由 CSS translateX(-50%) 完成。
    // 注：下拉展开期间胶囊一直带 .menu-open（保持 hover 缩放），所以胶囊在 trigger hover
    // 与 panel hover 两种状态下都是缩放态，实时坐标天然稳定，无需抵消缩放、也不会跳动。
    function positionDrop(drop, anchor) {
      var r = anchor.getBoundingClientRect();
      drop.style.left = (r.left + r.width / 2) + 'px';
      drop.style.top = (r.bottom + 8) + 'px';
    }

    // 胶囊放大过渡（.35s 弹簧）结束后，用缩放终态的锚点坐标校正一次下拉位置。
    // 这样放大动画全程可见（不再被 transition:none 跳变吃掉），且下拉最终精确对齐、不漂移。
    function scheduleReposition(drop, anchor) {
      var container = drop._navContainer;
      if (!container) return;
      var handler = function (e) {
        // 只关心 transform 过渡结束（即放大动画收尾）
        if (e.propertyName !== 'transform') return;
        container.removeEventListener('transitionend', handler);
        container._navRepositioning = false;
        if (drop.classList.contains('show')) positionDrop(drop, anchor);
      };
      // 防重入：避免连续 hover 多个菜单项时叠加多个监听
      if (container._navRepositioning) return;
      container._navRepositioning = true;
      container.addEventListener('transitionend', handler);
    }

    function show(drop, anchor) {
      var t = timers.get(drop);
      if (t) { clearTimeout(t); timers.delete(drop); }

      var container = drop._navContainer;
      // 关键修复：不再用 transition:none 把胶囊瞬间切到缩放终态（那会吃掉放大的弹簧动画，
      // 导致胶囊僵硬跳变）。改为——先基于"缩放前(scale 1)"的锚点把下拉定位好（仅差几像素），
      // 让 CSS :hover 的 .35s 放大动画正常播放；放大过渡结束后 transitionend 自动校正到终态位置。
      if (container && !container.classList.contains('menu-open')) {
        // 基于当前(scale 1)锚点先定位，保证下拉立即出现、不延迟
        positionDrop(drop, anchor);
        // 加 menu-open 锁定放大态（与 :hover 同值，无跳变；放大动画由 :hover 的 transition 播放）
        container.classList.add('menu-open');
        // 放大结束后（transform 过渡收尾）用终态坐标校正一次，消除初始几像素偏差
        scheduleReposition(drop, anchor);
      } else {
        positionDrop(drop, anchor);
      }

      drop.classList.add('show');
      // 下拉展开期间：保持触发项高亮（即使鼠标已移到 body 级的下拉面板上，
      // 触发项的 :hover 已丢失，用该类等效维持换色高亮，直到下拉收起才移除）
      if (drop._navItem) drop._navItem.classList.add('nav-item-active');
    }

    // 鼠标移到下拉面板自身：仅保持展开、取消收起计时，绝不重新定位（避免胶囊缩放导致的跳动）
    function keepOpen(drop) {
      var t = timers.get(drop);
      if (t) { clearTimeout(t); timers.delete(drop); }
      drop.classList.add('show');
    }

    function hide(drop) {
      var t = timers.get(drop);
      if (t) clearTimeout(t);
      timers.set(drop, setTimeout(function () {
        drop.classList.remove('show');
        if (drop._navItem) drop._navItem.classList.remove('nav-item-active');
        // 该容器下若没有其它展开的下拉，才解除 menu-open，让胶囊缩放平滑还原
        var anyShown = dropdowns.querySelector('.menus_dropdown.show');
        if (!anyShown && drop._navContainer) drop._navContainer.classList.remove('menu-open');
      }, CLOSE_DELAY));
    }

    // 滚动时直接收起所有下拉（而不是重新定位），避免下滑后下拉悬浮在内容上方
    function hideAllOnScroll() {
      for (var i = 0; i < dropEls.length; i++) {
        dropEls[i].classList.remove('show');
        if (dropEls[i]._navItem) dropEls[i]._navItem.classList.remove('nav-item-active');
      }
      var containers = document.querySelectorAll('.menus_items.menu-open');
      for (var i = 0; i < containers.length; i++) {
        containers[i].classList.remove('menu-open');
      }
    }

    for (var p = 0; p < pages.length; p++) {
      (function (page) {
        var item = page.parentElement;
        var drop = findDrop(page.getAttribute('data-menu'));
        if (!drop) return;
        drop._navContainer = page.closest('.menus_items');
        drop._navItem = item;
        openPairs.push({ anchor: page, drop: drop });
        // PJAX 切页时 nav 常不被替换，init 会再次执行；用标记避免事件重复叠加。
        if (item.dataset.navDropBound === '1') return;
        item.dataset.navDropBound = '1';
        item.addEventListener('mouseenter', function () { show(drop, page); });
        item.addEventListener('mouseleave', function () { hide(drop); });
        drop.addEventListener('mouseenter', function () { keepOpen(drop); });
        drop.addEventListener('mouseleave', function () { hide(drop); });
      })(pages[p]);
    }

    // resize 时重定位；scroll 时直接收起（用户要求下滑即消失）
    function repositionShown() {
      for (var i = 0; i < openPairs.length; i++) {
        if (openPairs[i].drop.classList.contains('show')) {
          positionDrop(openPairs[i].drop, openPairs[i].anchor);
        }
      }
    }

    if (window.__navDropdownBound !== true) {
      window.__navDropdownBound = true;
      window.addEventListener('resize', repositionShown);
      window.addEventListener('scroll', hideAllOnScroll, { passive: true, capture: true });
    }
  }

  // ---- 左侧返回菜单：改为 position: fixed 并动态定位 ----
  // .back-menu-list-groups 已从 #blog_name 内部移出（见 nav.pug），成为 #nav-group 的兄弟元素。
  // 这样它的 position: fixed 直接参考 viewport，不会被 #blog_name 的 backdrop-filter / transform
  // 限制，其 backdrop-filter 才能和 nav 胶囊一样直接模糊真实页面背景，做出完全一致的液态玻璃。
  // top/left 由 JS 根据 #blog_name 胶囊的 viewport 位置实时计算；展开/收起通过 .show 类控制，
  // 并保留「鼠标移开后延迟收起」逻辑。
  function initMenuBackdropFix() {
    var blogName = document.getElementById('blog_name');
    var backHome = document.querySelector('.back-home-button');
    var menu = document.querySelector('.back-menu-list-groups');
    if (!blogName || !backHome || !menu) return;

    var closeTimer = null;
    // 鼠标移开后等待 280ms 再收起，给「从按钮滑进菜单」留出时间，避免闪关。
    var CLOSE_DELAY = 280;

    // 菜单位置已完全由 CSS（position:absolute 相对 #nav-group）控制，JS 只负责切换 .show 类。
    // 这样即使旧版 JS 被缓存，也不会用 inline style 覆盖 CSS 定位，避免反复错位。
    var openMenu = function () {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      backHome.classList.add('menu-open');
      blogName.classList.add('menu-open');
      menu.classList.add('show');
    };

    var scheduleCloseMenu = function () {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        backHome.classList.remove('menu-open');
        blogName.classList.remove('menu-open');
        menu.classList.remove('show');
        closeTimer = null;
      }, CLOSE_DELAY);
    };

    backHome.addEventListener('mouseenter', openMenu);
    backHome.addEventListener('mouseleave', scheduleCloseMenu);
    menu.addEventListener('mouseenter', openMenu);
    menu.addEventListener('mouseleave', scheduleCloseMenu);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // PJAX 兼容：页面切换后重新注入（如果被清理）
  document.addEventListener('pjax:success', init);
  document.addEventListener('pjax:complete', init);

  // 公开 API（方便调试）
  window.liquidGlass = {
    init: init,
    refresh: injectSVGFilter,
    destroy: function () {
      var svg = document.getElementById(SVG_ID);
      if (svg) svg.remove();
      document.documentElement.style.removeProperty('--glass-blur');
    }
  };
})();
