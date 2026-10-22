import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
const ThreeCard = lazy(() => import("./Card3D"));
export function Logo() {
  return (
    <a href="#/" className="logo" aria-label="AFA BANK — Kryefaqja">
      <svg viewBox="0 0 44 34" fill="none" aria-hidden="true">
        <path
          d="M3 29 16 4 29 29M10 20h12M24 4h17M25 4v24M25 15h12"
          stroke="currentColor"
          strokeWidth="2.7"
        />
      </svg>
      <span>
        AFA <b>BANK</b>
      </span>
    </a>
  );
}
export function Current({ className = "" }: { className?: string }) {
  return (
    <svg
      className={"current " + className}
      viewBox="0 0 1440 800"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={"ribbon" + className}>
          <stop stopColor="#355d8b" stopOpacity="0" />
          <stop offset=".3" stopColor="#8fbfff" />
          <stop offset=".6" stopColor="#d7e5fb" />
          <stop offset="1" stopColor="#598eff" stopOpacity="0" />
        </linearGradient>
        <filter id={"glow" + className}>
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <path
        d="M-150 750C240 800 110 95 660 180S1160 700 1540 10"
        stroke={"url(#ribbon" + className + ")"}
        strokeWidth="22"
        opacity=".17"
        filter={"url(#glow" + className + ")"}
      />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={
            "M-150 " +
            (750 + i * 6) +
            "C240 800 110 " +
            (95 + i * 6) +
            " 660 " +
            (180 + i * 6) +
            "S1160 700 1540 10"
          }
          stroke={"url(#ribbon" + className + ")"}
          strokeWidth={i === 0 ? 1.7 : 0.55}
          opacity={1 - i * 0.2}
        />
      ))}
    </svg>
  );
}
export function StaticCard({ name = "AFA MEMBER" }: { name?: string }) {
  return (
    <div className="static-card">
      <div>
        <strong>
          AFA <small>BANK</small>
        </strong>
        <span>VIRTUAL / TITANIUM</span>
      </div>
      <div className="chip">▥</div>
      <p>••••　••••　••••　2048</p>
      <footer>
        <span>
          {name}
          <small>EDUCATIONAL EDITION</small>
        </span>
        <b>afa</b>
      </footer>
    </div>
  );
}
class CardBoundary extends Component<
  { children: ReactNode; name?: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <StaticCard name={this.props.name} />
    ) : (
      this.props.children
    );
  }
}
export function Card({
  name,
  className = "",
}: {
  name?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    setSupported(!!canvas.getContext("webgl2"));
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={"card-stage " + className}>
      {supported && visible && !reduced ? (
        <CardBoundary name={name}>
          <Suspense fallback={<StaticCard name={name} />}>
            <ThreeCard name={name} />
          </Suspense>
        </CardBoundary>
      ) : (
        <StaticCard name={name} />
      )}
    </div>
  );
}
export function Intro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    const t = setTimeout(onDone, 2900);
    return () => clearTimeout(t);
  }, [onDone, reduced]);
  return (
    <motion.div
      className="intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <button onClick={onDone}>Kalo hyrjen ↗</button>
      <svg viewBox="0 0 180 110" fill="none">
        <motion.path
          d="M10 100 55 10 100 100M34 65h43M100 10h65M110 10v90M110 48h45"
          stroke="#b4d2ff"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
      </svg>
      <motion.p
        initial={{ opacity: 0, letterSpacing: ".6em" }}
        animate={{ opacity: 1, letterSpacing: ".3em" }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        AFA BANK
      </motion.p>
      <span>Një perspektivë e re.</span>
    </motion.div>
  );
}
