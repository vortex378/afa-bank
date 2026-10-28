import { useState, type ReactNode } from "react";
import { ArrowRight, CircleHelp, MousePointer2 } from "lucide-react";
import { tr } from "./i18n";
import "./learning-help.css";
/** Actionable guidance points to the real control instead of duplicating a hidden workflow. */
export default function LearningHelp({
  title,
  text,
  targetId,
  action,
  onAction,
  children,
}: {
  title: string;
  text: string;
  targetId?: string;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const [message, setMessage] = useState("");
  function show() {
    if (onAction) {
      onAction();
      return;
    }
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) {
      setMessage("This control becomes available at the next exercise step.");
      return;
    }
    if (target.matches(":disabled")) {
      setMessage("This control is unavailable in the current exercise state.");
      return;
    }
    target.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    target.focus({ preventScroll: true });
    target.classList.remove("learning-highlight");
    requestAnimationFrame(() => target.classList.add("learning-highlight"));
    setTimeout(() => target.classList.remove("learning-highlight"), 4000);
    setMessage("The control is highlighted. Use it when you are ready.");
  }
  return (
    <aside className="learning-help" aria-label={tr("Student help")}>
      <CircleHelp size={24} />
      <div>
        <span>{tr("HELP / YOUR NEXT ACTION")}</span>
        <h3>{tr(title)}</h3>
        <p>{tr(text)}</p>
        {children}
        {message && (
          <p className="learning-help-status" role="status">
            {tr(message)}
          </p>
        )}
      </div>
      {(targetId || onAction) && (
        <button type="button" className="learning-help-action" onClick={show}>
          {targetId ? <MousePointer2 size={17} /> : <ArrowRight size={17} />}{" "}
          {tr(action || "Show me the button")}
        </button>
      )}
    </aside>
  );
}
