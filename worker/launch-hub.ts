// Only the authenticated outer Worker can call this namespace. Broadcasts contain no private game data.
export class LaunchHub {
  constructor(private state: DurableObjectState) {}
  broadcast() {
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(JSON.stringify({ type: "refresh" }));
      } catch {}
    }
  }
  async fetch(req: Request) {
    const path = new URL(req.url).pathname;
    if (path === "/connect") {
      if (req.headers.get("Upgrade")?.toLowerCase() !== "websocket")
        return new Response("WebSocket required", { status: 426 });
      const user = req.headers.get("X-Launch-User");
      if (!user) return new Response("Unauthorized", { status: 401 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const sockets = this.state
        .getWebSockets()
        .filter((ws) => ws.deserializeAttachment()?.user === user);
      for (const ws of sockets.slice(2)) ws.close(1000, "Connection limit");
      this.state.acceptWebSocket(server);
      server.serializeAttachment({ user });
      server.send(JSON.stringify({ type: "refresh" }));
      this.broadcast();
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === "/notify") {
      this.broadcast();
      return Response.json({ ok: true });
    }
    if (path === "/presence")
      return Response.json([
        ...new Set(
          this.state
            .getWebSockets()
            .map((ws) => ws.deserializeAttachment()?.user)
            .filter(Boolean),
        ),
      ]);
    return new Response("Not found", { status: 404 });
  }
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (message === "ping") ws.send("pong");
    else ws.close(1008, "Read-only synchronization channel");
  }
  webSocketClose(ws: WebSocket, code: number) {
    ws.close(code === 1005 || code === 1006 ? 1000 : code);
    this.broadcast();
  }
  webSocketError(ws: WebSocket) {
    ws.close(1011, "Reconnect");
  }
}
