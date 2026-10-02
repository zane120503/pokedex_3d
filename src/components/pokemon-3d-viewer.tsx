"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader2, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createFlameEffect, type FlameEffect } from '@/lib/flame-effect';
import { createRibbonPose, type RibbonPose } from '@/lib/ribbon-pose';

type Pokemon3DViewerProps = {
  modelUrl: string;
  name: string;
};

type LoadStatus = 'loading' | 'loaded' | 'error';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const CLIP_FADE_SECONDS = 0.3;
// Actions that play once and then hand back to the idle loop.
const ONE_SHOT_CLIPS = /attack|happy/i;

// Prefer a looping idle clip over whatever happens to be first in the file.
function pickDefaultClip(names: string[]): number {
  const patterns = [/^idle$/i, /wait.*loop/i, /idle/i, /wait/i];
  for (const pattern of patterns) {
    const index = names.findIndex(n => pattern.test(n));
    if (index !== -1) return index;
  }
  return 0;
}

function startAction(next: THREE.AnimationAction, previous: THREE.AnimationAction | null) {
  const oneShot = ONE_SHOT_CLIPS.test(next.getClip().name);
  if (next === previous) {
    // Re-clicking the playing action: a loop just keeps going; a one-shot replays from the
    // start without reset(), which would cancel its fade-in and make the pose jump.
    if (oneShot) {
      next.time = 0;
      next.paused = false;
    }
    return;
  }
  next.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  next.clampWhenFinished = oneShot;
  next.reset().play();
  if (previous) {
    next.crossFadeFrom(previous, CLIP_FADE_SECONDS, false);
  }
}

const Pokemon3DViewer = ({ modelUrl, name }: Pokemon3DViewerProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [clipNames, setClipNames] = useState<string[]>([]);
  const [activeClip, setActiveClip] = useState(0);
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(true);
  const actionsRef = useRef<THREE.AnimationAction[]>([]);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let isMounted = true;
    let frameId = 0;
    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = null;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);

    // Camera distance is the distance that fits the whole model in view, times the user's zoom.
    let modelRadius = 1.5;
    let zoom = 1;
    const updateCameraDistance = () => {
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const fitDistance = modelRadius / Math.sin(Math.min(verticalFov, horizontalFov) / 2);
      camera.position.z = fitDistance * zoom;
    };
    updateCameraDistance();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    currentMount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);

    // Pivot that the user rotates; the loaded model is centered inside it.
    const pivot = new THREE.Group();
    scene.add(pivot);

    let mixer: THREE.AnimationMixer | null = null;
    let flame: FlameEffect | null = null;
    let ribbons: RibbonPose | null = null;
    // Smoky auras (Gastly's gas) are a still texture in the model; scrolling it makes the gas swirl.
    const smokeMaps: THREE.Texture[] = [];
    // Gentle whole-body motion for the few models that ship without any animation.
    let sway: ((time: number) => void) | null = null;
    let animationTime = 0;
    let elapsedTime = 0;
    const clock = new THREE.Clock();

    // Model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (!isMounted) return;
        const model = gltf.scene;
        const names = gltf.animations.map(clip => clip.name);
        const defaultClip = pickDefaultClip(names);

        if (gltf.animations.length > 0) {
          const animationMixer = new THREE.AnimationMixer(model);
          mixer = animationMixer;
          actionsRef.current = gltf.animations.map(clip => animationMixer.clipAction(clip));
          startAction(actionsRef.current[defaultClip], null);
          currentActionRef.current = actionsRef.current[defaultClip];
          // Pose the model in its idle animation before measuring it: the raw rest pose can be
          // far larger (e.g. Bulbasaur's vine whips are fully extended until animated).
          animationMixer.update(0);
        } else {
          // Unanimated T-posed ribbons (Sylveon) are bent into a natural pose before measuring.
          ribbons = createRibbonPose(model);
        }

        // Center the model and frame the camera so every Pokémon fits the view.
        model.updateMatrixWorld(true);
        model.traverse(object => {
          if ((object as THREE.SkinnedMesh).isSkinnedMesh) (object as THREE.SkinnedMesh).computeBoundingBox();
        });
        const box = new THREE.Box3().setFromObject(model);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        model.position.sub(sphere.center);
        // A bounding sphere is loose around most models, so frame a bit tighter.
        modelRadius = (sphere.radius || 1) * 0.8;
        camera.near = modelRadius / 100;
        camera.far = modelRadius * 100;
        camera.updateProjectionMatrix();
        updateCameraDistance();

        pivot.add(model);

        flame = createFlameEffect(model, scene, sphere.radius || 1);
        model.traverse(object => {
          const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (!material || Array.isArray(material) || !/smoke/i.test(material.name) || !material.map) return;
          material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
          material.map.needsUpdate = true;
          // The texture is mostly white; tint it to the gas's purple and keep the body visible through it.
          material.color.set(0xa070c8);
          material.depthWrite = false;
          smokeMaps.push(material.map);
        });
        flame?.setViewportHeight(renderer.domElement.height);

        if (mixer) {
          setClipNames(names);
          setActiveClip(defaultClip);

          // When a one-shot action (attack, happy) ends, go back to idle.
          mixer.addEventListener('finished', (event) => {
            if (event.action !== currentActionRef.current) return;
            const idle = actionsRef.current[defaultClip];
            startAction(idle, event.action);
            currentActionRef.current = idle;
            setActiveClip(defaultClip);
          });
        } else {
          const restY = model.position.y;
          const bob = modelRadius * 0.03;
          sway = (time) => {
            model.position.y = restY + Math.sin(time * 1.6) * bob;
            model.rotation.z = Math.sin(time * 0.9) * 0.04;
            ribbons?.update(time);
          };
        }

        setStatus('loaded');
      },
      (event) => {
        if (isMounted && event.total > 0) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
      () => {
        if (isMounted) setStatus('error');
      }
    );

    // Interaction: drag to rotate, wheel or pinch to zoom
    const pointers = new Map<number, { x: number; y: number }>();
    let previousPinchDistance = 0;

    const zoomBy = (delta: number) => {
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * (1 + delta)));
      updateCameraDistance();
    };

    const getPinchDistance = () => {
      const [a, b] = Array.from(pointers.values());
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onPointerDown = (event: PointerEvent) => {
      currentMount.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        previousPinchDistance = getPinchDistance();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size === 1) {
        pivot.rotation.y += (event.clientX - previous.x) * 0.01;
        pivot.rotation.x += (event.clientY - previous.y) * 0.01;
      } else if (pointers.size === 2) {
        const distance = getPinchDistance();
        zoomBy((previousPinchDistance - distance) * 0.005);
        previousPinchDistance = distance;
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(Math.sign(event.deltaY) * 0.1);
    };

    currentMount.addEventListener('pointerdown', onPointerDown);
    currentMount.addEventListener('pointermove', onPointerMove);
    currentMount.addEventListener('pointerup', onPointerUp);
    currentMount.addEventListener('pointercancel', onPointerUp);
    currentMount.addEventListener('wheel', onWheel, { passive: false });

    const animate = () => {
      if (!isMounted) return;
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      elapsedTime += delta;
      if (playingRef.current) {
        animationTime += delta;
        mixer?.update(delta);
        sway?.(animationTime);
      }
      if (pointers.size === 0) {
        pivot.rotation.y += 0.003;
      }
      // The flame keeps burning while the body animation is paused.
      pivot.updateMatrixWorld(true);
      flame?.update(delta, elapsedTime);
      for (const map of smokeMaps) map.offset.set(elapsedTime * 0.02, elapsedTime * 0.05);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      updateCameraDistance();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      flame?.setViewportHeight(renderer.domElement.height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      currentMount.removeEventListener('pointerdown', onPointerDown);
      currentMount.removeEventListener('pointermove', onPointerMove);
      currentMount.removeEventListener('pointerup', onPointerUp);
      currentMount.removeEventListener('pointercancel', onPointerUp);
      currentMount.removeEventListener('wheel', onWheel);

      mixer?.stopAllAction();
      flame?.dispose();
      actionsRef.current = [];
      currentActionRef.current = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            Object.values(material).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose();
            });
            material.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  const playClip = (index: number) => {
    const next = actionsRef.current[index];
    if (!next) return;
    startAction(next, currentActionRef.current);
    currentActionRef.current = next;
    setActiveClip(index);
    if (!playingRef.current) {
      playingRef.current = true;
      setPlaying(true);
    }
  };

  const togglePlaying = () => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  };

  return (
    <div className="flex w-full h-full min-h-[300px] flex-col gap-3">
      <div className="relative w-full flex-1 min-h-[300px]">
        <div
          ref={mountRef}
          role="img"
          aria-label={`3D model of ${name}`}
          className="w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing rounded-lg touch-none"
        />
        {status === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading 3D model{progress > 0 ? `… ${progress}%` : '…'}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground">
            <p>The 3D model for {name} could not be loaded.</p>
          </div>
        )}
      </div>
      {status === 'loaded' && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlaying}
            aria-label={playing ? 'Pause animation' : 'Play animation'}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          {clipNames.length > 1 && clipNames.map((clipName, index) => (
            <Button
              key={clipName}
              variant={index === activeClip ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
              onClick={() => playClip(index)}
              aria-pressed={index === activeClip}
            >
              {clipName}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Pokemon3DViewer;
