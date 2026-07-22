import { useState, useEffect } from "react";
import { api, type CompanyRecord } from "../api";
import { useTaskRun } from "../hooks/useTaskRun";
import TaskLogPanel from "../components/TaskLogPanel";
import TaskStatusBadge from "../components/TaskStatusBadge";
import { Plus, RefreshCw, Trash2, Search, Loader2, Download, Filter, CheckCircle2, AlertCircle } from "lucide-react";

const ATS_OPTIONS = ["greenhouse", "lever", "ashby"];

export default function Companies() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingMap, setFetchingMap] = useState<Record<string, { mode: "fetch" | "filter" | "discover"; runId: string }>>({});
  const [discovering, setDiscovering] = useState(false);
  const [discoverMsg, setDiscoverMsg] = useState<string | null>(null);
  const discoveryTask = useTaskRun();

  const [newName, setNewName] = useState("");
  const [newAts, setNewAts] = useState("greenhouse");
  const [newEndpoint, setNewEndpoint] = useState("");

  const load = () => {
    setLoading(true);
    api.companies.list().then(setCompanies).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggle = async (slug: string, active: boolean) => {
    await api.companies.toggleActive(slug, active);
    setCompanies((prev) => prev.map((c) => (c.slug === slug ? { ...c, active } : c)));
  };

  const handleDelete = async (slug: string) => {
    await api.companies.delete(slug);
    setCompanies((prev) => prev.filter((c) => c.slug !== slug));
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newAts) return;
    await api.companies.create(newName.trim(), newAts, newEndpoint || undefined);
    setNewName("");
    setNewAts("greenhouse");
    setNewEndpoint("");
    load();
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoverMsg(null);
    try {
      const result = await api.tasks.create("discover-companies", {});
      discoveryTask.subscribe(result.runId);
      setDiscoverMsg("Discovery queued");
    } catch (err: any) {
      setDiscoverMsg(`Discovery failed: ${err.message}`);
      setDiscovering(false);
    }
  };

  useEffect(() => {
    if (!discovering) return;
    if (discoveryTask.status === "completed") {
      setDiscoverMsg("Discovery completed");
      setDiscovering(false);
      load();
    } else if (discoveryTask.status === "failed") {
      setDiscoverMsg(`Discovery failed: ${discoveryTask.error || "see task logs"}`);
      setDiscovering(false);
    } else if (discoveryTask.status === "cancelled") {
      setDiscoverMsg("Discovery cancelled");
      setDiscovering(false);
    }
  }, [discoveryTask.status]);

  const initiateFetch = async (slug: string, filter: boolean) => {
    const mode = filter ? "filter" : "fetch";
    try {
      const result = await api.tasks.create("sync-company", { companySlug: slug, filter });
      setFetchingMap((prev) => ({ ...prev, [slug]: { mode, runId: result.runId } }));
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleTaskComplete = (slug: string) => {
    setFetchingMap((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    load();
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.slug.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          <div className="page-subtitle">{companies.length} tracked companies across your ATS boards.</div>
        </div>
        <div className="doc-actions">
          <button className="btn btn-primary btn-sm" onClick={handleDiscover} disabled={discovering}>
            {discovering ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
            {discovering ? "Discovering" : "Discover Companies"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {discoverMsg && (
        <div className="action-toast" onClick={() => setDiscoverMsg(null)}>
          {discoverMsg}
          {discoveryTask.status && discovering && <TaskStatusBadge status={discoveryTask.status} />}
        </div>
      )}

      {discovering && (
        <div className="card" style={{ marginBottom: 16 }}>
          <TaskLogPanel logs={discoveryTask.logs} maxHeight={180} />
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12, fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Add Company
        </h3>
        <div className="inline-form">
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label>Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Company name" />
          </div>
          <div className="form-group" style={{ width: 140 }}>
            <label>ATS</label>
            <select value={newAts} onChange={(e) => setNewAts(e.target.value)}>
              {ATS_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
            <label>Endpoint (optional)</label>
            <input value={newEndpoint} onChange={(e) => setNewEndpoint(e.target.value)} placeholder="https://boards-api.greenhouse.io/v1/boards/company/jobs?content=true" />
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="search-input-wrap" style={{ marginBottom: 16 }}>
        <Search size={14} />
        <input placeholder="Search companies..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>ATS</th>
              <th>Endpoint</th>
              <th>Last Fetched</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <CompanyRow
                key={c.slug}
                company={c}
                fetchingInfo={fetchingMap[c.slug] || null}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onFetch={initiateFetch}
                onTaskComplete={handleTaskComplete}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: "center" }}>No companies found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompanyRow({
  company: c,
  fetchingInfo,
  onToggle,
  onDelete,
  onFetch,
  onTaskComplete,
}: {
  company: CompanyRecord;
  fetchingInfo: { mode: string; runId: string } | null;
  onToggle: (slug: string, active: boolean) => void;
  onDelete: (slug: string) => void;
  onFetch: (slug: string, filter: boolean) => void;
  onTaskComplete: (slug: string) => void;
}) {
  const taskRun = useTaskRun();
  const endpoint = c.endpoint || c.boardUrl || "";
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (fetchingInfo) {
      taskRun.subscribe(fetchingInfo.runId);
      return taskRun.unsubscribe;
    }
  }, [fetchingInfo?.runId]);

  useEffect(() => {
    if (taskRun.status === "completed") {
      setFetchError(null);
      onTaskComplete(c.slug);
    } else if (taskRun.status === "failed") {
      setFetchError(taskRun.error || "Fetch failed");
      onTaskComplete(c.slug);
    } else if (taskRun.status === "cancelled") {
      onTaskComplete(c.slug);
    }
  }, [taskRun.status]);

  const isFetching = taskRun.status === "queued" || taskRun.status === "running";

  return (
    <>
      <tr className={isFetching ? "company-row-active" : ""}>
        <td style={{ fontWeight: 600 }}>{c.name}</td>
        <td><span className="score-badge score-mid">{c.ats}</span></td>
        <td>
          {endpoint ? (
            <a href={endpoint} target="_blank" rel="noopener noreferrer" className="text-sm">
              {endpoint.length > 52 ? `${endpoint.slice(0, 52)}...` : endpoint}
            </a>
          ) : (
            <span className="text-sm text-muted">-</span>
          )}
        </td>
        <td className="text-sm text-muted">
          {c.lastFetchedAt
            ? new Date(c.lastFetchedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
            : "Never"}
        </td>
        <td>
          <label className="toggle">
            <input type="checkbox" checked={c.active} onChange={(e) => onToggle(c.slug, e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </td>
        <td>
          <div className="company-actions">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onFetch(c.slug, false)}
              disabled={Boolean(fetchingInfo)}
              title="Fetch all jobs from saved company endpoint"
            >
              {fetchingInfo?.mode === "fetch" ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              {fetchingInfo?.mode === "fetch" ? "Fetching" : "Fetch"}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onFetch(c.slug, true)}
              disabled={Boolean(fetchingInfo)}
              title="Fetch jobs and run the deterministic candidate filter"
            >
              {fetchingInfo?.mode === "filter" ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
              {fetchingInfo?.mode === "filter" ? "Filtering" : "Fetch + Filter"}
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onDelete(c.slug)}
              disabled={Boolean(fetchingInfo)}
              title="Deactivate company"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {(isFetching || fetchError || (taskRun.result && !isFetching)) && (
        <tr className="company-fetch-row">
          <td colSpan={6}>
            {isFetching && (
              <div className="company-fetch-panel running">
                <Loader2 size={14} className="spin" />
                <span>
                  {fetchingInfo?.mode === "filter"
                    ? `Fetching ${c.name}, then running the normal candidate filter...`
                    : `Fetching latest jobs from ${c.name}...`}
                </span>
                <TaskStatusBadge status={taskRun.status || "queued"} />
              </div>
            )}
            {fetchError && (
              <div className="company-fetch-panel error">
                <AlertCircle size={14} />
                <span>{fetchError}</span>
              </div>
            )}
            {taskRun.result && !isFetching && !fetchError && (
              <div className="company-fetch-panel success">
                <CheckCircle2 size={14} />
                <span className="company-fetch-title">{(taskRun.result as any).company || c.name}</span>
                <span>{(taskRun.result as any).fetched || 0} fetched</span>
                <span>{(taskRun.result as any).newJobs || 0} new</span>
                <span>{(taskRun.result as any).changedJobs || 0} changed</span>
                <span>{(taskRun.result as any).unchangedJobs || 0} unchanged</span>
                <span>{(taskRun.result as any).closedJobs || 0} closed</span>
                {(taskRun.result as any).filtered > 0 && (
                  <span>{(taskRun.result as any).accepted}/{(taskRun.result as any).filtered} accepted</span>
                )}
              </div>
            )}
            {taskRun.logs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <TaskLogPanel logs={taskRun.logs} maxHeight={120} />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
