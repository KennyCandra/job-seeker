import { useState, useEffect } from "react";
import { api, type Stats } from "../api";
import { useTaskRun } from "../hooks/useTaskRun";
import TaskLogPanel from "../components/TaskLogPanel";
import { Play, RefreshCw, Building2, Briefcase, CheckSquare, FileText, UserCheck, Loader2 } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [dapRunning, setDapRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const pipelineRun = useTaskRun();
  const discoveryRun = useTaskRun();
  const dapRun = useTaskRun();

  useEffect(() => {
    api.stats().then(setStats).catch(console.error);
  }, []);

  const runTask = async (
    type: string,
    payload: Record<string, unknown>,
    setRunning: (v: boolean) => void,
    taskRun: ReturnType<typeof useTaskRun>,
  ) => {
    setShowLogs(true);
    setRunning(true);
    try {
      const result = await api.tasks.create(type, payload);
      taskRun.subscribe(result.runId);
    } catch (err: any) {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (pipelineRun.status === "completed") {
      setPipelineRunning(false);
      api.stats().then(setStats).catch(console.error);
    } else if (pipelineRun.status === "failed" || pipelineRun.status === "cancelled") {
      setPipelineRunning(false);
    }
  }, [pipelineRun.status]);

  useEffect(() => {
    if (discoveryRun.status === "completed" || discoveryRun.status === "failed" || discoveryRun.status === "cancelled") {
      setDiscoveryRunning(false);
      api.stats().then(setStats).catch(console.error);
    }
  }, [discoveryRun.status]);

  useEffect(() => {
    if (dapRun.status === "completed" || dapRun.status === "failed" || dapRun.status === "cancelled") {
      setDapRunning(false);
      api.stats().then(setStats).catch(console.error);
    }
  }, [dapRun.status]);

  const activeLogs = pipelineRun.logs.length > 0
    ? pipelineRun.logs
    : discoveryRun.logs.length > 0
      ? discoveryRun.logs
      : dapRun.logs;

  const activeRunning = pipelineRunning || discoveryRunning || dapRunning;

  const statCards = [
    { value: stats?.companies ?? "—", label: "Companies", icon: <Building2 size={20} /> },
    { value: stats?.openJobs ?? "—", label: "Open Jobs", icon: <Briefcase size={20} /> },
    { value: stats?.shortlist ?? "—", label: "Matched", icon: <CheckSquare size={20} /> },
    { value: stats?.docsGenerated ?? "—", label: "Docs Generated", icon: <FileText size={20} /> },
    { value: stats?.applications ?? "—", label: "Applications", icon: <UserCheck size={20} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-bar">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-actions">
        <button
          className="btn btn-primary"
          onClick={() => runTask("sync-all-jobs", {}, setPipelineRunning, pipelineRun)}
          disabled={pipelineRunning}
        >
          {pipelineRunning ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
          Run Pipeline
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => runTask("discover-companies", {}, setDiscoveryRunning, discoveryRun)}
          disabled={discoveryRunning}
        >
          {discoveryRunning ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          Run Discovery
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => runTask("discover-fetch-filter", {}, setDapRunning, dapRun)}
          disabled={dapRunning}
        >
          {dapRunning ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
          Discover & Process
        </button>
        {showLogs && activeRunning && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLogs(false)}>
            Hide Logs
          </button>
        )}
      </div>

      {showLogs && activeRunning && (
        <div className="card">
          <h3 style={{ marginBottom: 8, fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Live Log
          </h3>
          <TaskLogPanel logs={activeLogs} maxHeight={300} />
        </div>
      )}
    </div>
  );
}
