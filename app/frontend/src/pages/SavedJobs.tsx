import { useState, useEffect } from "react";
import { api, type SavedJob } from "../api";

export default function SavedJobs() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [groupByCompany, setGroupByCompany] = useState(false);
  const [filtering, setFiltering] = useState<string | null>(null);
  const [filterMsg, setFilterMsg] = useState<{ jobId: string; text: string; ok: boolean } | null>(null);

  const load = () => {
    setLoading(true);
    api.savedJobs.list().then(setJobs).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFilter = async (job: SavedJob) => {
    setFiltering(job.jobId);
    setFilterMsg(null);
    try {
      const result = await api.savedJobs.filter(job.companySlug, job.jobId);
      if (result.accepted) {
        setFilterMsg({ jobId: job.jobId, text: `Accepted (${result.score}) — added to Applications`, ok: true });
      } else {
        setFilterMsg({ jobId: job.jobId, text: `Rejected (${result.score})`, ok: false });
      }
    } catch (err: any) {
      setFilterMsg({ jobId: job.jobId, text: `Error: ${err.message}`, ok: false });
    } finally {
      setFiltering(null);
    }
  };

  const displayed = groupByCompany
    ? jobs.reduce<Record<string, SavedJob[]>>((acc, j) => {
        const key = j.companySlug;
        if (!acc[key]) acc[key] = [];
        acc[key].push(j);
        return acc;
      }, {})
    : { "All": jobs };

  return (
    <div>
      <div className="page-header">
        <h1>Saved Jobs</h1>
        <div className="flex gap-8 items-center">
          {filterMsg && (
            <span className={`text-sm ${filterMsg.ok ? "text-muted" : ""}`} style={{ color: filterMsg.ok ? "var(--success)" : "var(--danger)" }}>
              {filterMsg.text}
            </span>
          )}
          <label className="text-sm text-muted" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={groupByCompany}
              onChange={() => setGroupByCompany(!groupByCompany)}
              style={{ marginRight: 6 }}
            />
            Group by company
          </label>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {!loading && jobs.length === 0 && (
        <p className="text-muted">No saved jobs found. Run the pipeline first.</p>
      )}

      {groupByCompany
        ? Object.entries(displayed).map(([company, companyJobs]) => (
            <div key={company} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>{company} ({companyJobs.length})</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Location</th>
                      <th>Saved</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyJobs.map((j) => (
                      <JobRow
                        key={j.jobId}
                        job={j}
                        expanded={expanded === j.jobId}
                        onToggle={() => setExpanded(expanded === j.jobId ? null : j.jobId)}
                        onFilter={handleFilter}
                        filtering={filtering}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Saved</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <JobRow
                    key={j.jobId}
                    job={j}
                    expanded={expanded === j.jobId}
                    onToggle={() => setExpanded(expanded === j.jobId ? null : j.jobId)}
                    onFilter={handleFilter}
                    filtering={filtering}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function JobRow({ job, expanded, onToggle, onFilter, filtering }: {
  job: SavedJob;
  expanded: boolean;
  onToggle: () => void;
  onFilter: (job: SavedJob) => void;
  filtering: string | null;
}) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: "pointer" }}>
        <td style={{ fontWeight: 500 }}>{job.title || "—"}</td>
        <td className="text-sm text-muted">{job.location || "—"}</td>
        <td className="text-sm text-muted">{new Date(job.createdAt).toLocaleDateString()}</td>
        <td>
          <div className="flex gap-8 items-center" style={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
            {job.processed && (
              <span className="tag" style={{ fontSize: 11 }}>Processed</span>
            )}
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
                Apply →
              </a>
            )}
            {!job.processed && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onFilter(job)}
                disabled={filtering === job.jobId}
              >
                {filtering === job.jobId ? "..." : "Filter"}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr key={`${job.jobId}-desc`}>
          <td colSpan={4} style={{ background: "var(--surface)", padding: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Description
            </div>
            <pre
              style={{
                fontSize: 12,
                whiteSpace: "pre-wrap",
                maxHeight: 400,
                overflowY: "auto",
                lineHeight: 1.5,
              }}
            >
              {job.description || "No description available"}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
