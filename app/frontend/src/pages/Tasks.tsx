import { useState, useEffect } from "react";
import { api } from "../api";
import { useTaskRun } from "../hooks/useTaskRun";
import TaskStatusBadge from "../components/TaskStatusBadge";
import { RefreshCw, Ban, Play } from "lucide-react";

interface TaskRun {
  id: string;
  bullJobId: string | null;
  type: string;
  status: string;
  dedupeKey: string | null;
  payloadJson: string;
  progressJson: string | null;
  resultJson: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

function formatDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt) return "—";
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const ms = end - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<TaskRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const taskRun = useTaskRun();

  const load = () => {
    setLoading(true);
    api.tasks.list().then((res) => {
      setTasks(res.tasks || []);
      setTotal(res.total ?? (res.tasks || []).length);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const selectTask = (runId: string) => {
    setSelectedId(runId);
    taskRun.subscribe(runId);
  };

  const handleCancel = async (runId: string) => {
    await api.tasks.cancel(runId);
    load();
    if (selectedId === runId) taskRun.unsubscribe();
  };

  const handleRerun = async (t: TaskRun) => {
    try {
      const payload = JSON.parse(t.payloadJson || "{}");
      await api.tasks.create(t.type, payload, true);
      load();
    } catch {}
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const selected = tasks.find((t) => t.id === selectedId) || null;
  const progressPct = (() => {
    if (!taskRun.result) return null;
    const p = (taskRun.result as any).progress;
    if (p && typeof p.percent === "number") return p.percent;
    return null;
  })();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <div className="page-subtitle">Live job queue. Click a run to stream its log.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="tasks-grid">
        <div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    className={selectedId === t.id ? "selected" : ""}
                    onClick={() => selectTask(t.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="font-mono text-sm">{t.type}</td>
                    <td><TaskStatusBadge status={t.status} /></td>
                    <td className="text-sm text-muted font-mono">{formatTime(t.startedAt)}</td>
                    <td className="text-sm text-muted font-mono">{formatDuration(t.startedAt, t.completedAt)}</td>
                    <td>
                      <div className="flex gap-4" style={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                        {(t.status === "queued" || t.status === "running") && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(t.id)} title="Cancel">
                            <Ban size={12} />
                          </button>
                        )}
                        {(t.status === "failed" || t.status === "cancelled") && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleRerun(t)} title="Rerun">
                            <Play size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-muted" style={{ textAlign: "center" }}>No tasks yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {total > tasks.length && (
            <div className="text-sm text-muted" style={{ marginTop: 12 }}>
              showing {tasks.length} of {total}
            </div>
          )}
        </div>

        {selected && (
          <div className="task-log-sticky">
            <div className="task-log-head">
              <span className="title">{selected.type}</span>
              <TaskStatusBadge status={taskRun.status || selected.status} />
            </div>
            <div style={{ padding: "16px 20px", fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 2.05, maxHeight: 420, overflowY: "auto" }}>
              {taskRun.logs.length === 0 && (
                <div style={{ color: "#8f8a7e" }}>Waiting for output...</div>
              )}
              {taskRun.logs.map((l) => (
                <div key={l.id}>
                  <span style={{ color: "#6f6a5e" }}>{new Date(l.createdAt).toLocaleTimeString()}</span>{" "}
                  <span style={{ color: l.level === "error" ? "#e08a8a" : l.level === "warn" ? "#f5b544" : "#e7ebf0" }}>
                    {l.message}
                  </span>
                </div>
              ))}
              {taskRun.error && (
                <div style={{ color: "#e08a8a", marginTop: 8 }}>✗ {taskRun.error}</div>
              )}
              <div className="task-progress-track">
                <div
                  className="task-progress-fill"
                  style={{
                    width: `${progressPct ?? (taskRun.status === "completed" ? 100 : taskRun.status === "running" ? 44 : 0)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
