import { useEffect, useRef } from "react";
import type { TaskLog } from "../hooks/useTaskRun";

export default function TaskLogPanel({ logs, maxHeight }: { logs: TaskLog[]; maxHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="log-panel" ref={ref} style={maxHeight ? { maxHeight } : undefined}>
      {logs.length === 0 && <div className="log-line info">Waiting for output...</div>}
      {logs.map((l) => (
        <div key={l.id} className={`log-line ${l.level === "error" ? "error" : l.level === "warn" ? "warn" : "info"}`}>
          <span>[{new Date(l.createdAt).toLocaleTimeString()}] {l.message}</span>
        </div>
      ))}
    </div>
  );
}
