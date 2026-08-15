"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function createTingStarShape() {
    const shape = new THREE.Shape();
    const points = 16;
    const outer = 1.1;
    const inner = 0.42;

    for (let i = 0; i < points; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }

    shape.closePath();
    return shape;
}

export function TechHeroScene() {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
        camera.position.set(0, 0.7, 8.4);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        const group = new THREE.Group();
        scene.add(group);

        const ambient = new THREE.AmbientLight(0xffffff, 0.72);
        scene.add(ambient);

        const key = new THREE.PointLight(0x8b5cf6, 5.8, 18);
        key.position.set(-3.6, 3.2, 5);
        scene.add(key);

        const cyan = new THREE.PointLight(0x22d3ee, 4.2, 16);
        cyan.position.set(3.4, -1.8, 4.4);
        scene.add(cyan);

        const starGeometry = new THREE.ExtrudeGeometry(createTingStarShape(), {
            depth: 0.22,
            bevelEnabled: true,
            bevelThickness: 0.08,
            bevelSize: 0.08,
            bevelSegments: 6,
        });
        starGeometry.center();

        const star = new THREE.Mesh(
            starGeometry,
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                metalness: 0.08,
                roughness: 0.22,
                clearcoat: 0.8,
                clearcoatRoughness: 0.15,
            })
        );
        star.scale.setScalar(1.12);
        star.rotation.set(-0.18, 0.32, 0.1);
        group.add(star);

        const core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.95, 3),
            new THREE.MeshPhysicalMaterial({
                color: 0x8b5cf6,
                transparent: true,
                opacity: 0.16,
                metalness: 0.18,
                roughness: 0.18,
                transmission: 0.18,
                thickness: 1.6,
                wireframe: true,
            })
        );
        group.add(core);

        const innerHalo = new THREE.Mesh(
            new THREE.RingGeometry(2.18, 2.23, 160),
            new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
        );
        innerHalo.rotation.x = 0.22;
        group.add(innerHalo);

        const rings = [
            { radius: 2.65, color: 0x8b5cf6, x: 1.15, y: 0.25, z: 0.08 },
            { radius: 3.12, color: 0x22d3ee, x: -0.72, y: 1.05, z: -0.28 },
            { radius: 3.55, color: 0xf472b6, x: 0.25, y: -0.84, z: 0.48 },
        ].map((ring) => {
            const mesh = new THREE.Mesh(
                new THREE.TorusGeometry(ring.radius, 0.012, 16, 220),
                new THREE.MeshBasicMaterial({
                    color: ring.color,
                    transparent: true,
                    opacity: 0.5,
                })
            );
            mesh.rotation.set(ring.x, ring.y, ring.z);
            group.add(mesh);
            return mesh;
        });

        const rayGroup = new THREE.Group();
        group.add(rayGroup);
        const rayGeometries: THREE.BufferGeometry[] = [];
        const rayMaterials: THREE.LineBasicMaterial[] = [];
        const pulseGeometry = new THREE.SphereGeometry(0.065, 10, 10);
        const pulses: Array<{
            mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
            start: THREE.Vector3;
            end: THREE.Vector3;
            phase: number;
            speed: number;
        }> = [];

        for (let index = 0; index < 16; index++) {
            const angle = (index / 16) * Math.PI * 2;
            const startRadius = 2.08 + (index % 3) * 0.12;
            const endRadius = 3.85 + (index % 4) * 0.22;
            const z = Math.sin(index * 1.7) * 0.32;
            const start = new THREE.Vector3(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius, z);
            const end = new THREE.Vector3(Math.cos(angle) * endRadius, Math.sin(angle) * endRadius, z * 0.35);
            const color = index % 3 === 0 ? 0x67e8f9 : index % 3 === 1 ? 0x8b5cf6 : 0xf472b6;
            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2 });
            rayGeometries.push(geometry);
            rayMaterials.push(material);
            rayGroup.add(new THREE.Line(geometry, material));

            if (index % 2 === 0) {
                const pulseMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
                const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
                pulse.position.copy(start);
                rayGroup.add(pulse);
                pulses.push({ mesh: pulse, start, end, phase: index / 16, speed: 0.22 + (index % 4) * 0.025 });
            }
        }

        const dotGeometry = new THREE.BufferGeometry();
        const dotCount = 520;
        const positions = new Float32Array(dotCount * 3);
        for (let i = 0; i < dotCount; i++) {
            const radius = 2.8 + Math.random() * 3.4;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72;
            positions[i * 3 + 2] = radius * Math.cos(phi);
        }
        dotGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const dots = new THREE.Points(
            dotGeometry,
            new THREE.PointsMaterial({
                color: 0xbfd7ff,
                size: 0.024,
                transparent: true,
                opacity: 0.68,
                depthWrite: false,
            })
        );
        group.add(dots);

        const resize = () => {
            const rect = mount.getBoundingClientRect();
            const width = Math.max(320, rect.width);
            const height = Math.max(320, rect.height);
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        resize();

        const observer = new ResizeObserver(resize);
        observer.observe(mount);

        let frame = 0;
        let raf = 0;
        const animate = () => {
            frame += 0.01;
            group.rotation.y = Math.sin(frame * 0.7) * 0.16;
            group.rotation.x = Math.cos(frame * 0.52) * 0.08;
            star.rotation.z += 0.0035;
            core.rotation.x += 0.002;
            core.rotation.y -= 0.003;
            rings.forEach((ring, index) => {
                ring.rotation.z += 0.0025 + index * 0.0011;
                ring.rotation.x += 0.0008;
            });
            innerHalo.rotation.z -= 0.0025;
            rayGroup.rotation.z += 0.0007;
            pulses.forEach((pulse, index) => {
                const progress = (frame * pulse.speed + pulse.phase) % 1;
                pulse.mesh.position.lerpVectors(pulse.start, pulse.end, progress);
                pulse.mesh.scale.setScalar(0.65 + Math.sin(progress * Math.PI) * 0.9);
                pulse.mesh.material.opacity = Math.sin(progress * Math.PI) * 0.95;
                if (index % 2 === 0) pulse.mesh.position.z += Math.sin(frame * 1.8 + index) * 0.003;
            });
            dots.rotation.y -= 0.0009;
            dots.rotation.x += 0.00035;
            renderer.render(scene, camera);
            raf = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
            starGeometry.dispose();
            core.geometry.dispose();
            innerHalo.geometry.dispose();
            dotGeometry.dispose();
            pulseGeometry.dispose();
            rayGeometries.forEach((geometry) => geometry.dispose());
            rayMaterials.forEach((material) => material.dispose());
            pulses.forEach((pulse) => pulse.mesh.material.dispose());
            rings.forEach((ring) => {
                ring.geometry.dispose();
                (ring.material as THREE.Material).dispose();
            });
            (star.material as THREE.Material).dispose();
            (core.material as THREE.Material).dispose();
            (innerHalo.material as THREE.Material).dispose();
            (dots.material as THREE.Material).dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
