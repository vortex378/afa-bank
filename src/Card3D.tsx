import { tr } from "./i18n";
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
function PhysicalCard({
  name,
  flipped,
  reduced,
  cinematic = false,
}: {
  name: string;
  flipped: boolean;
  reduced: boolean;
  cinematic?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((s) => s.viewport);
  const scale = Math.min(1, viewport.width / 6.25);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 640;
    const x = c.getContext("2d")!;
    const surface = x.createLinearGradient(0, 0, 1024, 640);
    surface.addColorStop(0, "#cbd5e2");
    surface.addColorStop(0.42, "#e6edf3");
    surface.addColorStop(0.62, "#a3afc2");
    surface.addColorStop(1, "#d0dae6");
    x.fillStyle = surface;
    x.fillRect(0, 0, 1024, 640);
    for (let i = 0; i < 640; i++) {
      x.strokeStyle = "rgba(255,255,255," + (0.015 + (i % 7) / 200) + ")";
      x.beginPath();
      x.moveTo(0, i);
      x.lineTo(1024, i);
      x.stroke();
    }
    x.strokeStyle = "rgba(50,75,115,.08)";
    x.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) {
      x.beginPath();
      x.ellipse(820, 335, 160 + i * 19, 95 + i * 11, -0.65, 0, Math.PI * 2);
      x.stroke();
    }
    x.fillStyle = "#182b45";
    x.font = "bold 51px Arial";
    x.fillText("AFA", 78, 105);
    x.font = "20px Arial";
    x.fillText("B A N K", 196, 104);
    x.font = "16px Arial";
    x.fillText("VIRTUAL / TITANIUM", 720, 100);
    x.font = "24px monospace";
    x.fillText("••••   ••••   ••••   2048", 78, 427);
    x.font = "17px Arial";
    x.fillText(name.toUpperCase().slice(0, 28), 78, 531);
    x.font = "14px Arial";
    x.fillText("EDUCATIONAL EDITION", 78, 565);
    x.font = "italic bold 30px Arial";
    x.fillText("afa", 873, 550);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [name]);
  useFrame((s, dt) => {
    if (!group.current) return;
    const target = flipped ? Math.PI : cinematic ? -0.27 : 0;
    group.current.position.y = reduced
      ? 0
      : Math.sin(s.clock.elapsedTime * 0.72) * (cinematic ? 0.18 : 0.055);
    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      cinematic ? -0.18 + Math.sin(s.clock.elapsedTime * 0.3) * 0.035 : -0.07,
      4,
      dt,
    );
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      target + (reduced ? 0 : s.pointer.x * 0.28),
      7,
      dt,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      reduced ? 0 : (cinematic ? 0.27 : -0.12) - s.pointer.y * 0.2,
      7,
      dt,
    );
  });
  return (
    <group ref={group} scale={scale} rotation={[-0.12, 0, -0.09]}>
      <RoundedBox args={[5.4, 3.4, 0.065]} radius={0.16} smoothness={8}>
        <meshPhysicalMaterial
          color="#9da9b8"
          metalness={0.92}
          roughness={0.2}
          clearcoat={0.35}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[5.18, 3.2]} />
        <meshPhysicalMaterial map={texture} metalness={0.72} roughness={0.28} />
      </mesh>
      <RoundedBox
        args={[0.62, 0.48, 0.025]}
        radius={0.07}
        position={[-1.9, 0.3, 0.06]}
      >
        <meshStandardMaterial color="#c6b28b" metalness={1} roughness={0.3} />
      </RoundedBox>
      {[-0.14, 0, 0.14].map((n) => (
        <mesh key={n} position={[-1.9, 0.3 + n, 0.077]}>
          <boxGeometry args={[0.57, 0.012, 0.003]} />
          <meshStandardMaterial color="#6e6454" />
        </mesh>
      ))}
      <mesh position={[-1.9, 0.3, 0.079]}>
        <boxGeometry args={[0.015, 0.45, 0.003]} />
        <meshStandardMaterial color="#6e6454" />
      </mesh>
      <mesh position={[0, 0.7, -0.038]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[5.2, 0.65]} />
        <meshStandardMaterial color="#171d27" roughness={0.6} />
      </mesh>
    </group>
  );
}
export default function Card3D({
  name = "AFA MEMBER",
  reduced = false,
  cinematic = false,
}: {
  name?: string;
  reduced?: boolean;
  cinematic?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="physical-card">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 7], fov: 36 }}
        gl={{ antialias: true, alpha: true }}
        aria-label={"Kartë virtuale AFA BANK për " + name}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 5]} intensity={3} />
        <PhysicalCard
          name={name}
          flipped={flipped}
          reduced={reduced}
          cinematic={cinematic}
        />
        <pointLight
          position={[-4, -1, 3]}
          color="#83aaff"
          intensity={cinematic ? 20 : 5}
        />
        <Environment resolution={128}>
          <Lightformer intensity={3} position={[0, 5, 2]} scale={[10, 3, 1]} />
          <Lightformer
            color="#8abaff"
            intensity={4}
            position={[-5, 0, 2]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[4, 8, 1]}
          />
          <Lightformer intensity={2} position={[4, -3, 3]} scale={[5, 2, 1]} />
        </Environment>
      </Canvas>
      <button
        className="card-flip"
        onClick={() => setFlipped(!flipped)}
        aria-label={tr("Rrotullo kartën")}
      >
        {tr("↻ ")}
        <span>{tr("Rrotullo kartën")}</span>
      </button>
    </div>
  );
}
