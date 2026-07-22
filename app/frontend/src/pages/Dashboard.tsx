import { useState, useEffect } from "react";
import { api, type Stats, type ShortlistItem } from "../api";
import { useTaskRun } from "../hooks/useTaskRun";
import TaskLogPanel from "../components/TaskLogPanel";
import { Play, RefreshCw, Loader2 } from "lucide-react";

function scoreClass(score: number) {
  return score >= 90 ? "score-high" : score >= 80 ? "score-mid" : "score-low";
}

// Placeholder funnel/response data: `api.stats()` doesn't currently return a
// stage breakdown (applied/interviewing/offer) or response-rate. "Ready" is
// derived from real numbers (shortlist minus applications); the rest are
// tasteful static placeholders so the layout is complete. Wire these up to
// real endpoints once the backend exposes an application-status breakdown.
const FUNNEL_INTERVIEWING_PLACEHOLDER = 3;
const FUNNEL_OFFER_PLACEHOLDER = 1;
const RESPONSE_RATE_PLACEHOLDER = "13.8%";

export default function Dashboard({ onNavigate }: { onNavigate?: (page: "shortlist") => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topMatches, setTopMatches] = useState<ShortlistItem[]>([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [dapRunning, setDapRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const pipelineRun = useTaskRun();
  const discoveryRun = useTaskRun();
  const dapRun = useTaskRun();

  useEffect(() => {
    api.stats().then(setStats).catch(console.error);
    api.shortlist
      .list()
      .then((items) =>
        setTopMatches(
          items
            .filter((i) => i.verdict === "accept")
            .sort((a, b) => b.score - a.score)
            .slice(0, 4),
        ),
      )
      .catch(console.error);
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
    { value: stats?.companies ?? "—", label: "Companies", sub: "tracked", accent: false },
    { value: stats?.openJobs ?? "—", label: "Open jobs", sub: `${stats?.jobs ?? "—"} total seen`, accent: false },
    { value: stats?.shortlist ?? "—", label: "Matched", sub: "by AI filter", accent: true },
    { value: stats?.docsGenerated ?? "—", label: "Docs", sub: "CV + letters", accent: false },
    { value: stats?.applications ?? "—", label: "Applied", sub: `${stats?.cvCount ?? 0} with CVs`, accent: false },
  ];

  const readyCount = Math.max((stats?.shortlist ?? 0) - (stats?.applications ?? 0), 0);
  const appliedCount = stats?.applications ?? 0;
  const funnel = [
    { label: "Ready", n: readyCount, w: 100, color: "#e9e6df" },
    { label: "Applied", n: appliedCount, w: appliedCount ? 72 : 0, color: "#7b93f0" },
    { label: "Interviewing", n: FUNNEL_INTERVIEWING_PLACEHOLDER, w: 24, color: "#2f5bea" },
    { label: "Offer", n: FUNNEL_OFFER_PLACEHOLDER, w: 9, color: "#c6f24e" },
  ];

  const today = new Date();
  const eyebrow = today
    .toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  const recentLogs = activeLogs.slice(-3);

  return (
    <div>
      <div className="dashboard-eyebrow">{eyebrow} · Pipeline healthy</div>
      <div className="dashboard-hero">
        <span className="accent">{stats?.shortlist ?? "—"} jobs</span> made the cut. {stats?.openJobs ?? "—"} open roles are being watched right now.
      </div>

      <div className="stats-bar">
        {statCards.map((s) => (
          <div key={s.label} className={`stat-card${s.accent ? " stat-accent" : ""}`}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-sub">{s.sub}</div>
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
        <div className="card" style={{ marginBottom: 22 }}>
          <h3 style={{ marginBottom: 8, fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Live Log
          </h3>
          <TaskLogPanel logs={activeLogs} maxHeight={300} />
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card">
          <div className="review-card-head">
            <span className="title">Waiting for your review</span>
            <button className="see-all" onClick={() => onNavigate?.("shortlist")}>
              See all {stats?.shortlist ?? 0} →
            </button>
          </div>
          <div>
            {topMatches.map((item, i) => (
              <div className="review-row" key={item.jobId}>
                <div className={`review-score ${scoreClass(item.score)}`}>{item.score}</div>
                <div className="review-info">
                  <div className="title">{item.title}</div>
                  <div className="meta">{item.company} · {item.location}</div>
                </div>
                <button
                  className={i < 2 ? "btn btn-ink btn-sm" : "btn btn-ghost btn-sm"}
                  onClick={() => onNavigate?.("shortlist")}
                >
                  Tailor CV
                </button>
              </div>
            ))}
            {topMatches.length === 0 && (
              <p className="text-muted text-sm" style={{ padding: "14px 0" }}>
                No matches yet. Run the pipeline to populate your shortlist.
              </p>
            )}
          </div>
        </div>

        <div className="funnel-card">
          <div className="title">Application funnel</div>
          <div className="funnel-rows">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="funnel-row-label">
                  <span>{f.label}</span>
                  <span>{f.n}</span>
                </div>
                <div className="funnel-bar-track">
                  <div className="funnel-bar-fill" style={{ width: `${f.w}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="funnel-response">
            Response rate <b>{RESPONSE_RATE_PLACEHOLDER}</b> · placeholder until outcome tracking is wired up.
          </div>
          <div className="funnel-log">
            {recentLogs.length > 0 ? (
              recentLogs.map((l) => (
                <div key={l.id}>
                  <span style={{ color: l.level === "error" ? "#e08a8a" : l.level === "warn" ? "#f5b544" : "#c6f24e" }}>
                    {l.level === "error" ? "✗" : "✓"}
                  </span>{" "}
                  {new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.message}
                </div>
              ))
            ) : (
              <div style={{ color: "#6f6a5e" }}>No recent task activity — run the pipeline to see live output here.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
