import { useState, useEffect, useRef } from "react";
import { api, type ApplicationRow, type AppStatus } from "../api";

const STATUSES: AppStatus[] = [
  "approved", "ready", "applied", "interviewing",
  "offer", "rejected", "ghosted", "withdrawn",
];

function parseDocuments(docStr: string): Record<string, string> {
  try {
    const arr = JSON.parse(docStr);
    if (Array.isArray(arr) && arr.length > 0) return arr[0];
    return {};
  } catch {
    return {};
  }
}

function FilterReasons({ documents, status }: { documents: string; status: string }) {
  const doc = (() => {
    try { return JSON.parse(documents); } catch { return null; }
  })();
  const filter = doc?.filter as { verdict?: string; score?: number; reasons?: string[]; must_have_hits?: string[]; missing?: string[] } | undefined;

  if (!filter) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
        Filter Result
      </div>
      <div className="tag-list">
        <span className="tag" style={{ fontWeight: 600 }}>
          {filter.verdict === "accept" ? "Accepted" : "Rejected"} · {filter.score}
        </span>
      </div>
      {filter.reasons && filter.reasons.length > 0 && (
        <div className="text-sm" style={{ marginTop: 4 }}>
          {filter.reasons.map((r, i) => (
            <div key={i} className="text-muted" style={{ fontSize: 12 }}>• {r}</div>
          ))}
        </div>
      )}
      {filter.must_have_hits && filter.must_have_hits.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <span className="text-sm text-muted" style={{ fontWeight: 600 }}>Hits: </span>
          <span className="text-sm text-muted">{filter.must_have_hits.join(", ")}</span>
        </div>
      )}
      {filter.missing && filter.missing.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <span className="text-sm text-muted" style={{ fontWeight: 600 }}>Missing: </span>
          <span className="text-sm text-muted">{filter.missing.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

export default function Applications() {
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [genLogs, setGenLogs] = useState<{ jobId: string; logs: string[] }>({ jobId: "", logs: [] });
  const [genDone, setGenDone] = useState<string | null>(null);
  const [pdfExists, setPdfExists] = useState<Set<string>>(new Set());
  const logRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    api.applications.list().then(setApps).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Check which apps have PDFs
  useEffect(() => {
    const check = async () => {
      const existing = new Set<string>();
      for (const app of apps) {
        try {
          const res = await fetch(api.applications.pdfUrl(app.jobId), { method: "HEAD" });
          if (res.ok) existing.add(app.jobId);
        } catch {}
      }
      setPdfExists(existing);
    };
    if (apps.length > 0) check();
  }, [apps]);

  const handleGenerate = (app: ApplicationRow, force = false) => {
    setGenerating(app.jobId);
    setGenLogs({ jobId: app.jobId, logs: [] });
    setGenDone(null);

    const url = force
      ? `${api.applications.generateSSE(app.jobId)}?force=true`
      : api.applications.generateSSE(app.jobId);

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(async (res) => {
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setGenLogs((prev) => ({ ...prev, logs: [...prev.logs, data.text] }));
              }
            } catch {}
          } else if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            const dataLine = lines[i + 1];
            if (dataLine?.startsWith("data: ")) {
              try {
                const data = JSON.parse(dataLine.slice(6));
                if (eventType === "exists") {
                  setGenLogs((prev) => ({ ...prev, logs: [...prev.logs, "CV already exists — click Regenerate to overwrite"] }));
                  setPdfExists((prev) => new Set(prev).add(app.jobId));
                  setGenerating(null);
                } else if (eventType === "log" && data.message) {
                  setGenLogs((prev) => ({ ...prev, logs: [...prev.logs, data.message] }));
                } else if (eventType === "done") {
                  if (data.pdfPath) setGenDone(data.pdfPath);
                  if (data.exists) {
                    setGenerating(null);
                  } else {
                    setPdfExists((prev) => new Set(prev).add(app.jobId));
                    setGenerating(null);
                    load();
                  }
                }
              } catch {}
            }
          }
        }
      }
    }).catch((err) => {
      setGenLogs((prev) => ({ ...prev, logs: [...prev.logs, `Error: ${err.message}`] }));
      setGenerating(null);
    });
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [genLogs]);

  const handleStatusChange = async (jobId: string, status: AppStatus) => {
    await api.applications.updateStatus(jobId, status);
    setApps((prev) =>
      prev.map((a) => (a.jobId === jobId ? { ...a, status } : a)),
    );
  };

  const handleDelete = async (jobId: string) => {
    await api.applications.delete(jobId);
    setApps((prev) => prev.filter((a) => a.jobId !== jobId));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Applications</h1>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!loading && apps.length === 0 && (
        <p className="text-muted">No applications yet.</p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Title</th>
              <th>Score</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => {
              const hasPdf = pdfExists.has(app.jobId);
              return (
                <>
                  <tr
                    key={app.jobId}
                    onClick={() =>
                      setExpanded(expanded === app.jobId ? null : app.jobId)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td>{app.company}</td>
                    <td>{app.title}</td>
                    <td>
                      <span
                        className={`score-badge ${
                          app.score >= 80
                            ? "score-high"
                            : app.score >= 65
                              ? "score-mid"
                              : "score-low"
                        }`}
                      >
                        {app.score}
                      </span>
                    </td>
                    <td>
                      <select
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(
                            app.jobId,
                            e.target.value as AppStatus,
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-sm text-muted">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-8" style={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                        {app.url && (
                          <a href={app.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
                            Apply →
                          </a>
                        )}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(app.jobId)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === app.jobId && (
                    <tr key={`${app.jobId}-docs`}>
                      <td colSpan={6} style={{ background: "var(--surface)", padding: 16 }}>
                        <FilterReasons documents={app.documents} status={app.status} />
                        {app.url && (
                          <div style={{ marginBottom: 8 }}>
                            <a href={app.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
                              Apply →
                            </a>
                          </div>
                        )}
                        <div className="flex gap-8">
                          {hasPdf ? (
                            <>
                              <span className="text-sm text-muted" style={{ alignSelf: "center" }}>
                                CV ready
                              </span>
                              <a
                                href={api.applications.pdfUrl(app.jobId)}
                                className="btn btn-sm btn-success"
                                download
                                onClick={(e) => {
                                  window.open(api.applications.pdfUrl(app.jobId), "_blank");
                                  e.preventDefault();
                                }}
                              >
                                Download PDF
                              </a>
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => handleGenerate(app, true)}
                                disabled={generating === app.jobId}
                              >
                                {generating === app.jobId ? "Regenerating..." : "Regenerate"}
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleGenerate(app)}
                              disabled={generating === app.jobId}
                            >
                              {generating === app.jobId ? "Generating..." : "Create CV"}
                            </button>
                          )}
                        </div>
                        {genLogs.logs.length > 0 && genLogs.jobId === app.jobId && (
                          <div className="log-panel" ref={logRef} style={{ marginTop: 8, maxHeight: 150 }}>
                            {genLogs.logs.map((msg, i) => (
                              <div key={i} className="log-line info"><span>{msg}</span></div>
                            ))}
                          </div>
                        )}
                        {genDone && genLogs.jobId === app.jobId && (
                          <div className="text-sm" style={{ marginTop: 4, color: "var(--success)" }}>
                            CV generated!
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
