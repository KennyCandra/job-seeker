import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Shortlist from "./pages/Shortlist";
import Applications from "./pages/Applications";
import SavedJobs from "./pages/SavedJobs";
import Companies from "./pages/Companies";
import Config from "./pages/Config";
import Chat from "./pages/Chat";

type Page = "dashboard" | "shortlist" | "applications" | "savedJobs" | "companies" | "config";

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "shortlist", label: "Shortlist", icon: "📋" },
  { id: "applications", label: "Applications", icon: "📁" },
  { id: "savedJobs", label: "Saved Jobs", icon: "💼" },
  { id: "companies", label: "Companies", icon: "🏢" },
  { id: "config", label: "Config", icon: "⚙" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

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
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </nav>
      </aside>
      <main className="main">
        {page === "dashboard" && <Dashboard />}
        {page === "shortlist" && <Shortlist />}
        {page === "applications" && <Applications />}
        {page === "savedJobs" && <SavedJobs />}
        {page === "companies" && <Companies />}
        {page === "config" && <Config />}
      </main>
      <Chat />
    </div>
  );
}
