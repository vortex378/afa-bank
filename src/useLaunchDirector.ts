import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./lib";
export type GameData = Record<string, any>;
export function useLaunchDirector(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<GameData>(),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [loading, setLoading] = useState(enabled);
  const selected = useRef<string | undefined>(undefined),
    anchor = useRef({ server: Date.now(), mono: performance.now() }),
    inFlight = useRef<Promise<void> | null>(null),
    queued = useRef(false),
    generation = useRef(0);
  const now = useCallback(
    () => anchor.current.server + performance.now() - anchor.current.mono,
    [],
  );
  const refresh = useCallback(
    async (round?: string) => {
      if (!enabled) return;
      if (round !== undefined) selected.current = round || undefined;
      queued.current = true;
      if (inFlight.current) return inFlight.current;
      const runGeneration = generation.current;
      const task = (async () => {
        do {
          queued.current = false;
          const sent = performance.now();
          try {
            const data = await api<GameData>(
              "launch/state" +
                (selected.current
                  ? "?round=" + encodeURIComponent(selected.current)
                  : ""),
            );
            if (generation.current !== runGeneration) return;
            const received = performance.now();
            anchor.current = {
              server: data.serverNow + (received - sent) / 2,
              mono: received,
            };
            setSnapshot(data);
            setError("");
          } catch (e: any) {
            if (generation.current === runGeneration) setError(e.message);
          } finally {
            if (generation.current === runGeneration) setLoading(false);
          }
        } while (queued.current && generation.current === runGeneration);
      })();
      inFlight.current = task;
      try {
        await task;
      } finally {
        if (inFlight.current === task) inFlight.current = null;
      }
    },
    [enabled],
  );
  useEffect(() => {
    if (!enabled) return;
    let stopped = false,
      socket: WebSocket,
      retry: ReturnType<typeof setTimeout>,
      refreshTimer: ReturnType<typeof setTimeout> | undefined,
      attempt = 0;
    const schedule = () => {
      if (!refreshTimer)
        refreshTimer = setTimeout(() => {
          refreshTimer = undefined;
          void refresh();
        }, 250);
    };
    const connect = () => {
      if (stopped) return;
      const current = new WebSocket(
        (location.protocol === "https:" ? "wss://" : "ws://") +
          location.host +
          "/api/launch/live",
      );
      socket = current;
      current.onopen = () => {
        if (stopped || current !== socket) {
          current.close();
          return;
        }
        attempt = 0;
        setConnected(true);
        schedule();
      };
      current.onmessage = (e) => {
        if (stopped || current !== socket) return;
        if (e.data === "pong") return;
        let message: any;
        try {
          message = JSON.parse(e.data);
        } catch {
          return;
        }
        if (
          message.type === "start" &&
          Number.isFinite(message.launchAt) &&
          Number.isFinite(message.serverNow)
        ) {
          anchor.current = {
            server: message.serverNow,
            mono: performance.now(),
          };
          setSnapshot((prev) =>
            prev &&
            prev.round?.id === message.roundId &&
            ["lobby", "contract"].includes(prev.round.stage)
              ? {
                  ...prev,
                  round: {
                    ...prev.round,
                    stage: "contract",
                    launch_at: message.launchAt,
                  },
                  serverNow: message.serverNow,
                }
              : prev,
          );
        }
        schedule();
      };
      current.onclose = () => {
        if (current !== socket) return;
        setConnected(false);
        if (!stopped)
          retry = setTimeout(
            connect,
            Math.min(15000, 500 * 2 ** attempt++) + Math.random() * 1200,
          );
      };
      current.onerror = () => current.close();
    };
    connect();
    void refresh();
    let nextPoll = performance.now() + 25000 + Math.random() * 5000;
    const timer = setInterval(() => {
      if (
        !document.hidden &&
        (socket?.readyState !== WebSocket.OPEN || performance.now() >= nextPoll)
      ) {
        nextPoll = performance.now() + 25000 + Math.random() * 5000;
        schedule();
      }
    }, 2000);
    const visible = () => {
        if (!document.hidden) schedule();
      },
      online = () => {
        schedule();
        if (socket?.readyState === WebSocket.CLOSED) {
          clearTimeout(retry);
          connect();
        }
      };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", online);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(retry);
      clearTimeout(refreshTimer);
      socket?.close();
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", online);
      generation.current++;
      inFlight.current = null;
      queued.current = false;
    };
  }, [enabled, refresh]);
  return { snapshot, error, connected, loading, refresh, now };
}
