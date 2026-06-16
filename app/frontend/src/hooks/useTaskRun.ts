import { useState, useCallback, useRef } from "react";

export interface TaskLog {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

export function useTaskRun() {
  const [status, setStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const subscribe = useCallback((runId: string) => {
    setStatus("queued");
    setLogs([]);
    setResult(null);
    setError(null);
    setLoading(true);

    if (esRef.current) esRef.current.close();

    const es = new EventSource(`/api/tasks/${encodeURIComponent(runId)}/events`);
    esRef.current = es;

    es.addEventListener("status", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      setStatus(d.status);
    });

    es.addEventListener("log", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      setLogs((prev) => [...prev, d]);
    });

    es.addEventListener("progress", (e: MessageEvent) => {
      const d = JSON.parse(e.data);
      setResult((prev: any) => ({ ...prev, progress: d }));
    });

    es.addEventListener("result", (e: MessageEvent) => {
      setResult(JSON.parse(e.data));
    });

    es.addEventListener("done", () => {
      setLoading(false);
      es.close();
      esRef.current = null;
    });

    es.addEventListener("error", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        setError(d.error || "Task error");
      } catch {
        setError("Connection error");
      }
      setLoading(false);
      es.close();
      esRef.current = null;
    });
  }, []);

  const unsubscribe = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  return { status, logs, result, error, loading, subscribe, unsubscribe };
}
