/* ------------------------------------------------------------------
 * In-world ad posters — single-player prototype
 *
 * The game renders in two passes: the world goes into a render target as a
 * G-buffer (gl_FragColor = vec4(shade, inkId, normal.xy) — no colour channel
 * anywhere), then a fullscreen post pass turns that into paper and ink. So a
 * textured quad added to the world scene would be read as garbage shade/ink
 * data. Ads therefore render in a THIRD pass, straight to the canvas after
 * post, in their own scene.
 *
 * That pass has no depth buffer to test against (the world's depth lives in
 * the render target), so the poster shader samples the post pass's own depth
 * texture and discards fragments the world is in front of. Occlusion is
 * correct without touching the game's own rendering.
 *
 * Nothing here modifies game.js. install() is called from three-hook.js,
 * which the importmap puts in front of the real three.
 * ------------------------------------------------------------------ */

var POSTERS = [
  { url: './ads/inkwell.png',  w: 2.8 },
  { url: './ads/paperjam.png', w: 3.2 },
  { url: './ads/nib.png',      w: 2.4 },
  { url: './ads/gridline.png', w: 3.0 },
  { url: './ads/smudge.png',   w: 2.6 }
];
var CFG = {
  seed: 20260909,   // deterministic layout: same seed, same posters in the same places
  wallAds: 7,
  blend: 0.35,      // 0 = full colour, 1 = faded into the paper
  minGap: 6,        // metres between wall posters
  minSpan: 8,       // metres: a wall candidate's world-space bounding box diagonal
  tries: 900,
  budgetMs: 2,      // per-frame placement budget, so nothing ever hitches
  stillMs: 700      // a candidate must hold still this long before it counts as level geometry
};

var VERT = [
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
  '}'
].join('\n');

var FRAG = [
  'precision highp float;',
  'varying vec2 vUv;',
  'uniform sampler2D uMap;',
  'uniform sampler2D uDepth;',
  'uniform vec2 uRes;',
  'uniform float uBlend;',
  'uniform vec3 uPaper;',
  'void main() {',
  /* The world already drew into the depth texture; anything nearer than this
     fragment is in front of the poster, so drop it. */
  '  float sceneZ = texture2D(uDepth, gl_FragCoord.xy / uRes).x;',
  '  if (sceneZ < gl_FragCoord.z - 2e-5) discard;',
  '  vec4 c = texture2D(uMap, vUv);',
  '  if (c.a < 0.5) discard;',
  /* Pull the artwork toward the paper so it reads as printed on the page
     rather than pasted on top of it. */
  '  vec3 col = mix(c.rgb, uPaper * (0.35 + 0.75 * c.rgb), uBlend);',
  '  gl_FragColor = vec4(col, 1.0);',
  '}'
].join('\n');

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function install(THREE) {
  var adScene = new THREE.Scene();
  adScene.matrixAutoUpdate = false;

  var textures = {};
  var loader = new THREE.TextureLoader();
  function texture(url) {
    if (!textures[url]) {
      var t = loader.load(url);
      /* The renderer outputs linear, so hand the artwork through untouched. */
      t.colorSpace = THREE.NoColorSpace;
      t.generateMipmaps = true;
      t.anisotropy = 4;
      textures[url] = t;
    }
    return textures[url];
  }

  var uDepth = { value: null };
  var uRes = { value: new THREE.Vector2(2, 2) };
  var uPaper = { value: new THREE.Vector3(0.965, 0.955, 0.905) };
  var uBlend = { value: CFG.blend };

  function material(url) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture(url) },
        uDepth: uDepth, uRes: uRes, uPaper: uPaper, uBlend: uBlend
      },
      vertexShader: VERT, fragmentShader: FRAG,
      depthTest: false, depthWrite: false, side: THREE.DoubleSide
    });
  }

  /* ---- placement ------------------------------------------------- */

  var quad = new THREE.PlaneGeometry(1, 1);
  var ray = new THREE.Raycaster();
  var placed = [];        // { mesh }
  var signature = '';
  var enabled = true;

  /* Posters belong on the level itself and nowhere else. Enemies, props and the
     held weapon all live in the same scene as the walls, and shape alone does
     not separate them: a mesh authored large and scaled down still reports a
     big geometry bounding sphere, and an enemy that crouches, ragdolls or dies
     is briefly wider than it is tall. So a wall candidate has to pass two
     tests that no character can fake — it must be big in WORLD space (the
     object's own scale included), and it must hold still. Level geometry never
     moves; anything animated, carried or kicked around fails the second test
     and is never handed to the raycaster.

     `still` is a Map of mesh -> the world matrix it had when first seen, plus
     the time it has held that matrix. Rebuilt each sample so destroyed meshes
     fall out with the old map. */
  var _box = new THREE.Box3(), _sz = new THREE.Vector3();
  var still = new Map();
  var statics = [];

  function matrixKey(o) {
    var e = o.matrixWorld.elements, s = '';
    for (var i = 0; i < 16; i++) s += e[i].toFixed(3) + ',';
    return s;
  }

  /* One sample of the world: refresh which meshes are big, unmoving level
     geometry. Called about once a second from the render hook. */
  function sampleStatics(scene) {
    var now = performance.now(), next = new Map(), out = [];
    scene.updateMatrixWorld(true);
    scene.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || !o.geometry) return;
      var g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingBox) return;
      _box.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
      _box.getSize(_sz);
      if (_sz.length() < CFG.minSpan) return;           // too small to be a building
      var key = matrixKey(o), prev = still.get(o);
      var since = (prev && prev.key === key) ? prev.since : now;
      next.set(o, { key: key, since: since });
      if (now - since >= CFG.stillMs) out.push(o);      // has not moved: level geometry
    });
    still = next;
    statics = out;
    return out;
  }

  var _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1);
  var _p = new THREE.Vector3(), _d = new THREE.Vector3(), _o = new THREE.Vector3();

  /* Probe four points around the hit to be sure the surface is actually a flat
     wall wide enough to hold the poster, not a ledge or a railing. */
  function flatEnough(targets, point, normal, halfW, halfH) {
    var up = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    var right = new THREE.Vector3().crossVectors(up, normal).normalize();
    up = new THREE.Vector3().crossVectors(normal, right).normalize();
    var offs = [[-halfW, -halfH], [halfW, -halfH], [-halfW, halfH], [halfW, halfH]];
    for (var i = 0; i < offs.length; i++) {
      _p.copy(point).addScaledVector(right, offs[i][0] * 0.95).addScaledVector(up, offs[i][1] * 0.95);
      _p.addScaledVector(normal, 0.5);
      ray.set(_p, _d.copy(normal).negate());
      ray.near = 0; ray.far = 1.1;
      var h = ray.intersectObjects(targets, false)[0];
      if (!h || h.distance > 0.85) return false;
      _n.copy(h.face.normal).transformDirection(h.object.matrixWorld);
      if (_n.dot(normal) < 0.9) return false;
    }
    return true;
  }

  function addQuad(url, width, aspect, point, normal) {
    var h = width * aspect;
    var m = new THREE.Mesh(quad, material(url));
    m.scale.set(width, h, 1);
    _q.setFromUnitVectors(_z, normal);
    m.position.copy(point).addScaledVector(normal, 0.05);
    m.quaternion.copy(_q);
    m.updateMatrix();
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    adScene.add(m);
    var rec = { mesh: m };
    placed.push(rec);
    return rec;
  }

  function aspectOf(url) {
    var t = textures[url];
    var img = t && t.image;
    return img && img.width ? img.height / img.width : 0.66;
  }

  function clear() {
    for (var i = 0; i < placed.length; i++) adScene.remove(placed[i].mesh);
    placed.length = 0;
  }

  /* Placement is expensive on a map like the jungle: every probe raycasts the
     merged level geometry, which has no BVH, so a full pass costs hundreds of
     milliseconds. Running that inside one frame is a visible freeze, so it is
     a job that the render hook steps a couple of milliseconds at a time. */
  var job = null;

  function beginPlacement() {
    clear();
    job = {
      /* Snapshot the walls this job may use. Re-sampling mid-job could let a
         crate that happened to sit still for a second slip into the target
         list; the level geometry that passed the check when the job started is
         the only thing a poster is allowed to land on. */
      walls: statics.slice(),
      rnd: mulberry32(CFG.seed),
      used: [],
      nWall: 0, wallTries: 0
    };
    return job;
  }

  /* --- one poster probe: big merged building geometry --- */
  function tryWall(j) {
    var rnd = j.rnd;
    var art = POSTERS[Math.floor(rnd() * POSTERS.length)];
    var asp = aspectOf(art.url);
    _o.set((rnd() - 0.5) * 90, 1.6 + rnd() * 6, (rnd() - 0.5) * 90);
    var a = rnd() * Math.PI * 2;
    _d.set(Math.cos(a), (rnd() - 0.5) * 0.15, Math.sin(a)).normalize();
    ray.set(_o, _d); ray.near = 0; ray.far = 45;
    var hit = ray.intersectObjects(j.walls, false)[0];
    if (!hit || hit.distance < 2.5) return;
    _n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (Math.abs(_n.y) > 0.3) return;                   // want a wall, not a floor
    if (_n.dot(_d) > 0) _n.negate();                    // face back toward the ray
    for (var k = 0; k < j.used.length; k++) {
      if (j.used[k].distanceTo(hit.point) < CFG.minGap) return;
    }
    if (!flatEnough(j.walls, hit.point, _n, art.w / 2, art.w * asp / 2)) return;
    addQuad(art.url, art.w, asp, hit.point, _n);
    j.used.push(hit.point.clone());
    j.nWall++;
  }

  function stepPlacement(budgetMs) {
    if (!job) return;
    var j = job, t0 = performance.now(), now = t0;
    while (now - t0 < budgetMs) {
      if (j.nWall >= CFG.wallAds || j.wallTries >= CFG.tries) { job = null; return; }
      j.wallTries++; tryWall(j);
      now = performance.now();
    }
  }

  /* The map is rebuilt between runs; re-place when the level geometry changes.
     Built from the static list, so it does NOT depend on props or enemies,
     which churn constantly as things spawn and get destroyed. */
  function signatureOf() {
    var s = [];
    for (var i = 0; i < statics.length && i < 12; i++) s.push(statics[i].uuid);
    return s.join(',');
  }

  /* ---- hook the renderer ----------------------------------------- */

  /* three assigns render() on the instance inside the constructor, so the
     prototype is the wrong place to patch — three-hook.js subclasses the
     renderer and calls this on each new instance instead. */
  var worldScene = null, worldCam = null, lastCheck = 0;

  /* The ad pass runs inside the game's own render call, so an exception here
     would take the game's frame loop down with it. Catch, remember the first
     one for window.ads.diag, and fall back to rendering the frame untouched. */
  var diag = { patched: 0, frames: 0, err: null };

  function patch(renderer) {
    diag.patched++;
    var orig = renderer.render.bind(renderer);
    renderer.render = function (scene, camera) {
      diag.frames++;
      try {
        return inner(scene, camera, orig);
      } catch (e) {
        if (!diag.err) diag.err = String(e && (e.stack || e));
        return orig(scene, camera);
      }
    };
    function inner(scene, camera, orig) {
      if (camera && camera.isPerspectiveCamera && scene !== adScene) {
        worldScene = scene; worldCam = camera;
        orig(scene, camera);
        return;
      }

      orig(scene, camera);

      /* The ortho pass is the post pass; its material owns the depth texture
         and the buffer resolution we need to test occlusion against. */
      if (!camera || !camera.isOrthographicCamera || !worldScene || !enabled) return;
      var post = scene.children[0] && scene.children[0].material;
      var u = post && post.uniforms;
      if (!u || !u.tDepth) return;
      uDepth.value = u.tDepth.value;
      uRes.value.copy(u.uRes.value);
      if (u.uPaper) uPaper.value.copy(u.uPaper.value);

      var now = performance.now();
      if (now - lastCheck > 1000) {
        lastCheck = now;
        sampleStatics(worldScene);
        var sig = signatureOf();
        if (sig && sig !== signature) { signature = sig; beginPlacement(); }
      }
      stepPlacement(CFG.budgetMs);
      if (!placed.length) return;
      orig(adScene, worldCam);
    }
  }

  window.ads = {
    config: CFG,
    /* Placement is incremental now, so this starts the job rather than
       finishing it; watch ads.count() climb over the next second or two. */
    replace: function (seed) {
      if (seed != null) CFG.seed = seed;
      if (!worldScene) return null;
      sampleStatics(worldScene);
      beginPlacement();
      return 'placing';
    },
    blend: function (v) { if (v != null) uBlend.value = CFG.blend = v; return uBlend.value; },
    toggle: function (on) { enabled = on == null ? !enabled : !!on; return enabled; },
    count: function () { return placed.length; },
    list: function () {
      return placed.map(function (r) {
        var p = new THREE.Vector3().setFromMatrixPosition(r.mesh.matrix);
        return { on: 'wall', at: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)] };
      });
    },
    diag: diag,
    debug: function () {
      if (!worldScene) return { scene: false, diag: diag };
      return { scene: true, walls: sampleStatics(worldScene).length,
               tracked: still.size, placed: placed.length };
    }
  };

  return patch;
}
