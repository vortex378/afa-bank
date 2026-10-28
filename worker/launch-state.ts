type Row = Record<string, any>;
import { problem } from "./launch-policy";
import { phaseTwoSnapshot } from "./phase-two";
type Actor = { id: string; role: string };
/** Private in-memory cache owned by the authenticated synchronization DO. Never a CDN cache. */
export class LaunchSnapshots {
  private epoch = 0;
  private bases = new Map<string, { at: number; promise: Promise<any> }>();
  private transactions = new Map<string, Promise<Row[]>>();
  private responses = new Map<
    string,
    { at: number; text: string; presence: boolean }
  >();
  private responseBytes = 0;
  constructor(private db: D1Database) {}
  invalidate() {
    this.epoch++;
    this.bases.clear();
    this.transactions.clear();
    this.responses.clear();
    this.responseBytes = 0;
  }
  private async base(wanted: string) {
    const hit = this.bases.get(wanted);
    if (hit && performance.now() - hit.at < 5000) return hit.promise;
    if (this.bases.size > 30) this.bases.clear();
    const promise = (async () => {
      const r = await (
        wanted
          ? this.db
              .prepare("SELECT * FROM launch_rounds WHERE id=?")
              .bind(wanted)
          : this.db.prepare(
              "SELECT * FROM launch_rounds ORDER BY created_at DESC,rowid DESC LIMIT 1",
            )
      ).first<Row>();
      if (!r) return null;
      if (r.level === 2) return { r, phaseTwo: true };
      const q = (s: string) => this.db.prepare(s).bind(r.id);
      const rows = await this.db.batch([
        q(
          "SELECT p.*,u.name,u.status,u.role FROM launch_players p JOIN users u ON u.id=p.user_id WHERE p.round_id=? ORDER BY p.joined_at",
        ),
        q("SELECT * FROM launch_wallets WHERE round_id=?"),
        q(
          "SELECT * FROM launch_evidence WHERE round_id=? ORDER BY occurred_at,ref",
        ),
        q("SELECT * FROM launch_pins WHERE round_id=?"),
        q(
          "SELECT * FROM (SELECT n.id,n.team,n.body,n.created_at,u.name,ROW_NUMBER() OVER(PARTITION BY n.team ORDER BY n.created_at DESC,n.rowid DESC) AS rn FROM launch_notes n JOIN users u ON u.id=n.actor WHERE n.round_id=?) WHERE rn<=80",
        ),
        q(
          "SELECT * FROM (SELECT *,ROW_NUMBER() OVER(PARTITION BY team ORDER BY submitted_at DESC,rowid DESC) AS rn FROM launch_reports WHERE round_id=?) WHERE rn<=20 ORDER BY submitted_at DESC",
        ),
        q("SELECT * FROM launch_verdicts WHERE round_id=?"),
        q(
          "SELECT e.id,e.event,e.created_at,u.name FROM launch_events e LEFT JOIN users u ON u.id=e.actor WHERE round_id=? ORDER BY e.id DESC LIMIT 50",
        ),
        this.db.prepare(
          "SELECT id,title,stage,created_at FROM launch_rounds ORDER BY created_at DESC LIMIT 20",
        ),
        q("SELECT answer,debrief FROM launch_round_cases WHERE round_id=?"),
      ]);
      return {
        r,
        players: rows[0].results as Row[],
        wallets: rows[1].results as Row[],
        evidence: rows[2].results,
        pins: rows[3].results as Row[],
        notes: rows[4].results as Row[],
        reports: rows[5].results as Row[],
        verdict: rows[6].results[0] as Row | undefined,
        events: rows[7].results,
        history: rows[8].results,
        assessment: rows[9].results[0] as Row | undefined,
      };
    })();
    this.bases.set(wanted, { at: performance.now(), promise });
    promise.catch(() => this.bases.delete(wanted));
    return promise;
  }
  async response(actor: Actor, wanted: string, connected: string[]) {
    const key = wanted + ":" + actor.id + ":" + actor.role;
    let hit = this.responses.get(key);
    if (!hit || performance.now() - hit.at >= 5000) {
      const before = this.epoch,
        data = await this.get(actor, wanted, connected);
      const { connected: _, serverNow: __, ...fields } = data;
      hit = {
        at: performance.now(),
        text: JSON.stringify(fields).slice(0, -1),
        presence:
          !!data.manager || !!data.player || data.round?.stage === "lobby",
      };
      const size = hit.text.length * 2;
      if (this.responses.size > 250 || this.responseBytes + size > 16000000) {
        this.responses.clear();
        this.responseBytes = 0;
      }
      if (before === this.epoch && size < 16000000) {
        this.responses.set(key, hit);
        this.responseBytes += size;
      }
    }
    return new Response(
      hit.text +
        ',"connected":' +
        JSON.stringify(hit.presence ? connected : []) +
        ',"serverNow":' +
        Date.now() +
        "}",
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  async recipient(actor: Actor, round: string, iban: string) {
    const b = await this.base(round);
    if (b?.phaseTwo) problem("Use the Phase 2 workspace for this round.", 409);
    const p = b?.players.find((v: Row) => v.user_id === actor.id);
    if (actor.role !== "customer" || !p)
      problem("Enrolled student required.", 403);
    if (!["banking", "investigation"].includes(b.r.stage))
      problem("This action is unavailable in the current stage.", 409);
    const w = b.wallets.find((v: Row) => v.iban === iban),
      target = b.players.find((v: Row) => v.user_id === w?.user_id);
    if (
      !w ||
      !target ||
      target.status !== "active" ||
      target.role !== "customer" ||
      !target.terms_at
    )
      problem("No active participant found for that Demo IBAN.", 404);
    if (w.user_id === actor.id) problem("That is your own account.");
    return { id: w.id, name: w.name, iban: w.iban };
  }
  async get(actor: Actor, wanted: string, connected: string[]): Promise<Row> {
    let b: any;
    for (let i = 0; i < 4; i++) {
      const before = this.epoch;
      b = await this.base(wanted);
      if (before === this.epoch) break;
    }
    const manager = ["owner", "admin"].includes(actor.role),
      owner = actor.role === "owner";
    if (!b) return { round: null, manager, owner, serverNow: Date.now() };
    if (b.phaseTwo) return phaseTwoSnapshot(this.db, b.r, actor, connected);
    const { r } = b,
      p = b.players.find((v: Row) => v.user_id === actor.id),
      permitted = manager || !!p || r.stage === "lobby";
    const caseOpen =
      ["investigation", "review", "completed"].includes(r.stage) &&
      (manager || !!p);
    const wallet = p
      ? b.wallets.find((w: Row) => w.user_id === actor.id) || null
      : null;
    let tx: Row[] = [];
    if (wallet) {
      const key = r.id + ":" + r.version + ":" + actor.id;
      let promise = this.transactions.get(key);
      if (!promise) {
        if (this.transactions.size > 500) this.transactions.clear();
        promise = this.db
          .prepare(
            "SELECT t.*,s.name AS sender_name,r.name AS recipient_name FROM launch_transactions t LEFT JOIN launch_wallets s ON s.id=t.sender JOIN launch_wallets r ON r.id=t.recipient WHERE t.round_id=? AND (t.sender=? OR t.recipient=?) ORDER BY t.created_at DESC,t.rowid DESC LIMIT 100",
          )
          .bind(r.id, wallet.id, wallet.id)
          .all<Row>()
          .then((v) => v.results);
        this.transactions.set(key, promise);
        promise.catch(() => this.transactions.delete(key));
      }
      tx = await promise;
    }
    const publicPlayers = permitted
      ? b.players.map((v: Row) => ({
          user_id: v.user_id,
          team: v.team,
          ready: v.ready,
          terms_at: v.terms_at,
          name: v.name,
          status: v.status,
          role: v.role,
        }))
      : [];
    // Role decisions are repeated per request using the actor authenticated by the outer Worker.
    return {
      round: r,
      manager,
      owner,
      player: p
        ? {
            round_id: p.round_id,
            user_id: p.user_id,
            team: p.team,
            ready: p.ready,
            terms_at: p.terms_at,
            terms_version: p.terms_version,
            joined_at: p.joined_at,
          }
        : null,
      players: publicPlayers,
      connected: permitted ? connected : [],
      wallet,
      transactions: tx,
      evidence: caseOpen ? b.evidence : [],
      pins: p && caseOpen ? b.pins.filter((v: Row) => v.team === p.team) : [],
      notes:
        p && caseOpen
          ? b.notes
              .filter((v: Row) => v.team === p.team)
              .map(({ id, body, created_at, name }: Row) => ({
                id,
                body,
                created_at,
                name,
              }))
          : [],
      reports: (manager
        ? b.reports
        : p
          ? b.reports.filter((v: Row) => v.team === p.team)
          : []
      ).map((v: Row) => ({ ...v, payload: JSON.parse(v.payload) })),
      verdict:
        b.verdict && (manager || (!!p && r.stage === "completed"))
          ? { ...b.verdict, grades: JSON.parse(b.verdict.grades) }
          : null,
      eligible: manager
        ? b.wallets.flatMap((w: Row) => {
            const v = b.players.find((v: Row) => v.user_id === w.user_id);
            return v?.role === "customer" && v.status === "active" && v.terms_at
              ? [{ id: w.id, name: w.name, balance: w.balance, team: v.team }]
              : [];
          })
        : [],
      beneficiary:
        manager || caseOpen
          ? b.wallets.find((w: Row) => w.user_id === null) || null
          : null,
      events: manager ? b.events : [],
      history: manager ? b.history : [],
      debrief:
        r.stage === "completed" && (manager || !!p)
          ? b.assessment
            ? JSON.parse(b.assessment.debrief)
            : {
                mechanism:
                  "This public legacy exercise was retired before private assessments were introduced.",
                lesson:
                  "Open a new privately configured round for classroom use.",
                refs: [],
              }
          : null,
      answerKey:
        owner && caseOpen && b.assessment
          ? JSON.parse(b.assessment.answer)
          : null,
      serverNow: Date.now(),
    };
  }
}
