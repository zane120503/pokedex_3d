import * as THREE from 'three';

// Live fire for Pokémon whose model has fire meshes. Two kinds:
// - A small flame on its own bone chain (Charmander's tail) is a static glowing lump in the
//   model, so it is hidden and replaced by a rising, flickering particle plume.
// - Fire spread over the body (Ponyta's mane, Moltres's wings) keeps its textured mesh and
//   gets embers rising from its surface, so the shape of the fire is preserved.

const PLUME_PARTICLES = 160;
const EMBER_PARTICLES = 220;
const FIRE_PATTERN = /fire|flame/i;
// Bones of the main body; fire driven by these is part of the body, not a separate flame.
const BODY_BONE = /^(left_|right_|[lr]_?)?(head|neck|hips|waist|spine|chest|shoulder|arm|forearm|leg|thigh|hand|foot)/i;

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec4 aColor;
  uniform float uViewportHeight;
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // World-space size -> pixels, matching the perspective of the scene.
    gl_PointSize = aSize * projectionMatrix[1][1] * uViewportHeight * 0.5 / -mvPosition.z;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec4 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.25, d) * vColor.a;
    gl_FragColor = vec4(vColor.rgb, alpha);
  }
`;

// Colour over a particle's life: yellow core -> orange -> deep red tip.
const FLAME_COLORS = [new THREE.Color(1, 0.88, 0.35), new THREE.Color(1, 0.45, 0.05), new THREE.Color(0.85, 0.12, 0.02)];

function flameColor(t: number, target: THREE.Color): THREE.Color {
  if (t < 0.35) return target.lerpColors(FLAME_COLORS[0], FLAME_COLORS[1], t / 0.35);
  return target.lerpColors(FLAME_COLORS[1], FLAME_COLORS[2], (t - 0.35) / 0.65);
}

type PlumeEmitter = {
  kind: 'plume';
  bone: THREE.Object3D;
  offset: THREE.Vector3; // flame base in the bone's local space
  size: number; // flame radius in world units
  light: THREE.PointLight;
};

type EmberEmitter = {
  kind: 'embers';
  mesh: THREE.Mesh;
  vertexCount: number;
  size: number; // ember size in world units
};

type Emitter = PlumeEmitter | EmberEmitter;

export type FlameEffect = {
  update: (delta: number, time: number) => void;
  setViewportHeight: (pixels: number) => void;
  dispose: () => void;
};

function isFireMesh(mesh: THREE.Mesh): boolean {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return FIRE_PATTERN.test(mesh.name) || materials.some(m => FIRE_PATTERN.test(m.name));
}

// The bones driving a mesh that have no driving ancestor. A tail flame has a single root
// where it meets the body (e.g. the tail tip); body-wide fire has several or a body bone.
function findRootBones(skinned: THREE.SkinnedMesh): THREE.Object3D[] {
  const skinIndex = skinned.geometry.getAttribute('skinIndex');
  const skinWeight = skinned.geometry.getAttribute('skinWeight');
  const totals = new Map<number, number>();
  for (let v = 0; v < skinIndex.count; v++) {
    for (let k = 0; k < skinIndex.itemSize; k++) {
      const joint = skinIndex.getComponent(v, k);
      totals.set(joint, (totals.get(joint) ?? 0) + skinWeight.getComponent(v, k));
    }
  }
  const weighted = new Map<THREE.Object3D, number>();
  totals.forEach((weight, joint) => {
    const bone = skinned.skeleton.bones[joint];
    if (bone && weight > 0.01) weighted.set(bone, weight);
  });

  return [...weighted.keys()].filter(bone => {
    let ancestor = bone.parent;
    while (ancestor && !weighted.has(ancestor)) ancestor = ancestor.parent;
    return !ancestor;
  });
}

// Centre and radius of the mesh as it is actually drawn (after skinning), in world space.
function measureMesh(mesh: THREE.Mesh): THREE.Sphere {
  const position = mesh.geometry.getAttribute('position');
  const points: THREE.Vector3[] = [];
  for (let v = 0; v < position.count; v++) {
    points.push(mesh.getVertexPosition(v, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
  }
  return new THREE.Sphere().setFromPoints(points);
}

// `model` must already be placed in the scene with its matrices up to date.
// `bodyRadius` is the radius of the whole model, used to scale the effect.
export function createFlameEffect(model: THREE.Object3D, scene: THREE.Scene, bodyRadius: number): FlameEffect | null {
  const fireMeshes: THREE.Mesh[] = [];
  model.traverse(object => {
    if ((object as THREE.Mesh).isMesh && isFireMesh(object as THREE.Mesh)) fireMeshes.push(object as THREE.Mesh);
  });
  if (fireMeshes.length === 0) return null;

  model.updateMatrixWorld(true);
  const plumes: PlumeEmitter[] = [];
  const embers: EmberEmitter[] = [];
  for (const mesh of fireMeshes) {
    const skinned = mesh as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh) skinned.skeleton.update();
    const sphere = measureMesh(mesh);
    const roots = skinned.isSkinnedMesh ? findRootBones(skinned) : [];
    const separateFlame = roots.length === 1 && !BODY_BONE.test(roots[0].name) && sphere.radius < bodyRadius * 0.25;
    if (separateFlame) {
      const light = new THREE.PointLight(0xff7a1a, 0, sphere.radius * 12, 1);
      scene.add(light);
      plumes.push({ kind: 'plume', bone: roots[0], offset: new THREE.Vector3(), size: Math.max(sphere.radius, 1e-3), light });
      mesh.visible = false;
    } else {
      embers.push({ kind: 'embers', mesh, vertexCount: mesh.geometry.getAttribute('position').count, size: bodyRadius * 0.035 });
    }
  }

  // Each plume owns a fixed block of particles; ember particles pick a fire mesh on every
  // respawn, weighted by vertex count so bigger fires get more embers.
  const emitters: Emitter[] = [...plumes, ...embers];
  const PARTICLE_COUNT = plumes.length * PLUME_PARTICLES + (embers.length > 0 ? EMBER_PARTICLES : 0);
  const totalEmberVertices = embers.reduce((sum, e) => sum + e.vertexCount, 0);
  const pickEmber = (): number => {
    let pick = Math.random() * totalEmberVertices;
    for (let k = 0; k < embers.length; k++) {
      pick -= embers[k].vertexCount;
      if (pick <= 0) return plumes.length + k;
    }
    return emitters.length - 1;
  };

  // Per-particle state lives in typed arrays; the GPU only sees position, size and colour.
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const colors = new Float32Array(PARTICLE_COUNT * 4);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const ages = new Float32Array(PARTICLE_COUNT);
  const lifetimes = new Float32Array(PARTICLE_COUNT);
  const startSizes = new Float32Array(PARTICLE_COUNT);
  const owners = new Uint8Array(PARTICLE_COUNT);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 4));
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uViewportHeight: { value: 600 } },
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const anchor = new THREE.Vector3();
  const color = new THREE.Color();

  const respawn = (i: number) => {
    const plumeIndex = Math.floor(i / PLUME_PARTICLES);
    owners[i] = plumeIndex < plumes.length ? plumeIndex : pickEmber();
    const emitter = emitters[owners[i]];
    const s = emitter.size;

    if (emitter.kind === 'embers') {
      // Start on a random point of the fire's surface (as currently posed) and drift upwards.
      emitter.mesh.getVertexPosition(Math.floor(Math.random() * emitter.vertexCount), anchor).applyMatrix4(emitter.mesh.matrixWorld);
      positions[i * 3] = anchor.x;
      positions[i * 3 + 1] = anchor.y;
      positions[i * 3 + 2] = anchor.z;
      velocities[i * 3] = (Math.random() - 0.5) * s * 2;
      velocities[i * 3 + 1] = s * (3 + Math.random() * 3);
      velocities[i * 3 + 2] = (Math.random() - 0.5) * s * 2;
      lifetimes[i] = 0.5 + Math.random() * 0.6;
      ages[i] = 0;
      startSizes[i] = s * (0.6 + Math.random() * 0.8);
      return;
    }

    emitter.bone.localToWorld(anchor.copy(emitter.offset));
    positions[i * 3] = anchor.x + (Math.random() - 0.5) * s * 0.6;
    positions[i * 3 + 1] = anchor.y + Math.random() * s * 0.3;
    positions[i * 3 + 2] = anchor.z + (Math.random() - 0.5) * s * 0.6;
    velocities[i * 3] = (Math.random() - 0.5) * s * 0.4;
    velocities[i * 3 + 1] = s * (3.2 + Math.random() * 1.6);
    velocities[i * 3 + 2] = (Math.random() - 0.5) * s * 0.4;
    lifetimes[i] = 0.3 + Math.random() * 0.3;
    ages[i] = 0;
    startSizes[i] = s * (0.75 + Math.random() * 0.4);
  };

  // Stagger the first particles so the flame starts full instead of in one burst.
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    respawn(i);
    ages[i] = Math.random() * lifetimes[i];
  }

  return {
    update: (delta, time) => {
      const dt = Math.min(delta, 0.05);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        ages[i] += dt;
        if (ages[i] >= lifetimes[i]) respawn(i);
        const t = ages[i] / lifetimes[i];
        const s = emitters[owners[i]].size;
        // Flicker sideways like real flame licks, while narrowing towards the tip.
        const narrow = Math.max(0, 1 - 2.5 * dt);
        velocities[i * 3] = velocities[i * 3] * narrow + Math.sin(time * 9 + i) * s * 2 * dt;
        velocities[i * 3 + 2] *= narrow;
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;

        sizes[i] = startSizes[i] * (1 - t * 0.85);
        flameColor(t, color);
        colors[i * 4] = color.r;
        colors[i * 4 + 1] = color.g;
        colors[i * 4 + 2] = color.b;
        colors[i * 4 + 3] = Math.min(1, t * 10) * Math.pow(1 - t, 1.3) * 0.85; // quick fade-in, slow fade-out
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aSize.needsUpdate = true;
      geometry.attributes.aColor.needsUpdate = true;

      for (const plume of plumes) {
        plume.bone.localToWorld(plume.light.position.copy(plume.offset));
        plume.light.intensity = 2.5 + Math.sin(time * 23) * 0.5 + Math.sin(time * 37) * 0.4;
      }
    },
    setViewportHeight: pixels => {
      material.uniforms.uViewportHeight.value = pixels;
    },
    dispose: () => {
      scene.remove(points);
      plumes.forEach(plume => scene.remove(plume.light));
      geometry.dispose();
      material.dispose();
    },
  };
}
