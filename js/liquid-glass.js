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
  }

  // ---- 左侧返回菜单展开时，临时移除 #blog_name 的 backdrop-filter ----
  // 这样 .back-menu-list-groups 的毛玻璃才能参考真实页面背景。
  // CSS 中已用 :has() 实现，这里提供 JS 后备以兼容旧版浏览器或特殊状态。
  // 同时实现「鼠标移开后延迟收起」：给 .back-home-button 加 .menu-open 类，
  // 鼠标离开按钮或菜单后等待一小段时间才移除，期间进入另一侧则取消收起。
  function initMenuBackdropFix() {
    var blogName = document.getElementById('blog_name');
    var backHome = document.querySelector('.back-home-button');
    var menu = document.querySelector('.back-menu-list-groups');
    if (!blogName || !backHome) return;

    var closeTimer = null;
    // 鼠标移开后等待 280ms 再收起，给「从按钮滑进菜单」留出时间，避免闪关。
    var CLOSE_DELAY = 280;

    var openMenu = function () {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      backHome.classList.add('menu-open');
      blogName.classList.add('menu-open');
    };

    var scheduleCloseMenu = function () {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        backHome.classList.remove('menu-open');
        blogName.classList.remove('menu-open');
        closeTimer = null;
      }, CLOSE_DELAY);
    };

    backHome.addEventListener('mouseenter', openMenu);
    backHome.addEventListener('mouseleave', scheduleCloseMenu);
    if (menu) {
      menu.addEventListener('mouseenter', openMenu);
      menu.addEventListener('mouseleave', scheduleCloseMenu);
    }
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
