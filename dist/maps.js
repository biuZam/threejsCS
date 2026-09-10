/* ------------------------------------------------------------------
 * 附加地图 —— 涂鸦车站 / 涂鸦神庙
 *
 * game.js 里三张原版地图（district / jungle / mexico）都是同一套关卡 DSL
 * 写出来的：wr() 先建好一个"施工工具箱"（box / slab / wallX / wallZ /
 * stairs / rail / cyl / ring / spawn / sniper / pickup / prop / breakable
 * …），再交给某个建图函数往里塞几何体，最后 finish() 把同色几何体合批。
 *
 * 所以加地图不需要动引擎，只需要再写一个建图函数。为了尽量少碰 bundle，
 * 新地图放在这里，通过 window.DOODLE_MAPS 注册；game.js 只改三处：
 *   1. 地图清单 Go 后面并入 DOODLE_MAPS.entries
 *   2. 建图分发 Bo 里先查 DOODLE_MAPS.builders
 *   3. 联机地图轮换 As 改成从 Go 取 key（原来是写死的两项）
 *
 * 本文件必须在 game.js 之前执行（index.html 里放在它前面的 module）。
 * ------------------------------------------------------------------ */

import * as THREE from 'three';

/* game.js 里的墨水枚举 k，这里照抄一份。style.inks 会把这 6 个槽位重新
   上色，所以「BLUE」在神庙里其实是砂岩色 —— 名字只是槽位号。 */
var INK = { BLUE: 0, RED: 1, BLACK: 2, ORANGE: 3, GREEN: 4, PINK: 5 };

var REG = (window.DOODLE_MAPS = window.DOODLE_MAPS || { entries: [], builders: {} });

function register(entry, build) {
  if (REG.builders[entry.key]) return;
  REG.entries.push(entry);
  REG.builders[entry.key] = build;
}

/* 工具箱里各函数的参数约定（从 wr() 反推，写在这里省得每次再推一遍）：
 *   box(cx, yBottom, cz, sx, sy, sz, opt)      —— x/z 是中心，y 是底面
 *   slab(x0, z0, x1, z1, yTop, thickness, opt) —— 按矩形范围铺一块板
 *   wallX(x0, x1, z, yBase, h, thk, holes, opt)—— 沿 X 的墙，holes=[[x0,x1,y0,y1]…]
 *   wallZ(z0, z1, x, yBase, h, thk, holes, opt)—— 沿 Z 的墙
 *   stairs(x, yBase, z, dir, n, width, opt)    —— dir: "+x"|"-x"|"+z"|"-z"
 *                                                 opt.rise/opt.run，返回终点 {x,y,z}
 *   rail(x0, z0, x1, z1, y, opt)               —— 栏杆（不挡子弹，挡人）
 *   cyl(cx, yBottom, cz, r, h, opt)            —— 圆柱
 *   sphere(cx, cy, cz, r, opt)                 —— 球（y 是中心）
 *   ring(x, y, z, axis)                        —— 钩爪环，axis: "x"|"y"|"z"
 *   spawn/sniper/pickup(x, y, z)               —— 敌人 / 狙击手 / 弹药点
 *   prop(kind, x, y, z, half, build, opt)      —— 可推动物件
 *   breakable(kind, x, y, z, sx, sy, sz, build, opt) —— 可破坏物件
 *   opt: { ink, fill, noCollide, noNav, noShoot, noGrapple }
 */

/* ==================================================================
 * 涂鸦车站 —— DOODLE STATION
 *
 * 一个三层的地下车站：轨道坑（y=0）／两侧站台+商铺层（y=2.4）／
 * 夹层回廊+三座跨线天桥（y=9.4）。轨道上停着三节车厢，车顶（y=4.8）
 * 是站台和天桥之间的中间踏板。两端隧道口是刷怪点。
 * ================================================================== */
function buildStation(kit, arena) {
  var L = kit.L,
    box = kit.box,
    slab = kit.slab,
    wallX = kit.wallX,
    wallZ = kit.wallZ,
    stairs = kit.stairs,
    rail = kit.rail,
    cyl = kit.cyl,
    ring = kit.ring,
    spawn = kit.spawn,
    sniper = kit.sniper,
    pickup = kit.pickup,
    prop = kit.prop,
    breakable = kit.breakable,
    mesh = kit.mesh,
    addGeo = kit.addGeo,
    collider = kit.collider,
    scene = kit.scene;

  var B = 52, S = 6, WH = 24;
  var DECK = 2.4;   // 站台面
  var MEZZ = 9.4;   // 夹层 / 天桥面
  var PIT_X = 14;   // 轨道坑半宽

  L.key = 'station';
  L.playerStart.set(-24, DECK, 38);
  L.bounds = { minX: -B, maxX: B, minZ: -B, maxZ: B };
  L.style = {
    paper: [0.935, 0.945, 0.955],
    lines: 1,
    inks: [
      [0.16, 0.28, 0.50],  // BLUE   车厢 / 主结构
      [0.82, 0.16, 0.22],  // RED    警示
      [0.14, 0.15, 0.19],  // BLACK  钢构 / 轨道
      [0.95, 0.62, 0.06],  // ORANGE 站台黄线 / 标识
      [0.10, 0.50, 0.42],  // GREEN  指示牌
      [0.72, 0.34, 0.58]   // PINK   广告灯箱
    ]
  };

  var STEEL = { ink: INK.BLACK };
  var SIGN = { ink: INK.ORANGE };
  var CAGE = { noNav: true, noGrapple: true };

  /* --- 轨道坑地面 + 四面墙 ------------------------------------- */
  box(0, -1, 0, 2 * B + S, 1, 2 * B + S, STEEL);

  // 两端：隧道口开洞
  wallX(-B - S / 2, B + S / 2, -B, 0, WH, S, [[-13, 13, 0, 8]]);
  wallX(-B - S / 2, B + S / 2, B, 0, WH, S, [[-13, 13, 0, 8]]);
  // 两侧是实墙 —— 商铺靠贴墙的亭子表现，墙上开洞会直接看到纸面外的空白
  wallZ(-B - S / 2, B + S / 2, -B, 0, WH, S, []);
  wallZ(-B - S / 2, B + S / 2, B, 0, WH, S, []);

  // 看不见的天花板 / 挡出界（和原版地图一样，只挡人不挡导航）
  collider(0, WH, -B, 2 * B + S, 40, S, CAGE);
  collider(0, WH, B, 2 * B + S, 40, S, CAGE);
  collider(-B, WH, 0, S, 40, 2 * B + S, CAGE);
  collider(B, WH, 0, S, 40, 2 * B + S, CAGE);
  collider(0, 46, 0, 2 * B + 40, 8, 2 * B + 40, CAGE);

  /* --- 两侧站台 / 商铺层 --------------------------------------- */
  slab(-B - S / 2, -B - S / 2, -PIT_X, B + S / 2, DECK, DECK);
  slab(PIT_X, -B - S / 2, B + S / 2, B + S / 2, DECK, DECK);
  // 站台边缘的黄线
  box(-PIT_X - 0.7, DECK, 0, 1.0, 0.06, 2 * B, { ink: INK.ORANGE, noCollide: true });
  box(PIT_X + 0.7, DECK, 0, 1.0, 0.06, 2 * B, { ink: INK.ORANGE, noCollide: true });

  /* --- 轨道 ---------------------------------------------------- */
  [-7, 7].forEach(function (tx) {
    box(tx - 1.4, 0, 0, 0.3, 0.26, 2 * B, { ink: INK.BLACK, noCollide: true });
    box(tx + 1.4, 0, 0, 0.3, 0.26, 2 * B, { ink: INK.BLACK, noCollide: true });
    box(tx - Math.sign(tx) * 2.9, 0, 0, 0.28, 0.5, 2 * B, { ink: INK.ORANGE, noCollide: true }); // 第三轨（走内侧，外侧留给坡道）
    for (var z = -50; z <= 50; z += 2.6) {
      box(tx, 0, z, 4.4, 0.16, 0.7, { ink: INK.BLACK, noCollide: true });
    }
  });

  /* --- 轨道坑 → 站台的坡道 -------------------------------------
     站台面比轨道面高 2.4，而 body.stepHeight 只有 0.55：没有台阶的话从坑里
     只能下不能上，隧道口刷出来的敌人会被困在轨道上。每侧三条 6 级 × 0.4 的
     坡道，z 位置避开车厢和接触网门架的立柱。 */
  var RAMP = { rise: 0.4, run: 0.7, ink: INK.BLACK };
  [-42, 2, 42].forEach(function (rz) { stairs(-9.8, 0, rz, '-x', 6, 5, RAMP); });
  [-42, 24, 42].forEach(function (rz) { stairs(9.8, 0, rz, '+x', 6, 5, RAMP); });
  // 坡道口的黄黑警示条
  [[-14.6, -42], [-14.6, 2], [-14.6, 42], [14.6, -42], [14.6, 24], [14.6, 42]]
    .forEach(function (p) {
      box(p[0], DECK, p[1], 1.0, 0.07, 5, { ink: INK.RED, noCollide: true });
    });

  /* --- 两端隧道（墙洞后面的一段死路，纯粹为了有纵深） ----------- */
  [-1, 1].forEach(function (sgn) {
    var near = sgn * (B + S / 2), far = sgn * 64;
    var z0 = Math.min(near, far), z1 = Math.max(near, far);
    slab(-13, z0, 13, z1, 0, 1, STEEL);
    wallZ(z0, z1, -13.6, 0, 8, 1.2, [], STEEL);
    wallZ(z0, z1, 13.6, 0, 8, 1.2, [], STEEL);
    slab(-13.6, z0, 13.6, z1, 8.6, 0.6, STEEL);
    wallX(-13.6, 13.6, far, 0, 8.6, 1.2, [], STEEL);
    // 隧道口两侧的红/绿信号灯
    box(-11.5, 5.4, sgn * 47, 0.9, 0.9, 0.4, { ink: INK.RED, noCollide: true });
    box(11.5, 5.4, sgn * 47, 0.9, 0.9, 0.4, { ink: INK.GREEN, noCollide: true });
  });

  /* --- 站台柱列 + 顶部桁架 ------------------------------------- */
  for (var pz = -45; pz <= 45; pz += 9) {
    [-20.5, 20.5].forEach(function (px) {
      cyl(px, DECK, pz, 0.75, 11.6, STEEL);
      box(px, 13.6, pz, 2.4, 0.6, 2.4, STEEL);
    });
    box(0, 14, pz, 2 * B, 0.7, 1.2, { ink: INK.BLACK, noNav: true });
  }
  box(-20.5, 14, 0, 1.2, 0.7, 2 * B, { ink: INK.BLACK, noNav: true });
  box(20.5, 14, 0, 1.2, 0.7, 2 * B, { ink: INK.BLACK, noNav: true });

  /* --- 夹层回廊（贴着左右外墙） -------------------------------- */
  slab(-B - S / 2, -42, -32, 42, MEZZ, 1.0);
  slab(32, -42, B + S / 2, 42, MEZZ, 1.0);
  rail(-32, -42, -32, 42, MEZZ);
  rail(32, -42, 32, 42, MEZZ);
  for (var mz = -36; mz <= 36; mz += 12) {
    cyl(-42, DECK, mz, 0.6, MEZZ - 1.0 - DECK, STEEL);
    cyl(42, DECK, mz, 0.6, MEZZ - 1.0 - DECK, STEEL);
  }

  /* --- 三座跨线天桥 -------------------------------------------- */
  [-18, 0, 18].forEach(function (bz) {
    slab(-32, bz - 4, 32, bz + 4, MEZZ, 1.0);
    rail(-32, bz - 4, 32, bz - 4, MEZZ);
    rail(-32, bz + 4, 32, bz + 4, MEZZ);
    ring(0, MEZZ - 1.6, bz, 'y');       // 桥底下挂一个钩爪环
    ring(-16, MEZZ - 1.6, bz, 'y');
    ring(16, MEZZ - 1.6, bz, 'y');
  });

  /* --- 站台 → 夹层的四座楼梯（14 级 × 0.5 = 7.0） -------------- */
  var stepOpt = { rise: 0.5, run: 0.9 };
  stairs(-20, DECK, -31.5, '-x', 14, 4.5, stepOpt);
  stairs(-20, DECK, 31.5, '-x', 14, 4.5, stepOpt);
  stairs(20, DECK, -31.5, '+x', 14, 4.5, stepOpt);
  stairs(20, DECK, 31.5, '+x', 14, 4.5, stepOpt);

  /* --- 停在轨道上的车厢 ---------------------------------------- */
  function carriage(cx, cz) {
    var half = 13, roof = 4.8, floor = 0.4;   // 底架高度：stepHeight 是 0.55，0.9 的话车门就迈不进去了
    box(cx, 0, cz, 7.2, floor, 2 * half, STEEL);          // 底架
    var doors = [
      [cz - 9.5, cz - 6.5, 0, 3.1],
      [cz - 1.5, cz + 1.5, 0, 3.1],
      [cz + 6.5, cz + 9.5, 0, 3.1]
    ];
    wallZ(cz - half, cz + half, cx - 3.5, floor, 4.0, 0.45, doors, { ink: INK.BLUE });
    wallZ(cz - half, cz + half, cx + 3.5, floor, 4.0, 0.45, doors, { ink: INK.BLUE });
    var win = [[cx - 1.8, cx + 1.8, 1.1, 2.8]];
    wallX(cx - 3.6, cx + 3.6, cz - half, floor, 4.0, 0.45, win, { ink: INK.BLUE });
    wallX(cx - 3.6, cx + 3.6, cz + half, floor, 4.0, 0.45, win, { ink: INK.BLUE });
    slab(cx - 3.8, cz - half - 0.4, cx + 3.8, cz + half + 0.4, roof, 0.35, { ink: INK.BLUE });
    box(cx, roof, cz - 6, 2.4, 0.7, 3.4, STEEL);          // 车顶空调
    box(cx, roof, cz + 6, 2.4, 0.7, 3.4, STEEL);
    box(cx, roof + 0.7, cz, 0.3, 1.4, 0.3, STEEL);        // 受电弓
    box(cx, roof + 2.1, cz, 2.6, 0.2, 0.2, STEEL);
    ring(cx, roof + 3.4, cz, 'y');
    // 车厢内的长椅
    for (var i = -1; i <= 1; i++) {
      box(cx - 2.6, floor, cz + i * 7, 1.4, 0.5, 3.2, STEEL);
      box(cx + 2.6, floor, cz + i * 7, 1.4, 0.5, 3.2, STEEL);
    }
    // 车尾旁边堆的货箱：从坑底踩上车顶
    var sx = cx > 0 ? cx + 5.0 : cx - 5.0, sz = cz - half - 2.4;
    box(sx, 0, sz, 2.2, 1.5, 2.2, { ink: INK.ORANGE });
    box(sx, 1.5, sz, 1.9, 1.4, 1.9, { ink: INK.ORANGE });
    box(sx, 2.9, sz, 1.6, 1.4, 1.6, { ink: INK.ORANGE });
  }
  carriage(-7, -18);
  carriage(-7, 22);
  carriage(7, -2);

  /* --- 轨道上方的接触网门架（没被天桥占掉的 z） ----------------- */
  [-44, -32, -9, 9, 32, 44].forEach(function (gz) {
    box(0, 12, gz, 2 * PIT_X, 0.5, 0.8, { ink: INK.BLACK, noNav: true });
    cyl(-13, 0, gz, 0.35, 12, STEEL);
    cyl(13, 0, gz, 0.35, 12, STEEL);
    ring(0, 11.2, gz, 'y');
  });

  /* --- 商铺 / 灯箱 / 到站显示屏 --------------------------------- */
  [-38, -12, 14, 38].forEach(function (kz) {
    [-1, 1].forEach(function (sgn) {
      var kx = sgn * 47;
      box(kx, DECK, kz, 8, 3.6, 8, STEEL);
      box(kx - sgn * 4.4, DECK + 3.2, kz, 1.4, 0.35, 8, SIGN);        // 雨棚
      box(kx - sgn * 4.1, DECK + 1.8, kz, 0.12, 1.6, 5, { ink: INK.PINK, noCollide: true, fill: true }); // 灯箱
    });
  });
  // 隧道口上方的到站显示屏
  [-1, 1].forEach(function (sgn) {
    box(0, 10, sgn * 46, 22, 4, 0.6, { ink: INK.BLACK, noNav: true });
    for (var r = 0; r < 3; r++) {
      box(0, 10.7 + r * 1.1, sgn * (46 - 0.4), 19, 0.5, 0.12, { ink: INK.ORANGE, noCollide: true, fill: true });
    }
    addGeo(
      new THREE.CylinderGeometry(2.2, 2.2, 0.5, 16)
        .rotateX(Math.PI / 2)
        .translate(0, 16, sgn * 46),
      INK.BLACK
    );
  });

  /* --- 站台上的杂物 -------------------------------------------- */
  function bench(x, z, yaw) {
    prop('crate', x, DECK, z, { x: 1.6, y: 0.45, z: 0.7 }, function (g) {
      g.add(mesh(new THREE.BoxGeometry(3.2, 0.28, 1.2), INK.BLACK));
      for (var s = -1; s <= 1; s += 2) {
        g.add(mesh(new THREE.BoxGeometry(0.3, 0.9, 1.0).translate(s * 1.3, -0.45, 0), INK.BLACK));
      }
    }, { mass: 1.4, snap: 'cube', ink: INK.BLACK, yaw: yaw || 0 });
  }
  function vending(x, z) {
    breakable('crate', x, DECK, z, 1.6, 2.6, 1.0, function (g) {
      g.add(mesh(new THREE.BoxGeometry(1.6, 2.6, 1.0).translate(0, 1.3, 0), INK.PINK));
      g.add(mesh(new THREE.BoxGeometry(1.2, 1.6, 0.08).translate(0, 1.5, 0.52), INK.ORANGE, true));
    }, { hp: 28, ink: INK.PINK });
  }
  function bin(x, z) {
    breakable('barrel', x, DECK, z, 1.0, 1.3, 1.0, function (g) {
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.3, 10).translate(0, 0.65, 0), INK.GREEN));
      g.add(mesh(new THREE.TorusGeometry(0.5, 0.05, 4, 14).rotateX(Math.PI / 2).translate(0, 1.2, 0), INK.BLACK));
    }, { hp: 22, ink: INK.GREEN });
  }
  [-34, -6, 20, 44].forEach(function (z, i) {
    bench(-24, z, i % 2 ? Math.PI / 2 : 0);
    bench(24, -z, i % 2 ? 0 : Math.PI / 2);
  });
  vending(-30, -20); vending(30, 20); vending(-30, 34); vending(30, -34);
  bin(-18, -40); bin(18, 40); bin(-18, 12); bin(18, -12);
  bin(-44, 24); bin(44, -24);

  /* --- 顶棚的排风扇（唯一的动态装饰） --------------------------- */
  [-27, 0, 27].forEach(function (fz, i) {
    var g = new THREE.Group();
    g.add(mesh(new THREE.TorusGeometry(2.4, 0.18, 6, 18).rotateX(Math.PI / 2), INK.BLACK));
    for (var bIdx = 0; bIdx < 4; bIdx++) {
      var blade = mesh(new THREE.BoxGeometry(2.2, 0.08, 0.7), INK.BLACK);
      blade.position.set(Math.cos((bIdx * Math.PI) / 2) * 1.2, 0, Math.sin((bIdx * Math.PI) / 2) * 1.2);
      blade.rotation.y = (bIdx * Math.PI) / 2;
      blade.rotation.z = 0.4;
      g.add(blade);
    }
    g.position.set(0, 15.4, fz);
    scene.add(g);
    L.meshes.push(g);
    var spd = 1.3 + i * 0.25;
    L.animated.push({ mesh: g, update: function (t) { g.rotation.y = t * spd; } });
  });

  /* --- 刷怪 / 狙击位 / 弹药 ------------------------------------ */
  [[0, 0, -46], [0, 0, 46], [-24, DECK, -44], [24, DECK, -44], [-24, DECK, 44],
   [24, DECK, 44], [-40, DECK, 0], [40, DECK, 0], [-24, DECK, 4], [24, DECK, -4],
   [-42, MEZZ, -20], [42, MEZZ, 20], [-42, MEZZ, 20], [42, MEZZ, -20]
  ].forEach(function (p) { spawn(p[0], p[1], p[2]); });

  [[-42, MEZZ, -32], [42, MEZZ, 32], [0, MEZZ, -18], [0, MEZZ, 18],
   [-7, 4.8, -18], [7, 4.8, -2], [-7, 4.8, 22], [-42, MEZZ, 34], [42, MEZZ, -34]
  ].forEach(function (p) { sniper(p[0], p[1], p[2]); });

  [[-24, DECK, -24], [24, DECK, 24], [-24, DECK, 28], [24, DECK, -28],
   [0, 0, 36], [0, 0, -36], [-42, MEZZ, 0], [42, MEZZ, 0],
   [0, MEZZ, 0], [-46, DECK, -26], [46, DECK, 26]
  ].forEach(function (p) { pickup(p[0], p[1], p[2]); });

  [[-24, DECK, -46], [24, DECK, 46], [-46, DECK, 18], [46, DECK, -18],
   [-24, DECK, 10], [24, DECK, -10], [-42, MEZZ, -38], [42, MEZZ, 38],
   [0, MEZZ, -18], [0, MEZZ, 18], [-7, 4.8, 22], [7, 4.8, -2],
   [0, 0, 42], [0, 0, -42], [-46, DECK, 44], [46, DECK, -44]
  ].forEach(function (p) { L.arenaSpawns.push(new THREE.Vector3(p[0], p[1], p[2])); });

  return kit.finish();
}

/* ==================================================================
 * 涂鸦神庙 —— DOODLE TEMPLE
 *
 * 中央四级金字塔（y=4/8/12/16，四面陡梯直通顶部神龛），外圈一整条
 * 抬高的柱廊回廊（y=6），四角是带屋顶的角楼平台（y=11），北面一个
 * 下沉水池（y=-3）配踏石。开阔但每个方向都有掩体和高度差。
 * ================================================================== */
function buildTemple(kit, arena) {
  var L = kit.L,
    box = kit.box,
    slab = kit.slab,
    wallX = kit.wallX,
    wallZ = kit.wallZ,
    stairs = kit.stairs,
    rail = kit.rail,
    cyl = kit.cyl,
    sphere = kit.sphere,
    ring = kit.ring,
    spawn = kit.spawn,
    sniper = kit.sniper,
    pickup = kit.pickup,
    prop = kit.prop,
    breakable = kit.breakable,
    birds = kit.birds,
    mesh = kit.mesh,
    collider = kit.collider;

  var B = 58, S = 6, WH = 28;
  var CLO = 6;     // 柱廊面
  var TOWER = 11;  // 角楼面
  var E = B + S / 2;

  L.key = 'temple';
  L.playerStart.set(0, 0, 50);
  L.bounds = { minX: -B, maxX: B, minZ: -B, maxZ: B };
  L.style = {
    paper: [0.965, 0.940, 0.860],
    lines: 0,
    inks: [
      [0.42, 0.34, 0.24],  // BLUE   砂岩 / 主体
      [0.80, 0.18, 0.16],  // RED    火盆 / 血祭纹
      [0.16, 0.14, 0.12],  // BLACK  石雕 / 阴影
      [0.92, 0.66, 0.14],  // ORANGE 鎏金
      [0.16, 0.46, 0.24],  // GREEN  藤蔓
      [0.72, 0.30, 0.48]   // PINK   幡旗
    ]
  };

  var STONE = { ink: INK.BLUE };
  var DARK = { ink: INK.BLACK };
  var GOLD = { ink: INK.ORANGE };
  var CAGE = { noNav: true, noGrapple: true };

  /* --- 地面：绕开北面的下沉水池铺四块 --------------------------- */
  var PX = 15, PZ0 = 24, PZ1 = 44, PY = -3;
  slab(-E, -E, E, PZ0, 0, 1, STONE);
  slab(-E, PZ1, E, E, 0, 1, STONE);
  slab(-E, PZ0, -PX, PZ1, 0, 1, STONE);
  slab(PX, PZ0, E, PZ1, 0, 1, STONE);

  // 水池：池底 + 四壁 + 水面 + 踏石 + 一段出水台阶
  slab(-PX, PZ0, PX, PZ1, PY, 1, DARK);
  // 四面池壁各留一个 6 宽的缺口，对应下面四条上岸台阶
  [-PX, PX].forEach(function (wx) {
    box(wx, PY, 27.5, 0.6, -PY, 7, DARK);
    box(wx, PY, 40.5, 0.6, -PY, 7, DARK);
  });
  [PZ0, PZ1].forEach(function (wz) {
    box(-9, PY, wz, 12, -PY, 0.6, DARK);
    box(9, PY, wz, 12, -PY, 0.6, DARK);
  });
  box(0, PY + 1.9, (PZ0 + PZ1) / 2, 2 * PX - 1.4, 0.06, PZ1 - PZ0 - 1.4,
      { ink: INK.BLUE, noCollide: true, fill: true });
  [[-9, 28], [0, 33], [9, 38], [-6, 40], [8, 27], [2, 42]].forEach(function (p) {
    box(p[0], PY, p[1], 3.4, 2.6, 3.4, STONE);
  });
  /* 上岸台阶。原来只有北面一条，敌人一旦掉进池子就会朝玩家方向直直走到池壁前
     卡住（实测扔一个到 (-13,-3,42)，40 秒都爬不出来）—— 四面各来一条才行。 */
  var POOL_STEP = { rise: 0.5, run: 0.9, ink: INK.BLUE };
  stairs(0, PY, PZ1 - 5.4, '+z', 6, 6, POOL_STEP);
  stairs(0, PY, PZ0 + 5.4, '-z', 6, 6, POOL_STEP);
  stairs(-PX + 5.4, PY, 34, '-x', 6, 6, POOL_STEP);
  stairs(PX - 5.4, PY, 34, '+x', 6, 6, POOL_STEP);

  /* --- 外墙 + 天花板拦截 --------------------------------------- */
  wallX(-E, E, -B, 0, WH, S, [], STONE);
  wallX(-E, E, B, 0, WH, S, [], STONE);
  wallZ(-E, E, -B, 0, WH, S, [], STONE);
  wallZ(-E, E, B, 0, WH, S, [], STONE);
  collider(0, WH, -B, 2 * B + S, 44, S, CAGE);
  collider(0, WH, B, 2 * B + S, 44, S, CAGE);
  collider(-B, WH, 0, S, 44, 2 * B + S, CAGE);
  collider(B, WH, 0, S, 44, 2 * B + S, CAGE);
  collider(0, 50, 0, 2 * B + 40, 8, 2 * B + 40, CAGE);

  /* --- 中央金字塔 ---------------------------------------------- */
  var tiers = [[0, 4, 44], [4, 4, 34], [8, 4, 24], [12, 4, 15]];
  tiers.forEach(function (t) {
    box(0, t[0], 0, t[2], t[1], t[2], STONE);
    box(0, t[0] + t[1] - 0.3, 0, t[2] + 0.7, 0.3, t[2] + 0.7,
        { ink: INK.ORANGE, noCollide: true });
  });
  /* 四面阶梯：每级台面上单独一跑（8 级 × 0.5 = 4.0，长 5.0），最下面一跑
     还凸出到地面上。一开始是从地面直接一跑到顶的陡梯，但那样整条梯子都埋在
     实心的台体里，正面看就是一堵平墙 —— 分跑放在各级台面上才看得出是台阶。 */
  var FLIGHT = { rise: 0.5, run: 0.625, ink: INK.BLUE };
  var FACES = [[1, 0, '-x'], [-1, 0, '+x'], [0, 1, '-z'], [0, -1, '+z']];
  FACES.forEach(function (f) {
    [[0, 27], [4, 22], [8, 17], [12, 12]].forEach(function (fl) {
      stairs(f[0] * fl[1], fl[0], f[1] * fl[1], f[2], 8, 7, FLIGHT);
    });
  });
  // 最下面一跑两侧的镇兽
  FACES.forEach(function (f) {
    var nx = f[0] !== 0 ? 0 : 5.4, nz = f[0] !== 0 ? 5.4 : 0;
    [-1, 1].forEach(function (sg) {
      var x = f[0] * 29 + sg * nx, z = f[1] * 29 + sg * nz;
      box(x, 0, z, 2.2, 1.6, 2.2, DARK);
      sphere(x, 2.2, z, 0.85, DARK);
      box(x, 2.9, z, 1.1, 0.5, 1.1, GOLD);
    });
  });

  /* --- 塔顶神龛 ------------------------------------------------ */
  [-5.5, 5.5].forEach(function (sx) {
    [-5.5, 5.5].forEach(function (sz) { cyl(sx, 16, sz, 0.8, 6, STONE); });
  });
  box(0, 16, 0, 4.2, 1.6, 4.2, GOLD);                 // 祭台
  slab(-7.2, -7.2, 7.2, 7.2, 23, 1, STONE);
  box(0, 23, 0, 9.5, 1.2, 9.5, STONE);
  box(0, 24.2, 0, 5.5, 1.2, 5.5, STONE);
  sphere(0, 26.4, 0, 1.7, GOLD);
  ring(0, 27.8, 0, 'y');
  [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(function (p) { ring(p[0], 21.6, p[1], 'y'); });

  /* --- 外圈柱廊回廊（y=6） -------------------------------------- */
  slab(-E, -E, -46, E, CLO, 1, STONE);
  slab(46, -E, E, E, CLO, 1, STONE);
  slab(-46, -E, 46, -46, CLO, 1, STONE);
  slab(-46, 46, 46, E, CLO, 1, STONE);
  rail(-46, -44, -46, 44, CLO);
  rail(46, -44, 46, 44, CLO);
  rail(-44, -46, 44, -46, CLO);
  rail(-44, 46, 44, 46, CLO);

  // 支撑柱 + 廊上柱 + 顶部楣梁（楣梁只挡人不进导航，用来挂钩爪环）
  function colonnade(ax, az, dx, dz, n, step, start) {
    for (var i = 0; i < n; i++) {
      var x = ax + dx * (start + i * step), z = az + dz * (start + i * step);
      if (Math.abs(x) > 44 && Math.abs(z) > 44) continue;   // 角楼占了的位置不再立柱
      cyl(x, 0, z, 0.9, CLO - 1, STONE);          // 廊下柱
      cyl(x, CLO, z, 0.8, 6, STONE);              // 廊上柱
      box(x, CLO + 6, z, 2.4, 0.6, 2.4, GOLD);    // 柱头
    }
  }
  // 起点取 -52 而不是 -56/-48：柱子落在 ±4 的奇数格上，让开四条坡梯所在的中轴
  colonnade(-47, 0, 0, 1, 14, 8, -52);
  colonnade(47, 0, 0, 1, 14, 8, -52);
  colonnade(0, -47, 1, 0, 14, 8, -52);
  colonnade(0, 47, 1, 0, 14, 8, -52);
  [[-47, 0, 1.4, 2 * B], [47, 0, 1.4, 2 * B]].forEach(function (b) {
    box(b[0], CLO + 6.6, b[1], b[2], 0.8, b[3], { ink: INK.BLUE, noNav: true });
  });
  box(0, CLO + 6.6, -47, 2 * B, 0.8, 1.4, { ink: INK.BLUE, noNav: true });
  box(0, CLO + 6.6, 47, 2 * B, 0.8, 1.4, { ink: INK.BLUE, noNav: true });
  for (var rz = -40; rz <= 40; rz += 16) {
    ring(-47, CLO + 5.4, rz, 'y');
    ring(47, CLO + 5.4, rz, 'y');
    ring(rz, CLO + 5.4, -47, 'y');
    ring(rz, CLO + 5.4, 47, 'y');
  }

  // 地面 → 柱廊的四座坡梯（12 级 × 0.5 = 6.0）
  var rampOpt = { rise: 0.5, run: 0.9, ink: INK.BLUE };
  stairs(-35.2, 0, 0, '-x', 12, 7, rampOpt);
  stairs(35.2, 0, 0, '+x', 12, 7, rampOpt);
  stairs(0, 0, -35.2, '-z', 12, 7, rampOpt);
  stairs(0, 0, 35.2, '+z', 12, 7, rampOpt);

  /* --- 四角角楼（y=11，带三层塔顶） ----------------------------- */
  [[-52, -52], [52, -52], [-52, 52], [52, 52]].forEach(function (c) {
    var cx = c[0], cz = c[1];
    box(cx, CLO, cz, 15, TOWER - CLO, 15, STONE);
    // 从柱廊踩上来：沿着离中心近的那条边上 10 级
    var sgnZ = cz < 0 ? -1 : 1;
    stairs(cx, CLO, cz - sgnZ * 15.5, sgnZ > 0 ? '+z' : '-z', 10, 6,
           { rise: 0.5, run: 0.8, ink: INK.BLUE });
    [-5, 5].forEach(function (ox) {
      [-5, 5].forEach(function (oz) { cyl(cx + ox, TOWER, cz + oz, 0.7, 5, STONE); });
    });
    box(cx, TOWER + 5, cz, 15, 1, 15, STONE);
    box(cx, TOWER + 6, cz, 10, 1, 10, STONE);
    box(cx, TOWER + 7, cz, 5, 1, 5, GOLD);
    sphere(cx, TOWER + 9, cz, 1.1, GOLD);
    ring(cx, TOWER + 3.6, cz, 'y');
    sniper(cx, TOWER, cz);
  });

  /* --- 神道石像（金字塔两侧） ----------------------------------- */
  [-26, 26].forEach(function (sx) {
    for (var sz = -42; sz <= 42; sz += 12) {
      box(sx, 0, sz, 3.0, 1.0, 3.0, STONE);
      box(sx, 1.0, sz, 2.0, 3.4, 1.6, DARK);
      sphere(sx, 5.2, sz, 0.95, DARK);
      box(sx, 5.6, sz, 1.6, 0.7, 1.6, GOLD);
      box(sx, 6.3, sz, 0.35, 1.6, 0.35, GOLD);
    }
  });

  /* --- 火盆（可破坏） / 陶罐 / 倒柱（可推） --------------------- */
  function brazier(x, y, z) {
    breakable('barrel', x, y, z, 1.8, 2.4, 1.8, function (g) {
      g.add(mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.5).translate(0, 0.75, 0), INK.BLACK));
      g.add(mesh(new THREE.CylinderGeometry(0.95, 0.6, 0.9, 10).translate(0, 1.9, 0), INK.BLACK));
      g.add(mesh(new THREE.ConeGeometry(0.7, 1.3, 7).translate(0, 2.9, 0), INK.RED));
    }, { hp: 26, ink: INK.RED });
  }
  function urn(x, y, z) {
    prop('barrel', x, y, z, { x: 0.6, y: 0.75, z: 0.6 }, function (g) {
      g.add(mesh(new THREE.SphereGeometry(0.7, 9, 7).scale(1, 1.05, 1), INK.ORANGE));
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.5, 9).translate(0, 0.75, 0), INK.ORANGE));
    }, { mass: 1.1, snap: 'cube', ink: INK.ORANGE });
  }
  function fallenColumn(x, y, z, yaw) {
    prop('crate', x, y, z, { x: 3.0, y: 0.8, z: 0.8 }, function (g) {
      for (var i = -2; i <= 2; i++) {
        g.add(mesh(
          new THREE.CylinderGeometry(0.78, 0.78, 1.1, 10).rotateZ(Math.PI / 2).translate(i * 1.2, 0, 0),
          INK.BLUE));
      }
    }, { mass: 4.5, snap: 'free', ink: INK.BLUE, yaw: yaw || 0, radius: 0.9, footHalf: 0.8 });
  }
  [[-14, 0, -14], [14, 0, -14], [-14, 0, 14], [14, 0, 14]].forEach(function (p) {
    brazier(p[0], p[1], p[2]);
  });
  brazier(-4.5, 16, -4.5); brazier(4.5, 16, 4.5);
  brazier(-40, CLO, -20); brazier(40, CLO, 20);
  [[-34, 0, -8], [34, 0, 8], [-8, 0, -38], [8, 0, 38], [-20, 4, 18], [20, 4, -18],
   [-40, CLO, 12], [40, CLO, -12]].forEach(function (p) { urn(p[0], p[1], p[2]); });
  fallenColumn(-30, 0, 30, 0.4);
  fallenColumn(32, 0, -28, 1.9);
  fallenColumn(-6, 4, -20, 0);
  fallenColumn(10, 8, 9, Math.PI / 2);

  /* --- 角落里的藤蔓与树 ---------------------------------------- */
  [[-38, -38], [38, -38], [-38, 38], [38, 38], [-20, -44], [20, 44]].forEach(function (p, i) {
    cyl(p[0], 0, p[1], 0.9, 7 + (i % 3), { ink: INK.GREEN });
    sphere(p[0], 8.4 + (i % 3), p[1], 3.4, { ink: INK.GREEN });
    sphere(p[0] + 2, 7.2 + (i % 3), p[1] - 1.6, 2.4, { ink: INK.GREEN });
  });
  birds(3, 34, 20, { hStep: 5, speed: 0.09 });

  /* --- 刷怪 / 狙击位 / 弹药 ------------------------------------ */
  [[0, 0, 50], [0, 0, -50], [-50, 0, 0], [50, 0, 0],
   [-34, 0, -34], [34, 0, -34], [-34, 0, 34], [34, 0, 34],
   [0, 4, -20], [0, 4, 20], [-20, 4, 0], [20, 4, 0],
   [-52, CLO, 0], [52, CLO, 0], [0, CLO, -52], [0, CLO, 52]
  ].forEach(function (p) { spawn(p[0], p[1], p[2]); });

  [[0, 16, 0], [-8, 12, -8], [8, 12, 8], [-52, CLO, 24], [52, CLO, -24],
   [-14, 8, 0], [14, 8, 0], [0, 8, -14]
  ].forEach(function (p) { sniper(p[0], p[1], p[2]); });

  [[0, 16, 0], [-26, 0, 0], [26, 0, 0], [0, 0, -26], [0, -3, 33],
   [-52, CLO, -34], [52, CLO, 34], [-52, TOWER, 52], [52, TOWER, -52],
   [0, 8, 12], [0, 8, -12], [-40, 0, 40]
  ].forEach(function (p) { pickup(p[0], p[1], p[2]); });

  [[0, 0, 50], [0, 0, -50], [-50, 0, 0], [50, 0, 0],
   [-36, 0, 36], [36, 0, -36], [-36, 0, -36], [36, 0, 36],
   [0, 16, 0], [-9, 8, 9], [9, 8, -9], [0, 4, 20],
   [-52, TOWER, -52], [52, TOWER, 52], [-52, TOWER, 52], [52, TOWER, -52],
   [-52, CLO, 8], [52, CLO, -8], [0, -3, 33], [0, CLO, -52]
  ].forEach(function (p) { L.arenaSpawns.push(new THREE.Vector3(p[0], p[1], p[2])); });

  return kit.finish();
}

register(
  { key: 'station', name: 'DOODLE STATION', blurb: 'platforms, footbridges and parked trains' },
  buildStation
);
register(
  { key: 'temple', name: 'DOODLE TEMPLE', blurb: 'a stepped pyramid, cloisters and a sunken pool' },
  buildTemple
);
