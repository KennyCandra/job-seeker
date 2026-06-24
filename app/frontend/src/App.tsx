import { useState } from "react";
import { LayoutDashboard, Briefcase, CheckSquare, Building2, Settings, ListTodo, User, Activity } from "lucide-react";
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

type Page = "dashboard" | "shortlist" | "applications" | "jobs" | "companies" | "config" | "tasks" | "profile";

const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "shortlist", label: "Shortlist", icon: <ListTodo size={18} /> },
  { id: "applications", label: "Applications", icon: <CheckSquare size={18} /> },
  { id: "jobs", label: "Jobs", icon: <Briefcase size={18} /> },
  { id: "companies", label: "Companies", icon: <Building2 size={18} /> },
  { id: "tasks", label: "Tasks", icon: <Activity size={18} /> },
  { id: "profile", label: "Profile", icon: <User size={18} /> },
  { id: "config", label: "Config", icon: <Settings size={18} /> },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigateToTask = (runId: string) => {
    setPage("tasks");
    setDrawerOpen(false);
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">CV Autopilot</div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <div
              key={n.id}
              className={`nav-item${page === n.id ? " active" : ""}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </nav>
      </aside>
      <main className="main">
        {page === "dashboard" && <Dashboard />}
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
