import { useEffect, useRef, useCallback } from "react";

export type SSEEvent = {
  type: string;
  data: unknown;
};

export function useSSE(
  url: string,
  onEvent: (event: SSEEvent) => void,
  onDone?: () => void,
  enabled: boolean = true,
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const listenerRef = useRef(onEvent);
  const doneRef = useRef(onDone);
  listenerRef.current = onEvent;
  doneRef.current = onDone;

  const start = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("log", (e: MessageEvent) => {
      listenerRef.current({ type: "log", data: JSON.parse(e.data) });
    });
    es.addEventListener("chunk", (e: MessageEvent) => {
      listenerRef.current({ type: "chunk", data: JSON.parse(e.data) });
    });
    es.addEventListener("done", (e: MessageEvent) => {
      listenerRef.current({ type: "done", data: JSON.parse(e.data) });
      doneRef.current?.();
      es.close();
    });
    es.addEventListener("error", (e: Event) => {
      listenerRef.current({ type: "error", data: (e as MessageEvent).data || "Connection error" });
      doneRef.current?.();
      es.close();
    });

    return () => es.close();
  }, [url]);

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      const cleanup = start();
      return cleanup;
    }
  }, [enabled, start]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return { start, stop };
}
