import { useState, useEffect, useRef } from "react";
import { api, type Stats } from "../api";
import { useSSE, type SSEEvent } from "../hooks/useSSE";

interface LogLine {
  type: string;
  message: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoverAndProcessRunning, setDiscoverAndProcessRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.stats().then(setStats).catch(console.error);
  }, []);

  const handlePipelineEvent = (e: SSEEvent) => {
    if (e.type === "log") {
      const d = e.data as LogLine;
      setLogs((prev) => [...prev, d]);
    } else if (e.type === "done") {
      setPipelineRunning(false);
      api.stats().then(setStats).catch(console.error);
    }
  };

  const handleDiscoveryEvent = (e: SSEEvent) => {
    if (e.type === "log") {
      const d = e.data as LogLine;
      setLogs((prev) => [...prev, d]);
    } else if (e.type === "done") {
      setDiscoveryRunning(false);
      api.stats().then(setStats).catch(console.error);
    }
  };

  useSSE("/api/pipeline/run", handlePipelineEvent, undefined, false);

  const runPipeline = () => {
    setLogs([]);
    setShowLogs(true);
    setPipelineRunning(true);
    const es = new EventSource("/api/pipeline/run");
    es.addEventListener("log", (e: MessageEvent) => {
      const d = JSON.parse(e.data) as LogLine;
      setLogs((prev) => [...prev, d]);
    });
    es.addEventListener("done", () => {
      setPipelineRunning(false);
      api.stats().then(setStats).catch(console.error);
      es.close();
    });
    es.addEventListener("error", () => {
      setPipelineRunning(false);
      es.close();
    });
  };

  const runDiscovery = () => {
    setLogs([]);
    setShowLogs(true);
    setDiscoveryRunning(true);
    const es = new EventSource("/api/pipeline/discover");
    es.addEventListener("log", (e: MessageEvent) => {
      const d = JSON.parse(e.data) as LogLine;
      setLogs((prev) => [...prev, d]);
    });
    es.addEventListener("done", () => {
      setDiscoveryRunning(false);
      api.stats().then(setStats).catch(console.error);
      es.close();
    });
    es.addEventListener("error", () => {
      setDiscoveryRunning(false);
      es.close();
    });
  };

  const runDiscoverAndProcess = () => {
    setLogs([]);
    setShowLogs(true);
    setDiscoverAndProcessRunning(true);
    const es = new EventSource("/api/pipeline/discover-and-process");
    es.addEventListener("log", (e: MessageEvent) => {
      const d = JSON.parse(e.data) as LogLine;
      setLogs((prev) => [...prev, d]);
    });
    es.addEventListener("done", () => {
      setDiscoverAndProcessRunning(false);
      api.stats().then(setStats).catch(console.error);
      es.close();
    });
    es.addEventListener("error", () => {
      setDiscoverAndProcessRunning(false);
      es.close();
    });
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{stats?.companies ?? "—"}</div>
          <div className="stat-label">Companies</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.shortlist ?? "—"}</div>
          <div className="stat-label">Shortlist</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.applications ?? "—"}</div>
          <div className="stat-label">Applications</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.savedJobs ?? "—"}</div>
          <div className="stat-label">Saved Jobs</div>
        </div>
      </div>

      <div className="flex gap-16" style={{ marginBottom: 24 }}>
        <button
          className="btn btn-primary"
          onClick={runPipeline}
          disabled={pipelineRunning}
        >
          {pipelineRunning ? "⏳ Running..." : "▶ Run Pipeline"}
        </button>
        <button
          className="btn btn-ghost"
          onClick={runDiscovery}
          disabled={discoveryRunning}
        >
          {discoveryRunning ? "⏳ Discovering..." : "🔍 Run Discovery"}
        </button>
        <button
          className="btn btn-accent"
          onClick={runDiscoverAndProcess}
          disabled={discoverAndProcessRunning}
        >
          {discoverAndProcessRunning ? "⏳ Processing..." : "🔄 Discover & Auto-CV"}
        </button>
        {showLogs && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLogs(false)}>
            Hide Logs
          </button>
        )}
      </div>

      {showLogs && (
        <div className="card">
          <h3 style={{ marginBottom: 8, fontSize: 13, color: "var(--text-muted)" }}>
            Pipeline Log
          </h3>
          <div className="log-panel" ref={logRef}>
            {logs.length === 0 && (
              <div className="log-line info">Waiting for output...</div>
            )}
            {logs.map((l, i) => (
              <div key={i} className={`log-line ${l.type}`}>
                <span>{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
