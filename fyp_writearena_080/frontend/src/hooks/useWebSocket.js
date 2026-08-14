import { useEffect, useRef, useCallback } from "react";

export function useWebSocket(roomId, handlers = {}) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !roomId) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = proto + "://" + window.location.host + "/ws/" + roomId;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ token }));
      handlers.onConnect && handlers.onConnect();
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.onMessage && handlers.onMessage(data);
      } catch {}
    };

    ws.current.onclose = () => {
      handlers.onDisconnect && handlers.onDisconnect();
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      ws.current && ws.current.close();
    };
  }, [roomId]);

  const send = useCallback((data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current && ws.current.close();
    };
  }, [connect]);

  return { send };
}
