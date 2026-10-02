import * as THREE from 'three';

// Some unanimated models (Sylveon) are stored in a T-pose with long ribbon feelers sticking
// straight out sideways, or across the face. This bends each long feeler chain into a flowing
// curve that trails back, away from the body, and ripples it gently so the ribbons look alive.
//
// The bows sit on the front of the body, so a ribbon must first leave its bow sideways and only
// then turn back; aiming it straight back runs it through the head or neck. The shapes below
// were tuned on Sylveon with a check that counts ribbon vertices ending up inside the body.

const FEELER_SEGMENT = /^([LR]?)Feeler([A-Z])(\d+)$/;
const MIN_SEGMENTS = 4;

type RibbonShape = {
  root: THREE.Vector3; // first segment's direction for a right-hand ribbon (x is mirrored)
  turnBack: number; // degrees each further segment turns towards the back
  curl: number; // degrees each further segment curls upwards (negative droops)
};

// Ribbons from the neck bow sweep out, back past the tail and curl up over the back.
const NECK_RIBBON: RibbonShape = { root: new THREE.Vector3(1, -0.15, -0.35), turnBack: 13, curl: 6 };
// Ribbons sharing a bow on the head fan out at different heights so they don't overlap.
const HEAD_RIBBONS: RibbonShape[] = [
  { root: new THREE.Vector3(1, 0.2, 0.3), turnBack: 20, curl: -3 },
  { root: new THREE.Vector3(1, 0.5, 0.3), turnBack: 20, curl: 3 },
];

type Ribbon = {
  bones: THREE.Object3D[];
  posed: THREE.Quaternion[]; // each bone's rotation after posing, the base for the ripple
  swayAxes: THREE.Vector3[]; // model-space bend axis, converted into each bone's local frame
  phase: number;
};

// Rotation that turns model-space `rotation` into a change of `bone.quaternion`.
function toParentSpace(bone: THREE.Object3D, model: THREE.Object3D, rotation: THREE.Quaternion) {
  const modelInverse = model.getWorldQuaternion(new THREE.Quaternion()).invert();
  const parent = modelInverse.multiply(bone.parent!.getWorldQuaternion(new THREE.Quaternion()));
  return parent.clone().invert().multiply(rotation).multiply(parent);
}

function modelPosition(object: THREE.Object3D, model: THREE.Object3D) {
  return model.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
}

function directionOf(bone: THREE.Object3D, model: THREE.Object3D) {
  const child = bone.children.find(c => (c as THREE.Bone).isBone) ?? bone.children[0];
  return modelPosition(child, model).sub(modelPosition(bone, model)).normalize();
}

// Rotate `bone` (in place) so its segment points along `target` (model space).
function aim(bone: THREE.Object3D, model: THREE.Object3D, target: THREE.Vector3) {
  const rotation = new THREE.Quaternion().setFromUnitVectors(directionOf(bone, model), target);
  bone.quaternion.premultiply(toParentSpace(bone, model, rotation));
  bone.updateMatrixWorld(true);
}

export type RibbonPose = { update: (time: number) => void };

export function createRibbonPose(model: THREE.Object3D): RibbonPose | null {
  model.updateMatrixWorld(true);

  // Collect chains: bones named e.g. LFeelerH1..H8, grouped by side + letter, in order.
  const chains = new Map<string, THREE.Object3D[]>();
  // Height of the head, used to tell ribbons on a head bow from ribbons on a neck bow.
  let headY = Infinity;
  model.traverse(object => {
    if (!(object as THREE.Bone).isBone) return;
    if (/^Head$/i.test(object.name)) headY = modelPosition(object, model).y;
    const match = object.name.match(FEELER_SEGMENT);
    if (!match) return;
    const key = match[1] + match[2];
    const chain = chains.get(key) ?? [];
    chain[Number(match[3]) - 1] = object;
    chains.set(key, chain);
  });

  const ribbons: Ribbon[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  let headRibbons = 0;
  [...chains.keys()].sort().forEach(key => {
    const bones = chains.get(key)!.filter(Boolean);
    if (bones.length < MIN_SEGMENTS) return;

    const root = bones[0];
    const start = modelPosition(root, model);
    // Which side the ribbon belongs to: where its bow is, or (for a centred bow) where it points.
    const side = Math.abs(start.x) > 0.05 ? Math.sign(start.x) : Math.sign(directionOf(root, model).x) || 1;
    const shape = start.y > headY ? HEAD_RIBBONS[headRibbons++ % HEAD_RIBBONS.length] : NECK_RIBBON;
    const target = shape.root.clone().setX(shape.root.x * side).normalize();

    aim(root, model, target);
    for (const bone of bones.slice(1)) {
      const direction = directionOf(bone, model).applyAxisAngle(up, side * THREE.MathUtils.degToRad(shape.turnBack));
      const curlAxis = new THREE.Vector3().crossVectors(direction, up).normalize();
      aim(bone, model, direction.applyAxisAngle(curlAxis, THREE.MathUtils.degToRad(shape.curl)).normalize());
    }

    // The ripple bends each segment around a fixed model-space axis (perpendicular to the
    // ribbon and the vertical), expressed in each bone's own frame.
    const swayAxisModel = new THREE.Vector3().crossVectors(target, up).normalize();
    const modelInverse = model.getWorldQuaternion(new THREE.Quaternion()).invert();
    ribbons.push({
      bones,
      posed: bones.map(b => b.quaternion.clone()),
      swayAxes: bones.map(b => {
        const toLocal = modelInverse.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())).invert();
        return swayAxisModel.clone().applyQuaternion(toLocal);
      }),
      phase: ribbons.length * 1.3,
    });
  });

  if (ribbons.length === 0) return null;

  const ripple = new THREE.Quaternion();
  return {
    update: time => {
      for (const ribbon of ribbons) {
        ribbon.bones.forEach((bone, k) => {
          // A wave travelling from the bow to the tip; larger towards the free end.
          const angle = Math.sin(time * 1.4 - k * 0.6 + ribbon.phase) * (0.025 + k * 0.006);
          bone.quaternion.copy(ribbon.posed[k]).multiply(ripple.setFromAxisAngle(ribbon.swayAxes[k], angle));
        });
      }
    },
  };
}
