import { useSyncExternalStore } from "react";
import { Languages } from "lucide-react";
import pairs from "./translations.json";
export type Language = "sq" | "en";
const storageKey = "afa-language";
function initialLanguage(): Language {
  try {
    return localStorage.getItem(storageKey) === "en" ? "en" : "sq";
  } catch {
    return "sq";
  }
}
let language: Language = initialLanguage();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const dictionary = new Map<string, [string, string]>();
for (const [en, sq] of pairs) {
  dictionary.set(en, [en, sq]);
  dictionary.set(sq, [en, sq]);
}
/** Translate authored UI copy. Identifiers, code and original case values stay intact. */
export function tr(
  source: string,
  values: Record<string, string | number> = {},
) {
  const text = source.replace(/\s+/g, " ").trim();
  const pair = dictionary.get(text);
  let result = pair ? pair[language === "en" ? 0 : 1] : source;
  if (pair)
    result =
      (source.match(/^\s+/)?.[0] || "") +
      result +
      (source.match(/\s+$/)?.[0] || "");
  return result.replace(/\{(\w+)\}/g, (token, key) =>
    values[key] === undefined ? token : String(values[key]),
  );
}
export function setLanguage(next: Language) {
  language = next;
  try {
    localStorage.setItem(storageKey, next);
  } catch {
    /* in-memory preference still works */
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
  listeners.forEach((listener) => listener());
}
export function useLanguage() {
  return useSyncExternalStore(
    subscribe,
    () => language,
    () => "sq" as Language,
  );
}
if (typeof window !== "undefined") {
  document.documentElement.lang = language;
  window.addEventListener("storage", (event) => {
    if (
      event.key === storageKey &&
      (event.newValue === "sq" || event.newValue === "en")
    ) {
      language = event.newValue;
      document.documentElement.lang = language;
      listeners.forEach((listener) => listener());
    }
  });
}
export function LanguageSwitcher() {
  const selected = useLanguage();
  return (
    <div
      className="language-switcher"
      role="group"
      aria-label="Language / Gjuha"
    >
      <Languages size={17} aria-hidden="true" />
      <button
        type="button"
        lang="sq"
        aria-pressed={selected === "sq"}
        onClick={() => setLanguage("sq")}
      >
        Shqip
      </button>
      <button
        type="button"
        lang="en"
        aria-pressed={selected === "en"}
        onClick={() => setLanguage("en")}
      >
        English
      </button>
    </div>
  );
}
