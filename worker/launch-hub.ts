import { LaunchSnapshots } from "./launch-state";
/** Namespace has no public route; only the authenticated outer Worker can call it. */
export class LaunchHub {
  private snapshots: LaunchSnapshots;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private state: DurableObjectState,
    env: { DB: D1Database },
  ) {
    this.snapshots = new LaunchSnapshots(env.DB);
  }
  private send(payload: unknown, managersOnly = false) {
    const text = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      if (
        managersOnly &&
        !["owner", "admin"].includes(ws.deserializeAttachment()?.role)
      )
        continue;
      try {
        ws.send(text);
      } catch {}
    }
  }
  private refresh() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.send({ type: "refresh" });
    }, 250);
  }
  private presence() {
    return [
      ...new Set(
        this.state
          .getWebSockets()
          .map((ws) => ws.deserializeAttachment()?.user)
          .filter(Boolean),
      ),
    ] as string[];
  }
  async fetch(req: Request) {
    const url = new URL(req.url),
      path = url.pathname;
    if (path === "/connect") {
      if (req.headers.get("Upgrade")?.toLowerCase() !== "websocket")
        return new Response("WebSocket required", { status: 426 });
      const user = req.headers.get("X-Launch-User"),
        role = req.headers.get("X-Launch-Role");
      if (!user || !role) return new Response("Unauthorized", { status: 401 });
      const [client, server] = Object.values(new WebSocketPair());
      const same = this.state
        .getWebSockets()
        .filter((ws) => ws.deserializeAttachment()?.user === user);
      for (const ws of same.slice(2)) ws.close(1000, "Connection limit");
      this.state.acceptWebSocket(server);
      server.serializeAttachment({ user, role });
      server.send(JSON.stringify({ type: "refresh" }));
      // Presence is not a game mutation: never make every student refetch on every connection.
      this.send({ type: "presence" }, true);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === "/notify") {
      this.snapshots.invalidate();
      let event: any;
      try {
        event = await req.json();
      } catch {}
      if (event?.type === "start")
        this.send({
          type: "start",
          roundId: event.roundId,
          launchAt: event.launchAt,
          serverNow: Date.now(),
        });
      this.refresh();
      return Response.json({ ok: true });
    }
    if (path === "/presence") return Response.json(this.presence());
    if (path === "/snapshot") {
      const id = req.headers.get("X-Launch-User"),
        role = req.headers.get("X-Launch-Role");
      if (
        !id ||
        !["customer", "owner", "admin", "finance"].includes(role || "")
      )
        return new Response("Unauthorized", { status: 401 });
      return this.snapshots.response(
        { id, role: role! },
        url.searchParams.get("round") || "",
        this.presence(),
      );
    }
    if (path === "/recipient") {
      const id = req.headers.get("X-Launch-User"),
        role = req.headers.get("X-Launch-Role");
      if (!id || !role)
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      try {
        return Response.json(
          await this.snapshots.recipient(
            { id, role },
            url.searchParams.get("round") || "",
            url.searchParams.get("iban") || "",
          ),
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error: any) {
        return Response.json(
          {
            error: error.status ? error.message : "Unable to read participant.",
          },
          { status: error.status || 500 },
        );
      }
    }
    return new Response("Not found", { status: 404 });
  }
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (message === "ping") ws.send("pong");
    else ws.close(1008, "Read-only synchronization channel");
  }
  webSocketClose(ws: WebSocket, code: number) {
    ws.close(code === 1005 || code === 1006 ? 1000 : code);
    this.send({ type: "presence" }, true);
  }
  webSocketError(ws: WebSocket) {
    ws.close(1011, "Reconnect");
  }
}
