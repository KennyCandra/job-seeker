import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Shortlist from "./pages/Shortlist";
import Applications from "./pages/Applications";
import Jobs from "./pages/Jobs";
import Companies from "./pages/Companies";
import Config from "./pages/Config";
import Tasks from "./pages/Tasks";
import ProfilePage from "./pages/Profile";
import Chat from "./pages/Chat";
import TaskDrawer from "./components/TaskDrawer";
import { useTaskRun } from "./hooks/useTaskRun";
import { api } from "./api";

type Page = "dashboard" | "shortlist" | "applications" | "jobs" | "companies" | "config" | "tasks" | "profile";

const NAV: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Overview" },
  { id: "shortlist", label: "Shortlist" },
  { id: "applications", label: "Applications" },
  { id: "jobs", label: "Jobs" },
  { id: "companies", label: "Companies" },
  { id: "tasks", label: "Tasks" },
  { id: "profile", label: "Profile" },
  { id: "config", label: "Config" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const pipelineRun = useTaskRun();

  const navigateToTask = (_runId: string) => {
    setPage("tasks");
    setDrawerOpen(false);
  };

  const runPipeline = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    try {
      const result = await api.tasks.create("sync-all-jobs", {});
      pipelineRun.subscribe(result.runId);
    } catch {
      setPipelineRunning(false);
    }
  };

  useEffect(() => {
    if (
      pipelineRun.status === "completed" ||
      pipelineRun.status === "failed" ||
      pipelineRun.status === "cancelled"
    ) {
      setPipelineRunning(false);
    }
  }, [pipelineRun.status]);

  return (
    <div className="layout">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <div className="wordmark">
              Autopilot<span>.</span>
            </div>
            <nav className="nav-pills">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  className={`nav-pill${page === n.id ? " active" : ""}`}
                  onClick={() => setPage(n.id)}
                >
                  {n.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="topbar-right">
            <div className="worker-status">
              <span className="status-dot" />
              worker live
            </div>
            <button className="run-pipeline-btn" onClick={runPipeline} disabled={pipelineRunning}>
              <span style={{ fontSize: 10 }}>{pipelineRunning ? "⣿" : "▶"}</span>
              {pipelineRunning ? "Running…" : "Run pipeline"}
            </button>
            <div className="avatar-circle">A</div>
          </div>
        </div>
      </div>
      <main className="main">
        {page === "dashboard" && <Dashboard onNavigate={setPage} />}
        {page === "shortlist" && <Shortlist />}
        {page === "applications" && <Applications />}
        {page === "jobs" && <Jobs />}
        {page === "companies" && <Companies />}
        {page === "config" && <Config />}
        {page === "tasks" && <Tasks />}
        {page === "profile" && <ProfilePage />}
      </main>
      <TaskDrawer onViewTask={navigateToTask} />
      <Chat onViewJobs={() => setPage("jobs")} />
    </div>
  );
}
