import { useMemo, useState } from "react";
import {
  BookOpen,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Fingerprint,
  Pin,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";
import { tr, useLanguage } from "./i18n";
import LearningHelp from "./LearningHelp";
type RecordRow = {
  ref: string;
  category: string;
  title: string;
  body: string;
  occurred_at: number;
};
type Props = {
  records: RecordRow[];
  pins: { ref: string }[];
  selectedRef: string;
  onSelect: (ref: string) => void;
  onPin: (ref: string) => Promise<unknown>;
  onNotebook: () => void;
  onReport: () => void;
  canEdit: boolean;
  busy: boolean;
  team?: string;
  elapsed: string;
  answerKey?: { mechanism: string; requiredEvidence: string[] } | null;
};
const categories = [
  "all",
  "transactions",
  "requests",
  "authentication",
  "code",
  "policy",
];
const categoryNames: Record<string, string> = {
  all: "All evidence",
  transactions: "Transactions",
  requests: "Requests",
  authentication: "Authentication",
  code: "Code",
  policy: "Policy",
};
const steps = [
  {
    category: "transactions",
    title: "Follow the money",
    action: "Open transactions",
    hint: "Find the 10,000 ALL incident transfer. Record the recipient and its batch reference.",
  },
  {
    category: "requests",
    title: "Find the request",
    action: "Open requests",
    hint: "Match the transfer’s batch reference to a request. Identify which service and authorization it used.",
  },
  {
    category: "authentication",
    title: "Check the permission",
    action: "Open authentication",
    hint: "Open the authorization reference from the request. Compare the permissions it has with the action that occurred.",
  },
  {
    category: "code",
    title: "Explain the failed control",
    action: "Compare code and policy",
    hint: "Compare the supplied handler with the policy. Identify the check that should have prevented the action, and cite the records.",
  },
  {
    category: "report",
    title: "Build your conclusion",
    action: "Write the team report",
    hint: "Use at least three relevant pinned records to explain what happened, when it happened and how to prevent it.",
  },
];
const fieldNames: Record<string, string> = {
  transaction_id: "Transaction ID",
  sender_iban: "Sender Demo IBAN",
  recipient: "Recipient",
  amount: "Amount",
  batch_ref: "Transfer batch reference",
  service: "Executing service",
  authorization_ref: "Authorization reference",
  credential_ref: "Credential reference",
  change_ref: "Control-change reference",
  presented_audience: "Service named in the authorization",
  required_audience: "Service required for this action",
  debit_scope_present: "Permission to debit accounts",
  accepted: "Was the request accepted?",
  audience: "Intended service (audience)",
  scope: "Allowed actions (scope)",
  scopes: "Allowed actions (scopes)",
  code: "Prepared code excerpt",
  artifact: "About this training artifact",
  issued_at: "Issued at",
  expires_at: "Expires at",
  signature_valid: "Signature valid",
  generation: "Credential generation",
  status: "Status",
  event: "Event",
  note: "Note",
  result: "Result",
  rule: "Required rule",
  required_scope: "Required permission",
  current_generation: "Current generation",
  token_generation: "Token generation",
  credential_generation: "Credential generation used",
  prior_grants_invalidated: "Prior grants invalidated",
  revoked: "Revoked",
  usable_secret: "Contains a usable secret?",
  policy: "Policy",
  source: "Source",
  user: "User",
  decision: "Decision",
};
const fieldHints: Record<string, string> = {
  batch_ref: "Use this reference to connect the transfer to its request.",
  authorization_ref:
    "Open this reference to inspect the authorization used by the request.",
  credential_ref: "This is an evidence identifier, not a password.",
  presented_audience:
    "Audience identifies the service an authorization is intended for.",
  required_audience: "Compare this value with the audience actually presented.",
  debit_scope_present:
    "Scope describes permitted actions. Check whether debiting an account was allowed.",
  accepted:
    "Compare the recorded decision with the permissions and the policy.",
  code: "Read the checks in this fictional handler and compare them with the policy. This is not the live bank source code.",
};
function readBody(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return { artifact: value };
  }
}
export default function InvestigationWorkspace({
  records,
  pins,
  selectedRef,
  onSelect,
  onPin,
  onNotebook,
  onReport,
  canEdit,
  busy,
  team,
  elapsed,
  answerKey,
}: Props) {
  const language = useLanguage();
  const [filter, setFilter] = useState(
    () =>
      records.find((record) => record.ref === selectedRef)?.category ||
      "transactions",
  );
  const [search, setSearch] = useState("");
  const [guideStep, setGuideStep] = useState(() =>
    Math.max(
      0,
      steps.findIndex(
        (step) =>
          step.category ===
          records.find((record) => record.ref === selectedRef)?.category,
      ),
    ),
  );
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState(false);
  const pinned = new Set(pins.map((pin) => pin.ref));
  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (filter === "all" || record.category === filter) &&
          (JSON.stringify(record) + tr(record.title))
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [records, filter, search, language],
  );
  // Details always belong to the visible result set, including after a filter/search change.
  const selected =
    filtered.find((record) => record.ref === selectedRef) || filtered[0];
  const activeStep = steps[guideStep];
  function chooseCategory(category: string) {
    setFilter(category);
    setSearch("");
    const index = steps.findIndex((step) => step.category === category);
    if (index >= 0) setGuideStep(index);
    else if (category === "policy") setGuideStep(3);
    const first = records.find(
      (record) => category === "all" || record.category === category,
    );
    onSelect(first?.ref || "");
  }
  function chooseStep(index: number) {
    setGuideStep(index);
    if (steps[index].category !== "report")
      chooseCategory(steps[index].category);
  }
  function openReference(ref: string) {
    const target = records.find((record) => record.ref === ref);
    if (!target) return;
    setFilter(target.category);
    setSearch("");
    onSelect(ref);
    const index = steps.findIndex((step) => step.category === target.category);
    if (index >= 0) setGuideStep(index);
    requestAnimationFrame(() =>
      document.getElementById("evidence-detail")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      }),
    );
  }
  async function copyReference(ref: string) {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(ref);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className="investigation-workspace">
      <header className="investigation-heading">
        <div>
          <span className="lr-eyebrow">
            {tr("YOUR INVESTIGATION / LEVEL 01")}
          </span>
          <h1>
            {tr("Find the story.")} <em>{tr("Prove it.")}</em>
          </h1>
          <p>
            {tr(
              "Your team lost virtual money. Follow the records to explain how it happened. Start with step 1 below.",
            )}
          </p>
        </div>
        <div className="investigation-clock">
          <Clock size={18} />
          <strong>{elapsed}</strong>
          <span>{tr("since the incident")}</span>
        </div>
      </header>
      <section
        className="investigation-guide"
        aria-label={tr("Investigation guide")}
      >
        <div className="investigation-guide-title">
          <Sparkles size={19} />
          <strong>{tr("Your next move")}</strong>
          <span>{tr("Step {current} of 5", { current: guideStep + 1 })}</span>
        </div>
        <nav
          className="investigation-steps"
          aria-label={tr("Investigation steps")}
        >
          {steps.map((step, index) => (
            <button
              key={step.category}
              type="button"
              aria-current={guideStep === index ? "step" : undefined}
              onClick={() => chooseStep(index)}
            >
              <b>{index + 1}</b>
              <span>{tr(step.title)}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="investigation-guide-body">
          <div>
            <h2>{tr(activeStep.title)}</h2>
            <p>{tr(activeStep.hint)}</p>
          </div>
          <button
            type="button"
            className="lr-button primary"
            onClick={() =>
              guideStep === 4 ? onReport() : chooseCategory(activeStep.category)
            }
          >
            {tr(activeStep.action)}
            <ArrowRight size={18} />
          </button>
          {guideStep === 3 && (
            <button
              type="button"
              className="lr-button ghost"
              onClick={() => chooseCategory("policy")}
            >
              {tr("Open policy")}
              <BookOpen size={18} />
            </button>
          )}
        </div>
        <p className="guide-fair-play">
          <Shield size={14} />
          {tr(
            "The guide explains the method. Your team must interpret the evidence and write its own conclusion.",
          )}
        </p>
      </section>
      <LearningHelp
        title="Not sure where to begin?"
        text="Start with the transfer. Then open its linked batch, authorization and code records. Pin the records that support your explanation."
        action="Open the transfers"
        onAction={() => chooseStep(0)}
      >
        <div className="learning-quick-links">
          <button type="button" onClick={() => chooseStep(3)}>
            {tr("Help: show the code")}
            <ArrowRight size={15} />
          </button>
          <button type="button" onClick={onNotebook}>
            {tr("Help: open the notebook")}
            <ArrowRight size={15} />
          </button>
        </div>
      </LearningHelp>
      <div className="investigation-content">
        <aside className="evidence-navigation">
          <span className="lr-eyebrow">{tr("EVIDENCE LIBRARY")}</span>
          <nav aria-label={tr("Evidence categories")}>
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                aria-pressed={category === filter}
                onClick={() => chooseCategory(category)}
              >
                <span>{tr(categoryNames[category])}</span>
                <b>
                  {category === "all"
                    ? records.length
                    : records.filter((record) => record.category === category)
                        .length}
                </b>
              </button>
            ))}
          </nav>
          <section className="evidence-progress">
            <Pin size={22} />
            <strong>
              {pins.length}
              <small> / 3+</small>
            </strong>
            <p>{tr("relevant records pinned")}</p>
            <button
              type="button"
              className="lr-button ghost"
              onClick={onNotebook}
            >
              {tr("Open team notebook")}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="lr-button primary"
              onClick={onReport}
            >
              {tr("Write the team report")}
              <FileText size={16} />
            </button>
          </section>
        </aside>
        <div className="evidence-reader">
          <label className="evidence-search">
            <Search size={18} />
            <input
              aria-label={tr("Search case evidence")}
              placeholder={tr(
                "Search a reference, service, event or Demo IBAN…",
              )}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="evidence-reader-title">
            <h2>{tr(categoryNames[filter])}</h2>
            <span>{tr("{count} records", { count: filtered.length })}</span>
          </div>
          <div className="lr-record-list" aria-label={tr("Case records")}>
            {filtered.map((record) => (
              <button
                type="button"
                key={record.ref}
                aria-pressed={selected?.ref === record.ref}
                className={selected?.ref === record.ref ? "selected" : ""}
                onClick={() => {
                  onSelect(record.ref);
                  requestAnimationFrame(() =>
                    document
                      .getElementById("evidence-detail")
                      ?.focus({ preventScroll: true }),
                  );
                }}
              >
                <span className="record-open-icon">
                  {pinned.has(record.ref) ? (
                    <Check size={17} />
                  ) : (
                    <Fingerprint size={17} />
                  )}
                </span>
                <span>
                  <strong>{tr(record.title)}</strong>
                  <code>{record.ref}</code>
                </span>
                <time>
                  {new Date(record.occurred_at).toISOString().slice(11, 19)} UTC
                </time>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          {!selected && (
            <div className="evidence-empty">
              <Search size={30} />
              <h3>{tr("No matching records")}</h3>
              <p>{tr("Try another reference or clear the search.")}</p>
              <button
                className="lr-button ghost"
                onClick={() => {
                  setSearch("");
                  chooseCategory("all");
                }}
              >
                {tr("Show all evidence")}
              </button>
            </div>
          )}
          {selected && (
            <article
              className="evidence-detail"
              id="evidence-detail"
              tabIndex={-1}
              aria-label={tr("Selected evidence")}
            >
              <div className="evidence-detail-top">
                <div>
                  <span className="lr-pill">
                    {tr(categoryNames[selected.category])}
                  </span>
                  <h2>{tr(selected.title)}</h2>
                  <button
                    className="reference-copy"
                    type="button"
                    onClick={() => copyReference(selected.ref)}
                  >
                    <code>{selected.ref}</code>
                    <Copy size={14} />
                    <span>
                      {tr(
                        copied === selected.ref ? "Copied" : "Copy reference",
                      )}
                    </span>
                  </button>
                </div>
                {team && (
                  <button
                    id="phase1-pin-evidence"
                    type="button"
                    className={
                      "lr-button " +
                      (pinned.has(selected.ref) ? "pinned" : "primary")
                    }
                    disabled={busy || !canEdit || pinned.has(selected.ref)}
                    onClick={() => onPin(selected.ref)}
                  >
                    <Pin size={18} />
                    {tr(
                      pinned.has(selected.ref)
                        ? "Pinned to team"
                        : "Pin evidence",
                    )}
                  </button>
                )}
              </div>
              {copyError && (
                <p role="status">
                  {tr(
                    "Clipboard unavailable. Select and copy the displayed reference.",
                  )}
                </p>
              )}
              <p className="evidence-read-tip">
                {tr(
                  "Read the fields below. Click a linked reference to follow it to the next record.",
                )}
              </p>
              <dl className="lr-record-fields">
                {Object.entries(readBody(selected.body)).map(([key, value]) => {
                  const reference =
                    typeof value === "string" &&
                    records.some((record) => record.ref === value);
                  return (
                    <div
                      key={key}
                      className={key === "code" ? "evidence-code-field" : ""}
                    >
                      <dt>{tr(fieldNames[key] || key.replaceAll("_", " "))}</dt>
                      <dd>
                        {key === "code" ? (
                          <pre>{String(value)}</pre>
                        ) : reference ? (
                          <button
                            type="button"
                            className="evidence-reference"
                            onClick={() => openReference(String(value))}
                          >
                            {String(value)}
                            <ArrowRight size={15} />
                          </button>
                        ) : typeof value === "boolean" ? (
                          <span className={"evidence-boolean " + String(value)}>
                            {tr(value ? "Yes" : "No")}
                            <small>{String(value)}</small>
                          </span>
                        ) : Array.isArray(value) ? (
                          value.map((item) => String(item)).join(", ")
                        ) : typeof value === "object" && value ? (
                          JSON.stringify(value, null, 2)
                        ) : (
                          String(value ?? "—")
                        )}
                      </dd>
                      {fieldHints[key] && (
                        <p className="evidence-field-hint">
                          {tr(fieldHints[key])}
                        </p>
                      )}
                    </div>
                  );
                })}
              </dl>
              <div className="evidence-next-action">
                <div>
                  <strong>{tr("What should you do with this record?")}</strong>
                  <p>
                    {tr(
                      "Pin it if it supports your explanation. Then connect it with the next record; three arbitrary pins are not a complete investigation.",
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="lr-button ghost"
                  onClick={() => chooseStep(Math.min(4, guideStep + 1))}
                >
                  {tr("Next investigation step")}
                  <ArrowRight size={17} />
                </button>
              </div>
            </article>
          )}
          {team && (
            <LearningHelp
              title="Save this evidence for your team"
              text="Use Pin evidence to keep this record on the team board. A pin saves its reference; add your own explanation in the notebook."
              targetId="phase1-pin-evidence"
            />
          )}
          {answerKey && (
            <details className="lr-answer-key">
              <summary>{tr("Owner answer key")}</summary>
              <p>{answerKey.mechanism}</p>
              <small>
                {tr("Required evidence:")}{" "}
                {answerKey.requiredEvidence.join(", ")}
              </small>
            </details>
          )}
        </div>
      </div>
      <p className="evidence-source-note">
        <Shield size={15} />
        {tr(
          "Prepared authentication and code artifacts are fictional. Transfer records come from this round’s virtual ledger. No usable credentials are provided.",
        )}
      </p>
    </div>
  );
}
