/* Stands in for "three" in the importmap so the ad pass can be installed
   without editing game.js.
 *
 * three assigns render() on the renderer instance (inside the constructor),
 * so patching WebGLRenderer.prototype does nothing. Subclass it instead and
 * patch each instance as it is built. An explicit named export shadows the
 * matching name from `export *`, so game.js gets this class when it asks for
 * THREE.WebGLRenderer and the untouched library for everything else. */
import * as THREE from 'three-real';
import { install } from './ads.js';
import { install as installPaper } from './paper.js';

const patch = install(THREE);
const patchShader = installPaper();

class WebGLRenderer extends THREE.WebGLRenderer {
  constructor(parameters) {
    super(parameters);
    patch(this);
  }
}

/* Same shadowing trick as the renderer: game.js builds its post-processing
   material through THREE.ShaderMaterial, so this is where the page's shader
   can be edited on the way past. */
class ShaderMaterial extends THREE.ShaderMaterial {
  constructor(parameters) {
    super(patchShader(parameters));
  }
}

export * from 'three-real';
export { WebGLRenderer, ShaderMaterial };
