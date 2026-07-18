import { useState, useEffect } from "react";
import { api } from "../api";
import { useTaskRun } from "../hooks/useTaskRun";
import TaskStatusBadge from "../components/TaskStatusBadge";
import TaskLogPanel from "../components/TaskLogPanel";
import { RefreshCw, X, Ban, Play } from "lucide-react";

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

  const closeDetail = () => {
    setSelectedId(null);
    taskRun.unsubscribe();
  };

  const handleCancel = async (runId: string) => {
    await api.tasks.cancel(runId);
    load();
    if (selectedId === runId) closeDetail();
  };

  const handleRerun = async (t: TaskRun) => {
    try {
      const payload = JSON.parse(t.payloadJson || "{}");
      await api.tasks.create(t.type, payload, true);
      load();
    } catch {}
  };

  const payloadPreview = (payloadJson: string) => {
    try {
      const p = JSON.parse(payloadJson);
      return JSON.stringify(p).slice(0, 80);
    } catch {
      return payloadJson?.slice(0, 80) || "";
    }
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", gap: 0, margin: "-24px -32px" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 24px 32px", minWidth: 0 }}>
        <div className="page-header">
          <h1>Tasks</h1>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Payload</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Error</th>
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
                  <td><span className="company-badge">{t.type}</span></td>
                  <td><TaskStatusBadge status={t.status} /></td>
                  <td className="text-sm text-muted">{payloadPreview(t.payloadJson)}</td>
                  <td className="text-sm text-muted">{formatTime(t.createdAt)}</td>
                  <td className="text-sm text-muted">{formatTime(t.updatedAt)}</td>
                  <td className="text-sm" style={{ color: "var(--danger)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.error || "—"}
                  </td>
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
                  <td colSpan={7} className="text-muted" style={{ textAlign: "center" }}>No tasks yet</td>
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

      {selectedId && (
        <div style={{ width: 420, flexShrink: 0, borderLeft: "1px solid #21262d", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Task Detail</h2>
            <button className="btn btn-ghost btn-sm" onClick={closeDetail}>
              <X size={14} />
            </button>
          </div>

          <div className="detail-section" style={{ marginBottom: 16 }}>
            <div className="detail-section-label">Status</div>
            <TaskStatusBadge status={taskRun.status || "loading..."} />
          </div>

          <div className="detail-section" style={{ marginBottom: 16 }}>
            <div className="detail-section-label">Logs</div>
            <TaskLogPanel logs={taskRun.logs} maxHeight={400} />
          </div>

          {taskRun.result && (
            <div className="detail-section" style={{ marginBottom: 16 }}>
              <div className="detail-section-label">Result</div>
              <pre style={{ fontSize: 12, background: "var(--bg)", padding: 12, borderRadius: "var(--radius)", maxHeight: 200, overflow: "auto", border: "1px solid #21262d" }}>
                {JSON.stringify(taskRun.result, null, 2)}
              </pre>
            </div>
          )}

          {taskRun.error && (
            <div className="detail-section" style={{ marginBottom: 16 }}>
              <div className="detail-section-label">Error</div>
              <div style={{ color: "var(--danger)", fontSize: 13 }}>{taskRun.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
