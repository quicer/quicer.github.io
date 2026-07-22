// ============================================================
// Cosmos Background
//   - 深色模式：星际穿越 Gargantua 风格自转黑洞
//               引力透镜吸积盘（顶部被抬起成拱、底部横带穿过） + 明亮光子环 + 黑影
//   - 浅色模式：不绘制宇宙元素，保持背景干净
// 纯 Canvas 2D 绘制，无外部依赖。
// ============================================================
(function () {
  'use strict';

  var canvas = document.getElementById('cosmos-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var W = 0, H = 0, minDim = 0;
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // ---------- 工具函数 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function rgb(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }

  // ============================================================
  // 土星：离屏贴图（气态条带），一次性生成
  // ============================================================
  var TEX = 1024;
  var tex = document.createElement('canvas');
  tex.width = TEX; tex.height = TEX;
  var tctx = tex.getContext('2d');

  var SAT_DARK = [150, 120, 78];    // 暗带（belts）
  var SAT_LIGHT = [236, 219, 179];  // 亮带（zones）

  function buildSaturn() {
    var img = tctx.createImageData(TEX, TEX);
    var d = img.data;
    for (var y = 0; y < TEX; y++) {
      var y01 = y / TEX;
      // 多条纬度带：土星以柔和的黄褐色条带著称
      var v = 0;
      v += Math.sin(y01 * Math.PI * 9.0) * 0.42;
      v += Math.sin(y01 * Math.PI * 17.0 + 0.6) * 0.22;
      v += Math.sin(y01 * Math.PI * 29.0 + 1.3) * 0.14;
      v += Math.sin(y01 * Math.PI * 47.0 + 0.4) * 0.08;
      var t = (v + 0.86) / 1.72;
      // 水平湍流，产生气态流动感
      var turb = Math.sin(y01 * 53 + 1.1) * 0.03 + Math.sin(y01 * 17 - 0.5) * 0.02;
      t = clamp(t + turb, 0, 1);
      var c = mix(SAT_DARK, SAT_LIGHT, t);
      // 两极略偏暖灰，增加球感
      var polar = Math.pow(Math.abs(y01 - 0.5) * 2, 3.0);
      c = mix(c, [206, 189, 151], polar * 0.35);
      for (var x = 0; x < TEX; x++) {
        // 细微噪声
        var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        var nn = (n - Math.floor(n) - 0.5) * 7;
        var cn = [clamp(c[0] + nn, 0, 255), clamp(c[1] + nn, 0, 255), clamp(c[2] + nn, 0, 255)];
        var i = (y * TEX + x) * 4;
        d[i] = cn[0]; d[i + 1] = cn[1]; d[i + 2] = cn[2]; d[i + 3] = 255;
      }
    }
    tctx.putImageData(img, 0, 0);
  }
  buildSaturn();

  // ---------- 土星光环分带（r 为相对星球半径 R 的比例） ----------
  // 真实结构：C 环（暗）→ B 环（最亮）→ Cassini 缝（空）→ A 环 → F 细环
  var RING_TILT = 0.42; // 环面倾角（弧度）
  var RING_BANDS = [
    { ri: 1.18, ro: 1.30, col: [205, 185, 148], a: 0.30 }, // C 环（暗淡）
    { ri: 1.30, ro: 1.33, col: [235, 216, 176], a: 0.55 }, // C/B 过渡
    { ri: 1.33, ro: 1.50, col: [245, 227, 187], a: 0.92 }, // B 环（最亮）
    { ri: 1.50, ro: 1.535, col: [70, 56, 36], a: 0.0 },    // Cassini 缝（几乎空）
    { ri: 1.535, ro: 1.56, col: [212, 192, 152], a: 0.50 }, // Cassini 内缘
    { ri: 1.56, ro: 1.71, col: [229, 209, 169], a: 0.82 },  // A 环
    { ri: 1.71, ro: 1.74, col: [172, 152, 114], a: 0.45 },  // A 外缘
    { ri: 1.74, ro: 1.77, col: [152, 134, 100], a: 0.30 }   // F 细环
  ];

  // 画一段光环（角度范围 a0→a1），用方位调制明暗团块模拟公转
  function drawRingSegments(cx, cy, R, band, a0, a1, ringRot) {
    var sy = Math.sin(RING_TILT);
    var speed = 1.2 / band.ri; // 内圈转得快（较差自转）
    var N = 96;
    for (var k = 0; k < N; k++) {
      var t0 = k / N, t1 = (k + 1) / N;
      var ang0 = a0 + (a1 - a0) * t0, ang1 = a0 + (a1 - a0) * t1;
      var ang = (ang0 + ang1) / 2;
      // 随 ringRot 移动的明暗团块 → 肉眼可见的「一点点转」
      var knot = 0.45 + 0.55 * Math.sin(ang * 3 + ringRot * speed);
      var a = band.a * knot;
      if (a <= 0.012) continue;
      var ri_x = band.ri * R, ro_x = band.ro * R;
      var ri_y = band.ri * R * sy, ro_y = band.ro * R * sy;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ro_x, ro_y, 0, ang0, ang1);
      ctx.ellipse(cx, cy, ri_x, ri_y, 0, ang1, ang0, true);
      ctx.closePath();
      ctx.fillStyle = rgba(band.col, a);
      ctx.fill();
    }
  }

  // ---------- 绘制土星 ----------
  function drawSaturn(cx, cy, R, scroll, ringRot, moonAng) {
    // 大气辉光
    var atm = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.22);
    atm.addColorStop(0, 'rgba(255,232,180,0)');
    atm.addColorStop(0.5, 'rgba(255,226,168,0.18)');
    atm.addColorStop(1, 'rgba(255,226,168,0)');
    ctx.fillStyle = atm;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fill();

    // 光环「后弧」（上半侧在星球之后，先画，再被星球遮挡）
    ctx.save();
    RING_BANDS.forEach(function (b) { drawRingSegments(cx, cy, R, b, Math.PI, Math.PI * 2, ringRot); });
    ctx.restore();

    // 星球本体（裁剪圆内滚动贴图 + 球面明暗 + 环投阴影）
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    var sx = (scroll * TEX) % TEX;
    if (sx < 0) sx += TEX;
    var d = 2 * R;
    var wFirst = TEX - sx;
    ctx.drawImage(tex, sx, 0, wFirst, TEX, cx - R, cy - R, d * wFirst / TEX, d);
    if (sx > 0) {
      ctx.drawImage(tex, 0, 0, sx, TEX, cx - R + d * wFirst / TEX, cy - R, d * sx / TEX, d);
    }
    // 球面明暗（左上受光，边缘变暗，营造立体感）
    var shade = ctx.createRadialGradient(cx - R * 0.30, cy - R * 0.30, R * 0.15, cx, cy, R);
    shade.addColorStop(0, 'rgba(255,255,255,0.14)');
    shade.addColorStop(0.5, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(54,34,16,0.55)');
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // 光环投射在星球赤道附近的阴影带
    var rsh = ctx.createLinearGradient(0, cy - R * 0.06, 0, cy + R * 0.52);
    rsh.addColorStop(0, 'rgba(48,30,12,0)');
    rsh.addColorStop(0.42, 'rgba(48,30,12,0.32)');
    rsh.addColorStop(0.7, 'rgba(48,30,12,0)');
    ctx.fillStyle = rsh;
    ctx.fillRect(cx - R, cy - R * 0.06, d, R * 0.58);
    ctx.restore();

    // 光环「前弧」（下半侧经过星球前方，覆盖星球下半部分）
    ctx.save();
    RING_BANDS.forEach(function (b) { drawRingSegments(cx, cy, R, b, 0, Math.PI, ringRot); });
    ctx.restore();

    // 卫星（泰坦）：绕土星缓慢公转
    var orbit = R * 2.4;
    var mx = cx + Math.cos(moonAng) * orbit;
    var my = cy + Math.sin(moonAng) * orbit * 0.42;
    var mr = R * 0.11;
    var mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 1.8);
    mg.addColorStop(0, 'rgba(228,217,193,0.85)');
    mg.addColorStop(1, 'rgba(228,217,193,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, mr * 1.8, 0, Math.PI * 2); ctx.fill();
    var mb = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.2, mx, my, mr);
    mb.addColorStop(0, '#efe9d7');
    mb.addColorStop(1, '#9a8f78');
    ctx.fillStyle = mb;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  }

  // ============================================================
  // 黑洞（仅深色）：星际穿越 Gargantua 风格
  //   黑影 + 明亮光子环 + 引力透镜吸积盘（顶部被抬起成拱、底部横带穿过前方）
  // ============================================================
  function segDisk(cx, cy, ri, riy, ro, roy, a0, a1, rot, base) {
    var N = 120;
    for (var k = 0; k < N; k++) {
      var t0 = k / N, t1 = (k + 1) / N;
      var ang0 = a0 + (a1 - a0) * t0, ang1 = a0 + (a1 - a0) * t1, ang = (ang0 + ang1) / 2;
      var mx = Math.cos(ang);                 // -1..1
      var dopp = (mx + 1) / 2;                // 朝向观察者的一侧更亮（多普勒增亮）
      var knot = 0.5 + 0.5 * Math.sin(ang * 3 + rot * 4); // 随 rot 公转的亮团
      var a = base * knot * (0.38 + 0.62 * dopp);
      if (a <= 0.02) continue;
      var col = [255, Math.round(110 + 140 * dopp), Math.round(40 + 150 * dopp)];
      ctx.beginPath();
      ctx.ellipse(cx, cy, ro, roy, 0, ang0, ang1);
      ctx.ellipse(cx, cy, ri, riy, 0, ang1, ang0, true);
      ctx.closePath();
      ctx.fillStyle = rgba(col, a);
      ctx.fill();
    }
  }

  function drawBlackHole(cx, cy, Rh, rot) {
    // 1. 外发光（暖橙，营造壮观氛围）
    var glow = ctx.createRadialGradient(cx, cy, Rh * 0.9, cx, cy, Rh * 4.6);
    glow.addColorStop(0, 'rgba(255,170,80,0)');
    glow.addColorStop(0.16, 'rgba(255,160,70,0.10)');
    glow.addColorStop(0.45, 'rgba(255,120,50,0.045)');
    glow.addColorStop(1, 'rgba(120,40,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, Rh * 4.6, 0, Math.PI * 2); ctx.fill();

    var Ax = Rh * 3.4;

    // 2. 后侧吸积盘（引力透镜把远端抬起，越过顶部成拱）——画上半弧
    segDisk(cx, cy, Rh * 1.42, Rh * 1.16 * (Rh * 1.42) / Ax, Ax, Rh * 1.16, Math.PI, Math.PI * 2, rot, 0.95);

    // 3. 事件视界（黑影，柔边）
    var sh = ctx.createRadialGradient(cx, cy, Rh * 0.6, cx, cy, Rh * 1.05);
    sh.addColorStop(0, '#000');
    sh.addColorStop(0.82, '#000');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(cx, cy, Rh * 1.05, 0, Math.PI * 2); ctx.fill();

    // 4. 光子环（明亮细圆环，带光晕）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,242,216,0.95)';
    ctx.lineWidth = Rh * 0.05;
    ctx.shadowColor = 'rgba(255,210,150,0.9)';
    ctx.shadowBlur = Rh * 0.28;
    ctx.beginPath(); ctx.ellipse(cx, cy, Rh * 1.04, Rh * 1.04, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // 5. 前侧吸积盘（近端，薄，横穿黑洞前方下方）
    segDisk(cx, cy, Rh * 1.12, Rh * 0.34 * (Rh * 1.12) / Ax, Ax, Rh * 0.34, 0, Math.PI, rot, 0.95);

    // 6. 透镜次级像：紧贴光子环上方的细亮弧（远端盘面被再次透镜）
    ctx.save();
    ctx.strokeStyle = 'rgba(255,225,180,0.5)';
    ctx.lineWidth = Rh * 0.025;
    ctx.beginPath(); ctx.ellipse(cx, cy, Rh * 1.22, Rh * 1.22, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
  }

  // ---------- 尺寸与主循环 ----------
  var satScroll = 0, ringRot = 0, bhRot = 0, moonAng = 0, last = performance.now();

  function resize() {
    W = window.innerWidth; H = window.innerHeight; minDim = Math.min(W, H);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  var mo = new MutationObserver(function () {
    isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    satScroll += dt * 0.02;   // 土星自转（约 50s 一圈）
    ringRot += dt * 0.35;     // 光环公转（肉眼可见地一点点转）
    bhRot += dt * 0.9;        // 黑洞吸积盘旋转
    moonAng += dt * 0.18;     // 卫星公转

    ctx.clearRect(0, 0, W, H);

    if (isDark) {
      // 深色模式：显示 Gargantua 风格黑洞，左侧
      drawBlackHole(W * 0.20, H * 0.34, minDim * 0.15, bhRot);
    }
    // 浅色模式：不绘制任何宇宙元素，保持背景干净

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
