import http from "k6/http";
import ws from "k6/ws";
import { Counter, Rate, Trend } from "k6/metrics";
const fixture = JSON.parse(open("./artifacts/load.private.json"));
const mode = __ENV.MODE || "active";
if (!/^http:\/\/(127\.0\.0\.1|localhost):8811$/.test(fixture.origin))
  throw Error("LOCAL ONLY");
const startSeen = new Counter("start_seen"),
  startLatency = new Trend("start_signal_ms", true),
  phaseLatency = new Trend("phase_latency_ms", true),
  phaseError = new Rate("phase_errors"),
  socketError = new Rate("socket_errors"),
  opened = new Counter("socket_opened");
export const options = {
  scenarios: {
    classroom: {
      executor: "per-vu-iterations",
      vus: 150,
      iterations: 1,
      maxDuration: "110s",
    },
  },
  thresholds: {
    socket_errors: ["rate<0.01"],
    ...(mode === "signal"
      ? { start_seen: ["count==150"], start_signal_ms: ["max<5000"] }
      : {
          "phase_errors{phase:banking}": ["rate<0.01"],
          "phase_errors{phase:investigation}": ["rate<0.01"],
          "phase_latency_ms{phase:banking}": ["p(95)<2000"],
          "phase_latency_ms{phase:investigation}": ["p(95)<2000"],
        }),
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};
export default function () {
  const a = fixture.clients[__VU - 1];
  let seen = false,
    last = 0,
    lastPhase = fixture.initialStage || "lobby";
  const headers = { Origin: fixture.origin, Cookie: a.cookie };
  function read() {
    const now = Date.now();
    if (now - last < 1000) return;
    last = now;
    const r = http.get(fixture.origin + "/api/launch/state", {
      headers,
      tags: { operation: "state" },
      timeout: "15s",
    });
    let s;
    try {
      s = r.json();
    } catch {}
    const phase = s?.round?.stage || lastPhase;
    lastPhase = phase;
    if (phase === "contract" && !seen) {
      seen = true;
      startSeen.add(1);
      startLatency.add(Date.now() - (s.round.launch_at - 5000));
    }
    if (phase === "banking" || phase === "investigation") {
      phaseLatency.add(r.timings.duration, { phase });
      phaseError.add(r.status !== 200, { phase });
      // Include a real recipient lookup for each observed active bank state.
      if (r.status === 200) {
        const target = http.get(
          fixture.origin +
            "/api/launch/" +
            fixture.round +
            "/recipient?iban=" +
            encodeURIComponent(a.target),
          { headers, tags: { operation: "recipient", phase }, timeout: "15s" },
        );
        phaseLatency.add(target.timings.duration, { phase });
        phaseError.add(target.status !== 200, { phase });
      }
    }
  }
  const r = ws.connect(
    fixture.origin.replace("http:", "ws:") + "/api/launch/live",
    { headers, tags: { operation: "live" } },
    (socket) => {
      socket.on("open", () => {
        opened.add(1);
        read();
      });
      socket.on("message", (raw) => {
        let m;
        try {
          m = JSON.parse(raw);
        } catch {}
        if (m?.type === "start" && m.roundId === fixture.round && !seen) {
          seen = true;
          startSeen.add(1);
          startLatency.add(Date.now() - (m.launchAt - 5000));
        }
        read();
      });
      socket.on("error", (error) => {
        socketError.add(true);
        console.warn(
          "SOCKET_ERROR",
          String(error?.error?.() || error?.message || error),
        );
      });
      socket.setInterval(read, 2000);
      socket.setTimeout(
        () => socket.close(),
        Number(__ENV.DURATION_MS || 55000),
      );
    },
  );
  socketError.add(r?.status !== 101);
}
export function handleSummary(data) {
  return {
    [__ENV.SUMMARY_FILE || "./artifacts/k6-summary.json"]: JSON.stringify(
      data,
      null,
      2,
    ),
    stdout:
      JSON.stringify(
        {
          metrics: Object.fromEntries(
            Object.entries(data.metrics)
              .filter(([k]) => /start_|phase_|socket_|http_req_failed/.test(k))
              .map(([k, v]) => [k, v.values]),
          ),
        },
        null,
        2,
      ) + "\n",
  };
}
