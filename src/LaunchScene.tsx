import { tr } from "./i18n";
import { useEffect, useRef } from "react";
import { useReducedMotion, type MotionValue } from "motion/react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
type Part = { position: THREE.Vector3; scale: THREE.Vector3 };
function bankParts() {
  const parts: Part[] = [];
  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) =>
    parts.push({
      position: new THREE.Vector3(x, y, z),
      scale: new THREE.Vector3(w, h, d),
    });
  for (let i = 0; i < 3; i++)
    add(0, -1.02 + i * 0.13, 0, 3.9 - i * 0.25, 0.13, 1.35 - i * 0.12);
  for (let col = 0; col < 5; col++) {
    const x = (col - 2) * 0.66;
    add(x, -0.65, 0.16, 0.42, 0.12, 0.64);
    for (let j = 0; j < 6; j++)
      add(x, -0.48 + j * 0.22, 0.16, 0.25, 0.205, 0.43);
    add(x, 0.79, 0.16, 0.42, 0.12, 0.64);
  }
  add(0, 0.93, 0, 3.55, 0.18, 0.96);
  add(0, 1.065, 0, 3.72, 0.09, 1.07);
  for (let row = 0; row < 11; row++)
    add(0, 1.15 + row * 0.072, 0, 3.35 - row * 0.3, 0.075, 0.72);
  for (let i = 0; i < 7; i++) add((i - 3) * 0.43, -0.05, -0.38, 0.41, 1.6, 0.1);
  return parts;
}
function StaticNetwork() {
  return (
    <div className="network-fallback">
      <svg viewBox="0 0 520 330" fill="none">
        <g stroke="currentColor" opacity=".45">
          <path d="m38 96 80 48 27-89 83 63-45 114-65-88-65 115m65-115 110-26 58 75m-103 39 103-39 35 72" />
          {[
            [38, 96],
            [118, 144],
            [145, 55],
            [228, 118],
            [183, 232],
            [53, 259],
            [286, 193],
          ].map(([x, y], i) => (
            <rect key={i} x={x - 8} y={y - 8} width="16" height="16" />
          ))}
        </g>
        <g stroke="currentColor" strokeWidth="2">
          <path d="m340 120 65-40 65 40H340Zm4 11h122m-115 82h110m-118 9h126m-132 10h138M355 136v71m25-71v71m25-71v71m25-71v71m25-71v71" />
        </g>
        <path d="M260 135h55m-8-8 8 8-8 8" stroke="currentColor" />
        <text
          x="362"
          y="262"
          fill="currentColor"
          stroke="none"
          fontSize="12"
          letterSpacing="3"
        >
          {tr("AFA BANK")}
        </text>
      </svg>
    </div>
  );
}
/** The same server nodes physically assemble into the Phase 1 bank. */
export default function LaunchScene({
  progress,
  launchAt,
  now: serverClock = Date.now,
}: {
  progress?: MotionValue<number>;
  launchAt?: number;
  now?: () => number;
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
    renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
    camera.position.set(0, 0.3, 8.1);
    camera.lookAt(0, 0.15, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.AmbientLight(0xb5d7e7, 1.5));
    const blue = new THREE.PointLight(0x6bddff, 65);
    blue.position.set(3, 3, 4);
    scene.add(blue);
    const red = new THREE.PointLight(0xfe607b, 38);
    red.position.set(-3, 0, 2);
    scene.add(red);
    const world = new THREE.Group();
    scene.add(world);
    const parts = bankParts();
    const n = parts.length;
    const origins = parts.map((_, i) => {
      const angle = i * 2.39996;
      const radius = 1.25 + (i % 5) * 0.34;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(i * 1.73) * 1.48,
        Math.sin(angle) * radius * 0.7,
      );
    });
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x93b6c8,
      metalness: 0.8,
      roughness: 0.24,
    });
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x8bdbef,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const bodies = new THREE.InstancedMesh(cube, bodyMat, n);
    const outlines = new THREE.InstancedMesh(cube, edgeMat, n);
    bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    outlines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    world.add(bodies, outlines);
    const shade = new THREE.Color();
    const cool = new THREE.Color(0x8ee7f3),
      hot = new THREE.Color(0xff718c),
      white = new THREE.Color(0xdcece8);
    for (let i = 0; i < n; i++) {
      outlines.setColorAt(i, i % 6 === 0 ? hot : cool);
      bodies.setColorAt(i, i % 6 === 0 ? new THREE.Color(0xa58b9b) : white);
    }
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      edges.push([i, (i + 1) % n]);
      if (i % 2 === 0) edges.push([i, (i + 11) % n]);
    }
    const linePositions = new Float32Array(edges.length * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x73c4df,
      transparent: true,
      opacity: 0.3,
    });
    const links = new THREE.LineSegments(lineGeo, lineMat);
    world.add(links);
    const packetGeo = new THREE.SphereGeometry(0.035, 8, 6);
    const packetMat = new THREE.MeshBasicMaterial({
      color: 0xd0efff,
      transparent: true,
    });
    const packets = new THREE.InstancedMesh(packetGeo, packetMat, 16);
    world.add(packets);
    const roofGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -1.75, 1.12, 0.49, 1.75, 1.12, 0.49, 0, 1.94, 0.49, -1.75, 1.12, -0.49, 0,
      1.94, -0.49, 1.75, 1.12, -0.49,
    ]);
    roofGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3),
    );
    roofGeometry.setIndex([
      0, 1, 2, 3, 4, 5, 0, 2, 4, 0, 4, 3, 1, 5, 4, 1, 4, 2, 0, 3, 5, 0, 5, 1,
    ]);
    roofGeometry.computeVertexNormals();
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb5cdc8,
      metalness: 0.72,
      roughness: 0.27,
      transparent: true,
      opacity: 0,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMat);
    world.add(roof);
    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.008, 6, 160),
      new THREE.MeshBasicMaterial({
        color: 0x7bdcca,
        transparent: true,
        opacity: 0.15,
      }),
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -1.23;
    world.add(baseRing);
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      dustPos[i * 3] = Math.sin(i * 127.1) * 7;
      dustPos[i * 3 + 1] = Math.cos(i * 311.7) * 4;
      dustPos[i * 3 + 2] = Math.sin(i * 74.7) * 5 - 2;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xa8d7dd,
        size: 0.016,
        transparent: true,
        opacity: 0.4,
      }),
    );
    scene.add(dust);
    const positions = origins.map((v) => v.clone());
    const dummy = new THREE.Object3D();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const unit = new THREE.Vector3();
    const smooth = (v: number) => {
      v = THREE.MathUtils.clamp(v, 0, 1);
      return v * v * (3 - 2 * v);
    };
    let x = 0,
      y = 0,
      time = 0,
      frame = 0,
      lastDraw = 0,
      visible = true,
      lost = false,
      dirty = true;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = (e.clientX - r.left) / Math.max(r.width, 1) - 0.5;
      y = (e.clientY - r.top) / Math.max(r.height, 1) - 0.5;
    };
    const leave = () => {
      x = 0;
      y = 0;
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    const resize = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / Math.max(r.height, 1);
      camera.updateProjectionMatrix();
      dirty = true;
    });
    resize.observe(el);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(el);
    const contextLost = (event: Event) => {
      event.preventDefault();
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
      const p = reduced
        ? launchAt
          ? 1
          : 0
        : THREE.MathUtils.clamp(
            launchAt
              ? 1 - (launchAt - serverClock()) / 5000
              : progress?.get() || 0,
            0,
            1,
          );
      const assembly = smooth((p - 0.12) / 0.77);
      for (let i = 0; i < n; i++) {
        const t = smooth((p - 0.12 - ((i % n) / n) * 0.1) / 0.68);
        const origin = origins[i];
        a.set(
          origin.x + Math.sin(time * 0.5 + i) * 0.055,
          origin.y + Math.cos(time * 0.4 + i) * 0.05,
          origin.z,
        );
        positions[i].lerpVectors(a, parts[i].position, t);
        dummy.position.copy(positions[i]);
        unit.set(
          0.16 + (i % 3) * 0.035,
          0.2 + (i % 4) * 0.045,
          0.15 + (i % 2) * 0.04,
        );
        dummy.scale.lerpVectors(unit, parts[i].scale, t);
        dummy.rotation.set(
          (1 - t) * Math.sin(time * 0.15 + i) * 0.2,
          (1 - t) * (time * 0.08 + i * 0.3),
          0,
        );
        dummy.updateMatrix();
        bodies.setMatrixAt(i, dummy.matrix);
        shade.set(i % 6 === 0 ? 0xa58b9b : 0xdcece8).lerp(white, assembly);
        bodies.setColorAt(i, shade);
        dummy.scale.multiplyScalar(1.015);
        dummy.updateMatrix();
        outlines.setMatrixAt(i, dummy.matrix);
      }
      bodies.instanceMatrix.needsUpdate = true;
      if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
      outlines.instanceMatrix.needsUpdate = true;
      edgeMat.opacity = 0.8 - assembly * 0.65;
      lineMat.opacity = 0.33 * (1 - assembly);
      roofMat.opacity = smooth((p - 0.78) / 0.2);
      roof.visible = p > 0.78;
      for (let i = 0; i < edges.length; i++) {
        const [s, e] = edges[i];
        positions[s].toArray(linePositions, i * 6);
        positions[e].toArray(linePositions, i * 6 + 3);
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.computeBoundingSphere();
      for (let i = 0; i < 16; i++) {
        const [s, e] = edges[(i * 7) % edges.length];
        a.copy(positions[s]);
        b.copy(positions[e]);
        dummy.position.lerpVectors(a, b, (time * 0.28 + i * 0.071) % 1);
        dummy.scale.setScalar(1 - assembly);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        packets.setMatrixAt(i, dummy.matrix);
      }
      packets.instanceMatrix.needsUpdate = true;
      world.rotation.y =
        (1 - assembly) * Math.sin(time * 0.12) * 0.15 -
        0.28 * assembly +
        (reduced ? 0 : x * 0.18);
      world.rotation.x = 0.08 + (reduced ? 0 : y * 0.12);
      world.position.y = -0.16 * assembly;
      camera.position.z = 8.1 - assembly * 0.4;
      dust.rotation.y = time * 0.009;
      renderer.render(scene, camera);
      el.classList.add("webgl-ready");
      const stage =
        assembly > 0.98 ? "bank" : assembly > 0.02 ? "assembling" : "network";
      if (el.dataset.assembly !== stage) el.dataset.assembly = stage;
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
          if (o instanceof THREE.InstancedMesh) o.dispose();
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      env.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      el.classList.remove("webgl-ready");
      delete el.dataset.assembly;
    };
  }, [reduced, progress, launchAt, serverClock]);
  return (
    <div
      className="portal-scene network-bank-scene"
      ref={host}
      aria-hidden="true"
    >
      <StaticNetwork />
    </div>
  );
}
