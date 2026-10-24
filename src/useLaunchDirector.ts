import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./lib";
export type GameData = Record<string, any>;
export function useLaunchDirector(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<GameData>(),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [loading, setLoading] = useState(enabled);
  const sequence = useRef(0),
    selected = useRef<string | undefined>(undefined);
  const refresh = useCallback(
    async (round?: string) => {
      if (!enabled) return;
      if (round !== undefined) selected.current = round || undefined;
      const seq = ++sequence.current;
      try {
        const data = await api<GameData>(
          "launch/state" +
            (selected.current
              ? "?round=" + encodeURIComponent(selected.current)
              : ""),
        );
        if (seq === sequence.current) {
          setSnapshot(data);
          setError("");
        }
      } catch (e: any) {
        if (seq === sequence.current) setError(e.message);
      } finally {
        if (seq === sequence.current) setLoading(false);
      }
    },
    [enabled],
  );
  useEffect(() => {
    if (!enabled) return;
    let stopped = false,
      retry: ReturnType<typeof setTimeout>,
      socket: WebSocket;
    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(
        (location.protocol === "https:" ? "wss://" : "ws://") +
          location.host +
          "/api/launch/live",
      );
      socket.onopen = () => {
        setConnected(true);
        refresh();
      };
      socket.onmessage = (e) => {
        if (e.data !== "pong") refresh();
      };
      socket.onclose = () => {
        setConnected(false);
        if (!stopped) retry = setTimeout(connect, 5000);
      };
      socket.onerror = () => socket.close();
    };
    connect();
    refresh();
    let lastPoll = Date.now();
    const timer = setInterval(() => {
      if (
        !document.hidden &&
        (socket?.readyState !== WebSocket.OPEN ||
          Date.now() - lastPoll >= 30000)
      ) {
        lastPoll = Date.now();
        refresh();
      }
    }, 5000);
    const visible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(retry);
      socket?.close();
      document.removeEventListener("visibilitychange", visible);
      sequence.current++;
    };
  }, [enabled, refresh]);
  return { snapshot, error, connected, loading, refresh };
}
