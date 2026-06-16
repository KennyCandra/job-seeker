import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import TaskStatusBadge from "./TaskStatusBadge";
import { X, ListTodo, ExternalLink, Ban } from "lucide-react";

interface TaskRun {
  id: string;
  type: string;
  status: string;
  payloadJson: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TaskDrawer({ onViewTask }: { onViewTask?: (runId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<TaskRun[]>([]);
  const [recent, setRecent] = useState<TaskRun[]>([]);

  const load = useCallback(() => {
    api.tasks.list().then((res) => {
      const all: TaskRun[] = res.tasks || [];
      setActive(all.filter((t) => t.status === "queued" || t.status === "running"));
      setRecent(all.filter((t) => t.status === "completed" || t.status === "failed" || t.status === "cancelled").slice(0, 10));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleCancel = async (runId: string) => {
    await api.tasks.cancel(runId);
    load();
  };

  return (
    <>
      <button className="task-drawer-toggle" onClick={() => setOpen(!open)} title="Active Tasks">
        <ListTodo size={16} />
        {active.length > 0 && <span className="task-drawer-badge">{active.length}</span>}
      </button>

      {open && (
        <div className="task-drawer-overlay" onClick={() => setOpen(false)}>
          <div className="task-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="task-drawer-header">
              <h3>Tasks</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                <X size={14} />
              </button>
            </div>

            {active.length > 0 && (
              <div className="task-drawer-section">
                <div className="task-drawer-section-title">Active ({active.length})</div>
                {active.map((t) => (
                  <div key={t.id} className="task-drawer-item">
                    <div className="task-drawer-item-info" onClick={() => { onViewTask?.(t.id); setOpen(false); }}>
                      <span className="task-drawer-item-type">{t.type}</span>
                      <TaskStatusBadge status={t.status} />
                    </div>
                    <div className="task-drawer-item-actions">
                      {(t.status === "queued" || t.status === "running") && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(t.id)} title="Cancel">
                          <Ban size={12} />
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => { onViewTask?.(t.id); setOpen(false); }} title="View details">
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recent.length > 0 && (
              <div className="task-drawer-section">
                <div className="task-drawer-section-title">Recent ({recent.length})</div>
                {recent.map((t) => (
                  <div key={t.id} className="task-drawer-item">
                    <div className="task-drawer-item-info" onClick={() => { onViewTask?.(t.id); setOpen(false); }}>
                      <span className="task-drawer-item-type">{t.type}</span>
                      <TaskStatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {active.length === 0 && recent.length === 0 && (
              <div className="task-drawer-empty">No tasks yet</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
