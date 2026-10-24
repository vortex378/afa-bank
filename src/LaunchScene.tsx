import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
/** Local, procedural 3D asset. No external models, trackers or textures. */
export default function LaunchScene() {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.4, 8.2);
    const world = new THREE.Group();
    scene.add(world);
    scene.add(new THREE.AmbientLight(0x719bd7, 2));
    const blue = new THREE.PointLight(0x438bff, 80);
    blue.position.set(3, 2, 3);
    scene.add(blue);
    const red = new THREE.PointLight(0xff475e, 70);
    red.position.set(-3, -1, 2);
    scene.add(red);
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 0),
      new THREE.MeshStandardMaterial({
        color: 0x18345e,
        metalness: 0.82,
        roughness: 0.22,
        flatShading: true,
      }),
    );
    world.add(core);
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.075, 0),
      new THREE.MeshBasicMaterial({
        color: 0xb7d9ff,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      }),
    );
    world.add(wire);
    const rings: THREE.Mesh[] = [];
    [1.65, 2.05, 2.48].forEach((radius, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, i === 1 ? 0.025 : 0.012, 8, 160),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? 0xf56579 : 0x679fff,
          transparent: true,
          opacity: 0.8,
        }),
      );
      ring.rotation.set(0.75 + i * 0.5, 0.5 + i * 0.6, i);
      world.add(ring);
      rings.push(ring);
    });
    const satellites: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.09),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x70b4ff : 0xff6c82 }),
      );
      world.add(m);
      satellites.push(m);
    }
    const positions = new Float32Array(300 * 3);
    for (let i = 0; i < positions.length; i++)
      positions[i] = Math.sin(i * 127.1 + 311.7) * 7;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x8facd6,
        size: 0.018,
        transparent: true,
        opacity: 0.65,
      }),
    );
    scene.add(dust);
    let x = 0,
      y = 0,
      frame = 0,
      time = 0,
      visible = true;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width - 0.5;
      y = (e.clientY - r.top) / r.height - 0.5;
    };
    el.addEventListener("pointermove", move);
    const resize = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(el);
    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || !visible) return;
      time += reduced ? 0 : 0.004;
      world.rotation.y += ((reduced ? 0 : x * 0.22) - world.rotation.y) * 0.025;
      world.rotation.x += ((reduced ? 0 : y * 0.15) - world.rotation.x) * 0.025;
      core.rotation.y = wire.rotation.y = time * 0.5;
      core.rotation.z = wire.rotation.z = 0.15;
      rings.forEach((r, i) => {
        r.rotation.z = time * (i % 2 ? -0.35 : 0.3) + i;
      });
      satellites.forEach((m, i) => {
        const a = time * 0.5 + (i * Math.PI) / 4;
        m.position.set(
          Math.cos(a) * 2.48,
          Math.sin(a) * 1.6,
          Math.sin(a * 2) * 0.6,
        );
      });
      dust.rotation.y = time * 0.04;
      renderer.render(scene, camera);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      el.removeEventListener("pointermove", move);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reduced]);
  return (
    <div className="portal-scene" ref={host} aria-hidden="true">
      <div className="portal-scene-fallback" />
    </div>
  );
}
