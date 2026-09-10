/* ------------------------------------------------------------------
 * Paper tweaks — strip the red margin rule
 *
 * The notebook page (grain, blue horizontal rules, red margin line) is drawn
 * by the post-processing fragment shader inside game.js, in screen space. To
 * drop the margin without touching that bundle, we intercept the shader source
 * on its way into ShaderMaterial and remove the two lines that draw it.
 *
 * The blue horizontal rules and the jungle map's green grid are untouched.
 * Flip SHOW_MARGIN back to true to restore the line.
 * ------------------------------------------------------------------ */

var SHOW_MARGIN = false;

/* The margin is the only thing tinted with this particular pink, so matching
   the mix() that applies it is enough to identify it. */
var MARGIN = /\n[^\n]*float margin = [^\n]*\n[^\n]*paper = mix\(paper, vec3\(0\.92, 0\.48, 0\.55\), margin \* 0\.55\);/;

export function install() {
  var stats = { seen: 0, stripped: 0 };
  if (typeof window !== 'undefined') window.paper = stats;
  return function patchParams(params) {
    stats.seen++;
    if (SHOW_MARGIN || !params || typeof params.fragmentShader !== 'string') return params;
    if (!MARGIN.test(params.fragmentShader)) return params;
    var out = {};
    for (var k in params) out[k] = params[k];
    out.fragmentShader = params.fragmentShader.replace(MARGIN, '');
    stats.stripped++;
    return out;
  };
}
