"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const Pokemon3DViewer = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let isMounted = true;
    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = null; 

    // Camera
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 4;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    // Model
    const geometry = new THREE.TorusKnotGeometry(1.2, 0.35, 100, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xb82e2e, roughness: 0.4, metalness: 0.2 });
    const model = new THREE.Mesh(geometry, material);
    scene.add(model);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);

    // Interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (event: MouseEvent) => {
        isDragging = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseMove = (event: MouseEvent) => {
        if (!isDragging) return;
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };

        model.rotation.y += deltaMove.x * 0.01;
        model.rotation.x += deltaMove.y * 0.01;

        previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = () => {
        isDragging = false;
    };
    
    currentMount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const animate = () => {
      if (!isMounted) return;
      requestAnimationFrame(animate);
      if (!isDragging) {
        model.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (currentMount) {
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      currentMount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if(renderer.domElement.parentElement === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing rounded-lg" />;
};

export default Pokemon3DViewer;
