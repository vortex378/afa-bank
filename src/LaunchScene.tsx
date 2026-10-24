import { useEffect, useRef } from "react";
import { useReducedMotion, type MotionValue } from "motion/react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
/** Procedural simulation engine: no downloaded assets or external services. */
export default function LaunchScene({
  progress,
}: {
  progress?: MotionValue<number>;
}) {
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
    renderer.setClearColor(0x050a10, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
    camera.position.set(0, 0.35, 8.4);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    const world = new THREE.Group();
    scene.add(world);
    scene.add(new THREE.AmbientLight(0xbdd9f9, 1.5));
    const lights = [
      new THREE.PointLight(0x7ddcfa, 90),
      new THREE.PointLight(0xff496e, 65),
      new THREE.PointLight(0xd4ffc0, 45),
    ];
    lights[0].position.set(3, 2, 4);
    lights[1].position.set(-3, -1, 2);
    lights[2].position.set(0, 4, -2);
    lights.forEach((l) => scene.add(l));
    const metal = new THREE.MeshStandardMaterial({
      color: 0xb0c5d1,
      metalness: 1,
      roughness: 0.18,
    });
    const sculpture = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.93, 0.29, 200, 24, 2, 3),
      metal,
    );
    world.add(sculpture);
    const shell = new THREE.Group();
    world.add(shell);
    const plateGeometry = new THREE.BoxGeometry(0.15, 0.045, 0.46);
    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0x7795a9,
      metalness: 0.9,
      roughness: 0.3,
    });
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * Math.PI * 2;
      const plate = new THREE.Mesh(plateGeometry, plateMaterial);
      plate.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0);
      plate.rotation.z = a;
      plate.rotation.x = 0.3;
      shell.add(plate);
    }
    shell.rotation.set(0.45, 0.25, 0.3);
    const rings: THREE.Mesh[] = [];
    [1.8, 2.08, 2.48].forEach((r, i) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(r, i === 0 ? 0.013 : 0.008, 6, 160),
        new THREE.MeshBasicMaterial({
          color: [0xd5f5ef, 0x6bc4ff, 0xeb6c89][i],
          transparent: true,
          opacity: i === 0 ? 0.9 : 0.5,
        }),
      );
      m.rotation.set(0.4 + i * 0.4, 0.25 + i * 0.6, i * 0.5);
      rings.push(m);
      world.add(m);
    });
    const paths: THREE.Line[] = [];
    for (let i = 0; i < 10; i++) {
      const pts = [];
      for (let j = 0; j <= 80; j++) {
        const a = (j / 80) * Math.PI * 2;
        const r = 2.65 + Math.sin(a * 3 + i) * 0.08;
        pts.push(
          new THREE.Vector3(
            Math.cos(a) * r,
            Math.sin(a) * r * 0.78,
            Math.sin(a * 2 + i * 0.4) * 0.45,
          ),
        );
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color: i % 2 ? 0x54abcb : 0x95b0c9,
          transparent: true,
          opacity: 0.035,
        }),
      );
      line.rotation.y = i * 0.1;
      paths.push(line);
      world.add(line);
    }
    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      positions[i * 3] = Math.sin(i * 127.1) * 8;
      positions[i * 3 + 1] = Math.cos(i * 311.7) * 5;
      positions[i * 3 + 2] = Math.sin(i * 74.7) * 5 - 2;
    }
    pointsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const dust = new THREE.Points(
      pointsGeometry,
      new THREE.PointsMaterial({
        color: 0xb3d7e7,
        size: 0.017,
        transparent: true,
        opacity: 0.55,
      }),
    );
    scene.add(dust);
    const satelliteGeometry = new THREE.SphereGeometry(0.034, 8, 8);
    const satellites: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(
        satelliteGeometry,
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xa2eaff : 0xff728d }),
      );
      world.add(m);
      satellites.push(m);
    }
    let x = 0,
      y = 0,
      time = 0,
      frame = 0,
      visible = true,
      lastDraw = 0,
      lost = false,
      dirty = true;
    const move = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      x = (e.clientX - b.left) / Math.max(b.width, 1) - 0.5;
      y = (e.clientY - b.top) / Math.max(b.height, 1) - 0.5;
    };
    const leave = () => {
      x = 0;
      y = 0;
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    const resize = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height, false);
      dirty = true;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(el);
    const contextLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      el.classList.remove("webgl-ready");
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || !visible || lost || (reduced && !dirty)) return;
      if (now - lastDraw < 1000 / (el.clientWidth < 500 ? 30 : 60)) return;
      const delta = lastDraw ? Math.min((now - lastDraw) / 1000, 0.05) : 0;
      lastDraw = now;
      dirty = false;
      if (!reduced) time += delta;
      const p = reduced ? 0 : Math.min(1, Math.max(0, progress?.get() || 0));
      const targetX = reduced ? 0.12 : y * 0.2 + 0.12;
      const targetY = reduced ? -0.2 : x * 0.32 - 0.2 + p * 0.7;
      world.rotation.x = reduced
        ? targetX
        : world.rotation.x + (targetX - world.rotation.x) * 0.045;
      world.rotation.y = reduced
        ? targetY
        : world.rotation.y + (targetY - world.rotation.y) * 0.045;
      world.position.y = Math.sin(time * 0.6) * 0.08;
      sculpture.rotation.set(time * 0.12 + 0.4, time * 0.15 - 0.4, time * 0.08);
      sculpture.scale.setScalar(1 + Math.sin(time * 0.8) * 0.025);
      shell.rotation.z = time * 0.06 + 0.3;
      shell.rotation.y = 0.3 + Math.sin(time * 0.25) * 0.15 + p * 0.5;
      rings.forEach((r, i) => {
        r.rotation.z = time * (i % 2 ? -0.09 : 0.07) + i * 0.5;
        r.rotation.y = 0.3 + i * 0.6 + Math.sin(time * 0.3 + i) * 0.12;
      });
      satellites.forEach((m, i) => {
        const a = time * 0.18 + i * 1.256;
        m.position.set(
          Math.cos(a) * 2.48,
          Math.sin(a) * 1.95,
          Math.sin(a * 2) * 0.45,
        );
      });
      camera.position.z = 8.4 - p * 0.65;
      dust.rotation.y = time * 0.012;
      renderer.render(scene, camera);
      el.classList.add("webgl-ready");
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh ||
          o instanceof THREE.Points ||
          o instanceof THREE.Line
        ) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      el.classList.remove("webgl-ready");
    };
  }, [reduced, progress]);
  return (
    <div className="portal-scene" ref={host} aria-hidden="true">
      <div className="portal-scene-fallback">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
