import { useRef, type ReactNode, type MouseEvent } from "react";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
export const motionTokens = {
  entry: 0.8,
  navigation: 0.35,
  confirmation: 0.5,
  ease: [0.22, 1, 0.36, 1] as const,
};
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 35, filter: "blur(7px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay, ease: motionTokens.ease }}
    >
      {children}
    </motion.div>
  );
}
export function Magnetic({
  children,
  className = "",
  href,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 180, damping: 18 }),
    y = useSpring(0, { stiffness: 180, damping: 18 });
  function move(e: MouseEvent) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.16);
    y.set((e.clientY - r.top - r.height / 2) * 0.2);
  }
  return (
    <motion.a
      ref={ref}
      href={href}
      className={className}
      style={{ x, y }}
      onMouseMove={move}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.a>
  );
}
export function SplitTitle({
  lines,
  className = "",
}: {
  lines: string[];
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <h1 className={className}>
      {lines.map((line, i) => (
        <span className="title-mask" key={line}>
          <motion.span
            initial={reduced ? false : { y: "115%", rotate: 3 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{
              duration: 1.15,
              delay: 0.16 + i * 0.13,
              ease: motionTokens.ease,
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
