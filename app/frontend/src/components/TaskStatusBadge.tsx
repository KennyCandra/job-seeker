import { Loader2, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  queued: { icon: <Clock size={14} />, className: "status-tag", label: "Queued" },
  running: { icon: <Loader2 size={14} className="spin" />, className: "status-tag running", label: "Running" },
  completed: { icon: <CheckCircle2 size={14} />, className: "status-tag completed", label: "Done" },
  failed: { icon: <XCircle size={14} />, className: "status-tag failed", label: "Failed" },
  cancelled: { icon: <Ban size={14} />, className: "status-tag cancelled", label: "Cancelled" },
};

export default function TaskStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  return (
    <span className={`${cfg.className}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
