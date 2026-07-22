import { useState, useEffect } from "react";
import { api, type JobListItem, type JobDetail } from "../api";
import { useTaskRun } from "../hooks/useTaskRun";
import TaskLogPanel from "../components/TaskLogPanel";
import TaskStatusBadge from "../components/TaskStatusBadge";
import { Search, Filter, RefreshCw, Briefcase, FileText, FileSignature, UserCheck, ExternalLink, X, ChevronRight, Loader2, Download, Play, Image, Sparkles } from "lucide-react";

const APPLY_POLL_INTERVAL_MS = 2500;
const APPLY_POLL_LIMIT = 48;

export default function Jobs() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    accepted: 0,
    rejected: 0,
    unfiltered: 0,
    smartAccepted: 0,
    smartRejected: 0,
    smartUnfiltered: 0,
  });
  const [filterOptions, setFilterOptions] = useState<{ companies: string[]; statuses: string[] }>({ companies: [], statuses: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verdictFilter, setVerdictFilter] = useState("");
  const [smartVerdictFilter, setSmartVerdictFilter] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [fetchedWithinHours, setFetchedWithinHours] = useState(0);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [activeTaskAction, setActiveTaskAction] = useState<{ key: string; jobId?: string; label: string } | null>(null);
  const taskRun = useTaskRun();
  const [applyRun, setApplyRun] = useState<{ run: import("../api").ApplyRun | null; steps: import("../api").ApplyRunStep[] }>({ run: null, steps: [] });

  const load = () => {
    setLoading(true);
    api.jobs.list({
      page,
      pageSize,
      search,
      company: companyFilter,
      status: statusFilter,
      verdict: verdictFilter,
      smartVerdict: smartVerdictFilter,
      minScore,
      fetchedWithinHours,
    }).then((result) => {
      setJobs(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setSummary(result.summary);
      setFilterOptions(result.options);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = window.setTimeout(load, 200);
    return () => window.clearTimeout(timeout);
  }, [page, pageSize, search, companyFilter, statusFilter, verdictFilter, smartVerdictFilter, minScore, fetchedWithinHours]);

  const resetToFirstPage = () => setPage(1);

  const selectJob = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await api.jobs.detail(id);
      setDetail(d);
      loadApplyLatest(id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const startJobTask = async (
    key: string,
    type: string,
    payload: Record<string, unknown>,
    label: string,
    jobId?: string,
    force = false,
  ) => {
    setActionLoading(key);
    setActionMsg(null);
    setActiveTaskAction({ key, jobId, label });
    try {
      const result = await api.tasks.create(type, payload, force);
      setActionMsg(`${label} queued`);
      taskRun.subscribe(result.runId);
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
      setActionLoading(null);
      setActiveTaskAction(null);
    }
  };

  useEffect(() => {
    if (!activeTaskAction) return;
    if (!["completed", "failed", "cancelled"].includes(taskRun.status || "")) return;

    const { label, jobId } = activeTaskAction;
    if (taskRun.status === "completed") setActionMsg(`${label} completed`);
    else if (taskRun.status === "failed") setActionMsg(`${label} failed: ${taskRun.error || "see task logs"}`);
    else setActionMsg(`${label} cancelled`);

    setActionLoading(null);
    setActiveTaskAction(null);
    load();
    if (jobId && selectedId === jobId) selectJob(jobId);
    else if (selectedId) {
      api.jobs.detail(selectedId).then(setDetail).catch(console.error);
    }
  }, [taskRun.status]);

  const handleRefetch = async (jobId: string) => {
    await startJobTask(`refetch-${jobId}`, "refetch-job", { jobId }, "Refetch", jobId);
  };

  const handleFilter = async (jobId: string) => {
    await startJobTask(`filter-${jobId}`, "normal-filter-job", { jobId }, "Filter", jobId);
  };

  const handleSmartFilter = async (jobId: string) => {
    const key = `smart-filter-${jobId}`;
    setActionLoading(key);
    setActionMsg(null);
    setActiveTaskAction({ key, jobId, label: "Smart filter" });
    try {
      const result = await api.jobs.smartFilter(jobId);
      setActionMsg("Smart filter queued");
      taskRun.subscribe(result.runId);
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
      setActionLoading(null);
      setActiveTaskAction(null);
    }
  };

  const handleSmartFilterAccepted = async () => {
    await startJobTask("smart-filter-accepted", "smart-filter-accepted", { force: false }, "Smart filter accepted");
  };

  const handleFilterCandidates = async () => {
    await startJobTask("filter-candidates", "normal-filter-batch", { limit: 0 }, "Normal filter");
  };

  const handleGenerateDoc = async (jobId: string, type: "cv" | "cover_letter" | "recommendation", force = false) => {
    const label = formatDocType(type);
    const key = `doc-${jobId}-${type}`;
    setActionLoading(key);
    setActionMsg(null);

    try {
      const result = await api.jobs.generateDocument(jobId, type, force);
      setActionMsg(result.message || `${label} ${result.exists ? "already exists" : "generated"}`);
      load();
      if (selectedId === jobId) {
        const updated = await api.jobs.detail(jobId);
        setDetail(updated);
      }
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateApplication = async (jobId: string) => {
    await startJobTask(`app-${jobId}`, "create-application", { jobId }, "Application creation", jobId);
  };

  const loadApplyLatest = async (jobId: string) => {
    try {
      const result = await api.apply.latest(jobId);
      setApplyRun(result);
    } catch {
      setApplyRun({ run: null, steps: [] });
    }
  };

  const handleRunApply = async (jobId: string) => {
    setActionLoading(`apply-run-${jobId}`);
    setActionMsg(null);
    try {
      const res = await api.apply.run(jobId);
      setActionMsg("Apply run started");
      setApplyRun((current) => ({
        run: current.run?.id === res.runId
          ? { ...current.run, status: "running" }
          : {
            id: res.runId,
            jobId,
            status: "running",
            profilePath: "",
            outputDir: "",
            currentUrl: "",
            error: null,
            summary: "{}",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        steps: current.run?.id === res.runId ? current.steps : [],
      }));
      pollApplyLatest(jobId, res.runId);
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeApply = async (jobId: string, runId: string) => {
    setActionLoading(`apply-resume-${runId}`);
    setActionMsg(null);
    try {
      const res = await api.apply.resume(runId);
      setActionMsg(`Apply run ${res.result.status}`);
      await loadApplyLatest(jobId);
      if (res.result.status === "running" || res.result.status === "needs_user") {
        pollApplyLatest(jobId, runId);
      }
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelApply = async (jobId: string, runId: string) => {
    setActionLoading(`apply-cancel-${runId}`);
    setActionMsg(null);
    try {
      await api.apply.cancel(runId);
      setActionMsg("Apply run cancelled");
      await loadApplyLatest(jobId);
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const pollApplyLatest = (jobId: string, runId: string, attempt = 0) => {
    window.setTimeout(async () => {
      try {
        const result = await api.apply.latest(jobId);
        setApplyRun(result);
        if (result.run?.id === runId && result.run.status === "running" && attempt < APPLY_POLL_LIMIT) {
          pollApplyLatest(jobId, runId, attempt + 1);
        }
      } catch (err: any) {
        setActionMsg(`Error: ${err.message}`);
      }
    }, APPLY_POLL_INTERVAL_MS);
  };

  const companies = filterOptions.companies;
  const statuses = filterOptions.statuses;
  const acceptedCount = summary.accepted;
  const rejectedCount = summary.rejected;
  const unfilteredCount = summary.unfiltered;
  const smartAcceptedCount = summary.smartAccepted;
  const smartRejectedCount = summary.smartRejected;
  const smartUnfilteredCount = summary.smartUnfiltered;

  return (
    <div className="jobs-layout">
      <div className="jobs-main">
        <div className="page-header">
          <div>
            <h1>Jobs</h1>
            <div className="page-subtitle">
              {total} positions across {companies.length} companies.
            </div>
          </div>
          <div className="doc-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleFilterCandidates}
              disabled={actionLoading === "filter-candidates"}
              title="Run deterministic filter on unfiltered open jobs"
            >
              {actionLoading === "filter-candidates" ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
              Filter Candidates
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSmartFilterAccepted}
              disabled={actionLoading === "smart-filter-accepted" || acceptedCount === 0}
              title="Run AI smart filter on accepted jobs that have not already had a smart filter"
            >
              {actionLoading === "smart-filter-accepted" ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
              Smart Filter Accepted
            </button>
            <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="filter-summary filter-summary-bar" style={{ marginBottom: 12 }}>
          <div className="filter-summary-group">
            <span className="filter-summary-label">AI</span>
            <span className="score-badge score-high">Accepted {acceptedCount}</span>
            <span className="score-badge score-low">Rejected {rejectedCount}</span>
            <span className="text-sm text-muted">Unfiltered {unfilteredCount}</span>
          </div>
          <div className="filter-summary-group">
            <span className="filter-summary-label">Smart</span>
            <span className="score-badge score-high">Accepted {smartAcceptedCount}</span>
            <span className="score-badge score-low">Rejected {smartRejectedCount}</span>
            <span className="text-sm text-muted">Unfiltered {smartUnfilteredCount}</span>
          </div>
        </div>

        <div className="jobs-toolbar">
          <div className="toolbar-search">
            <Search size={14} />
            <input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetToFirstPage();
              }}
            />
          </div>
          <select value={companyFilter} onChange={(e) => {
            setCompanyFilter(e.target.value);
            resetToFirstPage();
          }}>
            <option value="">All companies</option>
            {companies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => {
            setStatusFilter(e.target.value);
            resetToFirstPage();
          }}>
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={verdictFilter} onChange={(e) => {
            setVerdictFilter(e.target.value);
            resetToFirstPage();
          }}>
            <option value="">All AI filters</option>
            <option value="accept">AI accepted</option>
            <option value="reject">AI rejected</option>
            <option value="unfiltered">AI unfiltered</option>
          </select>
          <select value={smartVerdictFilter} onChange={(e) => {
            setSmartVerdictFilter(e.target.value);
            resetToFirstPage();
          }}>
            <option value="">All smart filters</option>
            <option value="accept">Smart accepted</option>
            <option value="reject">Smart rejected</option>
            <option value="unfiltered">Smart unfiltered</option>
          </select>
          <select value={fetchedWithinHours} onChange={(e) => {
            setFetchedWithinHours(Number(e.target.value));
            resetToFirstPage();
          }}>
            <option value={0}>All fetched jobs</option>
            <option value={24}>Fetched in last 24 hours</option>
            <option value={72}>Fetched in last 3 days</option>
            <option value={168}>Fetched in last 7 days</option>
          </select>
          <div className="toolbar-score">
            <span className="text-sm text-muted">Min: {minScore}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => {
                setMinScore(Number(e.target.value));
                resetToFirstPage();
              }}
              className="score-slider"
            />
          </div>
          <select value={pageSize} onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={200}>200 / page</option>
            <option value={1000}>1000 / page</option>
          </select>
        </div>

        {actionMsg && (
          <div className="action-toast" onClick={() => setActionMsg(null)}>
            {actionMsg}
            {taskRun.status && activeTaskAction && <TaskStatusBadge status={taskRun.status} />}
            <X size={14} />
          </div>
        )}

        {activeTaskAction && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span className="text-sm text-muted">{activeTaskAction.label}</span>
              <TaskStatusBadge status={taskRun.status || "queued"} />
            </div>
            <TaskLogPanel logs={taskRun.logs} maxHeight={180} />
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <p className="text-muted" style={{ padding: "24px 0" }}>No jobs found.</p>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Title</th>
                <th>Location</th>
                <th>ATS</th>
                <th>AI Filter</th>
                <th>Smart Filter</th>
                <th>Status</th>
                <th>Docs</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const isSelected = selectedId === job.id;
                const docIcons: string[] = [];
                if (job.hasCv) docIcons.push("CV");
                if (job.hasCoverLetter) docIcons.push("CL");
                if (job.hasRecommendation) docIcons.push("Rec");

                return (
                  <tr
                    key={job.id}
                    className={`job-row${isSelected ? " selected" : ""}`}
                    onClick={() => selectJob(job.id)}
                  >
                    <td className="cell-company">
                      <span className="company-badge">{job.companyName}</span>
                    </td>
                    <td className="cell-title">{job.title}</td>
                    <td className="text-sm text-muted">{job.location || "—"}</td>
                    <td>
                      <span className="ats-pill">{job.ats || "—"}</span>
                    </td>
                    <td>
                      <FilterStatus verdict={job.verdict} score={job.score} />
                    </td>
                    <td>
                      <FilterStatus verdict={job.smartVerdict} score={job.smartScore} />
                    </td>
                    <td>
                      <span className={`status-tag ${job.status}`}>{job.status}</span>
                    </td>
                    <td>
                      <div className="doc-indicators">
                        {docIcons.map((d) => (
                          <span key={d} className="doc-dot" title={d}>{d}</span>
                        ))}
                        {docIcons.length === 0 && <span className="text-muted text-sm">—</span>}
                      </div>
                    </td>
                    <td className="text-sm text-muted">
                      {new Date(job.updatedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <ChevronRight size={14} className="text-muted" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <span className="text-sm text-muted">
            {total === 0
              ? "0 jobs"
              : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
          </span>
          <div className="pagination-actions">
            <button className="btn btn-sm btn-ghost" onClick={() => setPage(1)} disabled={loading || page <= 1}>
              First
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
              Prev
            </button>
            <span className="text-sm text-muted">Page {page} / {totalPages}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={loading || page >= totalPages}>
              Next
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setPage(totalPages)} disabled={loading || page >= totalPages}>
              Last
            </button>
          </div>
        </div>
      </div>

      <aside className="jobs-detail">
        {!selectedId && (
          <div className="detail-empty">
            <Briefcase size={32} />
            <p className="text-muted">Select a job to view details</p>
          </div>
        )}
        {selectedId && detailLoading && (
          <div className="detail-empty">
            <Loader2 size={24} className="spin" />
            <p className="text-muted">Loading...</p>
          </div>
        )}
        {selectedId && detail && !detailLoading && (
          <JobDetailPanel
            detail={detail}
            actionLoading={actionLoading}
            onFilter={handleFilter}
            onSmartFilter={handleSmartFilter}
            onGenerateDoc={handleGenerateDoc}
            onCreateApplication={handleCreateApplication}
            onRefresh={() => selectJob(detail.id)}
            onRefetch={handleRefetch}
            applyRun={applyRun}
            onRunApply={handleRunApply}
            onResumeApply={handleResumeApply}
            onCancelApply={handleCancelApply}
          />
        )}
      </aside>
    </div>
  );
}

function FilterStatus({ verdict, score }: { verdict: string | null; score: number | null }) {
  if (!verdict && score === null) {
    return <span className="text-muted text-sm">—</span>;
  }

  const label = verdict === "accept" ? "accepted" : verdict === "reject" ? "rejected" : verdict || "filtered";
  const scoreClass = score === null ? "score-mid" : score >= 90 ? "score-high" : score >= 80 ? "score-mid" : "score-low";

  return (
    <div className="filter-cell">
      {verdict && <span className={`status-tag ${verdict}`}>{label}</span>}
      {score !== null && <span className={`score-badge ${scoreClass}`}>{score}</span>}
    </div>
  );
}

function JobDetailPanel({
  detail,
  actionLoading,
  onFilter,
  onSmartFilter,
  onGenerateDoc,
  onCreateApplication,
  onRefresh,
  onRefetch,
  applyRun,
  onRunApply,
  onResumeApply,
  onCancelApply,
}: {
  detail: JobDetail;
  actionLoading: string | null;
  onFilter: (jobId: string) => void;
  onSmartFilter: (jobId: string) => void;
  onGenerateDoc: (jobId: string, type: "cv" | "cover_letter" | "recommendation", force?: boolean) => void;
  onCreateApplication: (jobId: string) => void;
  onRefresh: () => void;
  onRefetch: (jobId: string) => void;
  applyRun: { run: import("../api").ApplyRun | null; steps: import("../api").ApplyRunStep[] };
  onRunApply: (jobId: string) => void;
  onResumeApply: (jobId: string, runId: string) => void;
  onCancelApply: (jobId: string, runId: string) => void;
}) {
  const hasDoc = (type: string) => detail.documents.some((d) => d.type === type);
  const isLoading = (key: string) => actionLoading === key;

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h2>{detail.title}</h2>
        <div className="detail-meta">
          <span className="company-badge">{detail.companyName}</span>
          <span className="ats-pill">{detail.ats || "—"}</span>
          <span className="text-muted">{detail.location || "—"}</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-actions">
          {detail.url && (
            <a href={detail.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
              <ExternalLink size={14} /> Apply
            </a>
          )}
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onFilter(detail.id)}
            disabled={isLoading(`filter-${detail.id}`)}
          >
            {isLoading(`filter-${detail.id}`) ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
            Filter
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onSmartFilter(detail.id)}
            disabled={isLoading(`smart-filter-${detail.id}`)}
            title={detail.canSmartFilter ? "Run the AI smart filter for this accepted candidate" : "Run the AI smart filter for this job"}
          >
            {isLoading(`smart-filter-${detail.id}`) ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            {detail.latestSmartFilter ? "Re-run Smart Filter" : "Smart Filter"}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => onRefetch(detail.id)}
            disabled={isLoading(`refetch-${detail.id}`)}
          >
            {isLoading(`refetch-${detail.id}`) ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            {isLoading(`refetch-${detail.id}`) ? "Refetching" : "Refetch"}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onRefresh}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {detail.latestFilter && (
        <div className="detail-section">
          <h3>Filter Result</h3>
          <div className="filter-summary">
            <span className={`score-badge ${detail.latestFilter.score >= 90 ? "score-high" : detail.latestFilter.score >= 80 ? "score-mid" : "score-low"}`}>
              {detail.latestFilter.verdict} · {detail.latestFilter.score}
            </span>
            {detail.latestFilter.promptVersion === "smart-filter-v1" && (
              <span className="score-badge score-ai">AI</span>
            )}
          </div>
          {detail.latestFilter.reasons.length > 0 && (
            <ul className="reason-list">
              {detail.latestFilter.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {detail.latestFilter.mustHaveHits.length > 0 && (
            <div className="filter-detail">
              <span className="label">Hits:</span>
              <span className="text-muted">{detail.latestFilter.mustHaveHits.join(", ")}</span>
            </div>
          )}
          {detail.latestFilter.missingItems.length > 0 && (
            <div className="filter-detail">
              <span className="label">Missing:</span>
              <span className="text-muted">{detail.latestFilter.missingItems.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      {detail.latestSmartFilter && detail.latestFilter?.id !== detail.latestSmartFilter.id && (
        <div className="detail-section">
          <h3>Smart Filter Result</h3>
          <div className="filter-summary">
            <span className={`score-badge ${detail.latestSmartFilter.score >= 90 ? "score-high" : detail.latestSmartFilter.score >= 80 ? "score-mid" : "score-low"}`}>
              {detail.latestSmartFilter.verdict} · {detail.latestSmartFilter.score}
            </span>
            <span className="score-badge score-ai">AI</span>
          </div>
          {detail.latestSmartFilter.reasons.length > 0 && (
            <ul className="reason-list">
              {detail.latestSmartFilter.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {detail.latestSmartFilter.mustHaveHits.length > 0 && (
            <div className="filter-detail">
              <span className="label">Hits:</span>
              <span className="text-muted">{detail.latestSmartFilter.mustHaveHits.join(", ")}</span>
            </div>
          )}
          {detail.latestSmartFilter.missingItems.length > 0 && (
            <div className="filter-detail">
              <span className="label">Missing:</span>
              <span className="text-muted">{detail.latestSmartFilter.missingItems.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      <div className="detail-section">
        <h3>Documents</h3>
        <div className="doc-actions">
          <button
            className={`btn btn-sm ${hasDoc("cv") ? "btn-success" : "btn-ghost"}`}
            onClick={() => onGenerateDoc(detail.id, "cv")}
            disabled={isLoading(`doc-${detail.id}-cv`)}
          >
            {isLoading(`doc-${detail.id}-cv`) ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
            {hasDoc("cv") ? "CV ✓" : "Generate CV"}
          </button>
          {hasDoc("cv") && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onGenerateDoc(detail.id, "cv", true)}
              disabled={isLoading(`doc-${detail.id}-cv`)}
              title="Regenerate CV"
            >
              <RefreshCw size={14} /> Regenerate
            </button>
          )}
          <button
            className={`btn btn-sm ${hasDoc("cover_letter") ? "btn-success" : "btn-ghost"}`}
            onClick={() => onGenerateDoc(detail.id, "cover_letter")}
            disabled={isLoading(`doc-${detail.id}-cover_letter`)}
          >
            {isLoading(`doc-${detail.id}-cover_letter`) ? <Loader2 size={14} className="spin" /> : <FileSignature size={14} />}
            {hasDoc("cover_letter") ? "Cover Letter ✓" : "Cover Letter"}
          </button>
          {hasDoc("cover_letter") && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onGenerateDoc(detail.id, "cover_letter", true)}
              disabled={isLoading(`doc-${detail.id}-cover_letter`)}
              title="Regenerate cover letter"
            >
              <RefreshCw size={14} /> Regenerate
            </button>
          )}
          <button
            className={`btn btn-sm ${hasDoc("recommendation") ? "btn-success" : "btn-ghost"}`}
            onClick={() => onGenerateDoc(detail.id, "recommendation")}
            disabled={isLoading(`doc-${detail.id}-recommendation`)}
          >
            {isLoading(`doc-${detail.id}-recommendation`) ? <Loader2 size={14} className="spin" /> : <FileSignature size={14} />}
            {hasDoc("recommendation") ? "Rec. ✓" : "Recommendation"}
          </button>
          {hasDoc("recommendation") && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onGenerateDoc(detail.id, "recommendation", true)}
              disabled={isLoading(`doc-${detail.id}-recommendation`)}
              title="Regenerate recommendation"
            >
              <RefreshCw size={14} /> Regenerate
            </button>
          )}
        </div>
        {detail.documents.length > 0 && (
          <div className="doc-list">
            {detail.documents.map((d) => (
              <div key={d.id} className="doc-item">
                <span className={`doc-type ${d.type}`}>{formatDocType(d.type)}</span>
                <span className="text-sm text-muted">{new Date(d.createdAt).toLocaleDateString()}</span>
                {d.filePath && (
                  <a
                    href={api.jobs.documentDownloadUrl(detail.id, d.id)}
                    className="doc-file text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={12} /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Application</h3>
        {detail.application ? (
          <div className="app-status">
            <span className={`status-tag ${detail.application.status}`}>{detail.application.status}</span>
            <span className="text-sm text-muted">Score: {detail.application.score}</span>
          </div>
        ) : (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onCreateApplication(detail.id)}
            disabled={isLoading(`app-${detail.id}`)}
          >
            {isLoading(`app-${detail.id}`) ? <Loader2 size={14} className="spin" /> : <UserCheck size={14} />}
            Create Application
          </button>
        )}
      </div>

      <div className="detail-section">
        <h3>Apply Agent</h3>
        <div className="doc-actions">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onRunApply(detail.id)}
            disabled={isLoading(`apply-run-${detail.id}`)}
          >
            {isLoading(`apply-run-${detail.id}`) ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
            Run Apply Agent
          </button>
          {applyRun.run && applyRun.steps.some((step) => step.label === "browser-left-open") && (
            <>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onResumeApply(detail.id, applyRun.run!.id)}
                disabled={isLoading(`apply-resume-${applyRun.run.id}`)}
              >
                {isLoading(`apply-resume-${applyRun.run.id}`) ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
                Resume
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onCancelApply(detail.id, applyRun.run!.id)}
                disabled={isLoading(`apply-cancel-${applyRun.run.id}`)}
              >
                {isLoading(`apply-cancel-${applyRun.run.id}`) ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                Cancel
              </button>
            </>
          )}
          <button className="btn btn-sm btn-ghost" onClick={() => onRefresh()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {applyRun.run && (
          <div className="apply-run-status" style={{ marginTop: 8 }}>
            <div className="filter-summary">
              <span className={`status-tag ${applyRun.run.status}`}>{applyRun.run.status}</span>
              {applyRun.run.error && <span className="text-sm text-muted" style={{ marginLeft: 8 }}>Error: {applyRun.run.error}</span>}
            </div>

            {(() => {
              let summary: Record<string, any> = {};
              try { if (applyRun.run?.summary) summary = JSON.parse(applyRun.run.summary); } catch {}
              const blockersList: string[] = Array.isArray(summary.blockers) ? summary.blockers : [];
              const lastScreenshot = applyRun.steps.filter(s => s.type === "screenshot" && s.screenshotPath).pop();

              return (
                <>
                  {(summary.fieldsDetected > 0 || summary.fieldsFilled > 0 || summary.requiredEmptyCount > 0) && (
                    <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12 }}>
                      {summary.fieldsDetected > 0 && <span>Detected: <strong>{summary.fieldsDetected}</strong></span>}
                      {summary.fieldsFilled > 0 && <span>Filled: <strong>{summary.fieldsFilled}</strong></span>}
                      {summary.requiredEmptyCount > 0 && <span>Required empty: <strong>{summary.requiredEmptyCount}</strong></span>}
                      {summary.submitFound && <span>Submit: <strong>Found</strong></span>}
                    </div>
                  )}

                  {blockersList.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      {blockersList.map((b, i) => (
                        <div key={i} style={{ color: "var(--warn)" }}>⚠ {b}</div>
                      ))}
                    </div>
                  )}

                  {applyRun.steps.length > 0 && (
                    <div className="apply-steps" style={{ marginTop: 8, fontSize: 13 }}>
                      {applyRun.steps.map((step) => (
                        <div key={step.id} className="apply-step" style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "2px 0" }}>
                          <span className="step-type" style={{ minWidth: 80, fontWeight: 500, textTransform: "capitalize" }}>{step.type}</span>
                          <span className="text-muted" style={{ flex: 1 }}>{step.label}{step.detail ? `: ${step.detail.slice(0, 100)}` : ""}</span>
                          {step.screenshotPath && applyRun.run && (
                            <a
                              href={api.apply.screenshotUrl(applyRun.run.id, step.screenshotPath.split("/").pop() || "")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "0 4px" }}
                            >
                              <Image size={12} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {lastScreenshot && summary.submitFound && (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      <a
                        href={api.apply.screenshotUrl(applyRun.run.id, lastScreenshot.screenshotPath!.split("/").pop() || "")}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "underline" }}
                      >
                        View final screenshot
                      </a>
                    </div>
                  )}

                  {summary.submitFound && applyRun.run.status !== "failed" && (
                    <div className="apply-safety-banner" style={{ marginTop: 8, padding: "6px 10px", background: "#f7ecec", borderRadius: 6, border: "1px solid rgba(192,85,85,0.3)", fontSize: 12, color: "var(--danger)" }}>
                      <strong>Stopped before submit</strong> — review the application form, then submit manually.
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {detail.description && (
        <div className="detail-section">
          <h3>Description</h3>
          <pre className="detail-description">{detail.description}</pre>
        </div>
      )}
    </div>
  );
}

function formatDocType(type: string): string {
  if (type === "cv") return "CV";
  if (type === "cover_letter") return "Cover letter";
  if (type === "recommendation") return "Recommendation";
  return type;
}
