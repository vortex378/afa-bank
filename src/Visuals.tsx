import { tr } from "./i18n";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
const ThreeCard = lazy(() => import("./Card3D"));
export function Logo() {
  return (
    <a href="#/" className="logo" aria-label={tr("AFA BANK — Kryefaqja")}>
      <svg viewBox="0 0 44 34" fill="none" aria-hidden="true">
        <path
          d="M3 29 16 4 29 29M10 20h12M24 4h17M25 4v24M25 15h12"
          stroke="currentColor"
          strokeWidth="2.7"
        />
      </svg>
      <span>
        {tr("AFA ")}
        <b>{tr("BANK")}</b>
      </span>
    </a>
  );
}
export function Current({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={"current " + className}
      viewBox="0 0 1440 800"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={"ribbon" + id}>
          <stop stopColor="#4266c0" stopOpacity="0" />
          <stop offset=".35" stopColor="#6d9aff" />
          <stop offset=".58" stopColor="#eff8ff" />
          <stop offset="1" stopColor="#6a8fff" stopOpacity="0" />
        </linearGradient>
        <filter id={"glow" + id}>
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <path
        d="M-150 750C240 800 110 95 660 180S1160 700 1540 10"
        stroke={"url(#ribbon" + id + ")"}
        strokeWidth="22"
        opacity=".2"
        filter={"url(#glow" + id + ")"}
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
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
          stroke={"url(#ribbon" + id + ")"}
          strokeWidth={i === 0 ? 1.7 : 0.5}
          opacity={1 - i * 0.12}
        />
      ))}
      <path
        className="current-flow"
        pathLength="1"
        d="M-150 750C240 800 110 95 660 180S1160 700 1540 10"
        stroke="#d7ecff"
        strokeWidth="2"
        strokeDasharray=".09 .91"
        filter={"url(#glow" + id + ")"}
      />
      <path
        className="current-flow"
        pathLength="1"
        d="M-150 750C240 800 110 95 660 180S1160 700 1540 10"
        stroke="#d7ecff"
        strokeWidth="1.5"
        strokeDasharray=".04 .96"
      />
    </svg>
  );
}
export function StaticCard({ name = "AFA MEMBER" }: { name?: string }) {
  return (
    <div className="static-card">
      <div>
        <strong>
          {tr("AFA ")}
          <small>{tr("BANK")}</small>
        </strong>
        <span>{tr("VIRTUAL / TITANIUM")}</span>
      </div>
      <div className="chip">{tr("▥")}</div>
      <p>{tr("••••　••••　••••　2048")}</p>
      <footer>
        <span>
          {name}
          <small>{tr("EDUCATIONAL EDITION")}</small>
        </span>
        <b>{tr("afa")}</b>
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
  cinematic = false,
}: {
  name?: string;
  className?: string;
  cinematic?: boolean;
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
            <ThreeCard name={name} cinematic={cinematic} />
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
    const timer = setTimeout(onDone, 3400);
    return () => clearTimeout(timer);
  }, [onDone, reduced]);
  return (
    <motion.div
      className="intro intro-cinematic"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.04,
        filter: "blur(8px)",
        transition: { duration: 0.65 },
      }}
    >
      <button onClick={onDone}>
        {tr("Kalo hyrjen ")}
        <span>{tr("↗")}</span>
      </button>
      <div className="intro-light" />
      <motion.div
        className="intro-logo"
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.85, 1, 1, 0.75] }}
        transition={{ duration: 2.25, times: [0, 0.2, 0.65, 1] }}
      >
        <svg viewBox="0 0 180 110" fill="none">
          <motion.path
            d="M10 100 55 10 100 100M34 65h43M100 10h65M110 10v90M110 48h45"
            stroke="#c8e4ff"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.25, ease: "easeInOut" }}
          />
        </svg>
        <span>{tr("AFA BANK")}</span>
      </motion.div>
      <motion.div
        className="intro-card"
        initial={{ opacity: 0, y: 75, scale: 1.3, rotate: 12 }}
        animate={{ opacity: [0, 1, 1], y: 0, scale: 1, rotate: 0 }}
        transition={{ duration: 1.8, delay: 1.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card cinematic />
        <p>{tr("Një dimension i ri.")}</p>
      </motion.div>
      <div className="intro-loading">
        <span />
        <small>{tr("AFA EXPERIENCE / 01")}</small>
      </div>
    </motion.div>
  );
}
