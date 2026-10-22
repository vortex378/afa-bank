import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
/** Original AFA Current: a bounded, continuously flowing light sculpture. */
export default function Atmosphere({
  className = "",
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "auth" | "dashboard";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    let width = 1,
      height = 1,
      frame = 0,
      visible = true,
      t = 0,
      px = 0,
      py = 0,
      targetX = 0,
      targetY = 0;
    const scale = Math.min(window.devicePixelRatio || 1, 1.4);
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);
    const pointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      targetY = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    };
    window.addEventListener("pointermove", pointer, { passive: true });
    function draw() {
      if (!ctx || !canvas) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden || !visible) return;
      t += reduced ? 0 : 0.007;
      px += (targetX - px) * 0.025;
      py += (targetY - py) * 0.025;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.53 + px * 24,
        cy = height * 0.5 + py * 24;
      const rx = Math.min(width * 0.44, height * 0.6),
        ry = rx * 0.61;
      ctx.globalCompositeOperation = "screen";
      for (let band = 0; band < 19; band++) {
        const offset = (band - 9) * 1.8;
        ctx.beginPath();
        for (let j = 0; j <= 190; j++) {
          const u = (j / 190) * Math.PI * 2;
          const wave = Math.sin(u * 3 + t * 1.2 + band * 0.06) * rx * 0.045;
          let x = Math.cos(u) * (rx + offset + wave);
          let y = Math.sin(u) * (ry + offset) + Math.sin(u * 2 + t) * rx * 0.07;
          const z = Math.sin(u + t * 0.5);
          const xx = x * 0.86 - y * 0.5,
            yy = x * 0.5 + y * 0.86;
          const X = cx + xx,
            Y = cy + yy;
          if (j === 0) ctx.moveTo(X, Y);
          else ctx.lineTo(X, Y);
          void z;
        }
        ctx.closePath();
        const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
        g.addColorStop(0, "rgba(51,100,210,0)");
        g.addColorStop(
          0.2,
          "rgba(113,155,255," + (band % 3 === 0 ? 0.35 : 0.15) + ")",
        );
        g.addColorStop(
          0.47,
          "rgba(224,244,255," + (band === 9 ? 0.85 : 0.35) + ")",
        );
        g.addColorStop(0.68, "rgba(127,171,255,.16)");
        g.addColorStop(1, "rgba(72,98,190,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = band === 9 ? 2.5 : 0.65;
        ctx.shadowBlur = band === 9 ? 22 : 0;
        ctx.shadowColor = "#93bfff";
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      for (let n = 0; n < 3; n++) {
        const u = t * 0.55 + n * Math.PI * 0.67;
        const x = Math.cos(u) * rx,
          y = Math.sin(u) * ry + Math.sin(u * 2 + t) * rx * 0.07;
        const X = cx + x * 0.86 - y * 0.5,
          Y = cy + x * 0.5 + y * 0.86;
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, 70);
        g.addColorStop(0, "rgba(195,224,255,.25)");
        g.addColorStop(0.1, "rgba(131,177,255,.1)");
        g.addColorStop(1, "rgba(65,100,220,0)");
        ctx.fillStyle = g;
        ctx.fillRect(X - 70, Y - 70, 140, 140);
      }
    }
    draw();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      window.removeEventListener("pointermove", pointer);
    };
  }, [reduced, variant]);
  return (
    <canvas
      className={"atmosphere " + className}
      ref={ref}
      aria-hidden="true"
    />
  );
}
