"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Loader2 } from 'lucide-react';

type Pokemon3DViewerProps = {
  modelUrl: string;
  name: string;
};

type LoadStatus = 'loading' | 'loaded' | 'error';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

const Pokemon3DViewer = ({ modelUrl, name }: Pokemon3DViewerProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [progress, setProgress] = useState(0);

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
    const clock = new THREE.Clock();

    // Model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (!isMounted) return;
        const model = gltf.scene;

        // Center the model and frame the camera so every Pokémon fits the view.
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

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
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
      mixer?.update(delta);
      if (pointers.size === 0) {
        pivot.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      updateCameraDistance();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
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

  return (
    <div className="relative w-full h-full min-h-[300px]">
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
  );
};

export default Pokemon3DViewer;
