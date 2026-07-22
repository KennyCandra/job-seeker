import { useState, useEffect, useRef } from "react";
import { api, type ApplicationRow, type AppStatus } from "../api";
import { ExternalLink, RefreshCw, Loader2, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const STATUSES: AppStatus[] = [
  "approved", "ready", "applied", "interviewing",
  "offer", "rejected", "ghosted", "withdrawn",
];

function scoreClass(score: number) {
  return score >= 90 ? "score-high" : score >= 80 ? "score-mid" : "score-low";
}

function AiVerdict({ documents }: { documents: string }) {
  const doc = (() => {
    try { return JSON.parse(documents); } catch { return null; }
  })();
  const filter = doc?.filter as { verdict?: string; score?: number; reasons?: string[]; must_have_hits?: string[]; missing?: string[] } | undefined;

  return (
    <div>
      <div className="detail-section-label">AI verdict</div>
      {filter ? (
        <>
          {filter.reasons && filter.reasons.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {filter.reasons.map((r, i) => (
                <div key={i} style={{ fontSize: 12.5, color: "#5f5b52", display: "block" }}>• {r}</div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: "#5f5b52" }}>
            <b>Strengths:</b> {filter.must_have_hits && filter.must_have_hits.length > 0 ? filter.must_have_hits.join(", ") : "—"}
          </div>
          <div style={{ fontSize: 12.5, color: "#5f5b52", marginTop: 2 }}>
            <b>Gaps:</b> {filter.missing && filter.missing.length > 0 ? filter.missing.join(", ") : "—"}
          </div>
        </>
      ) : (
        <div className="text-sm text-muted">No filter result recorded for this application.</div>
      )}
    </div>
  );
}

export default function Applications() {
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [genLogs, setGenLogs] = useState<{ jobId: string; logs: string[] }>({ jobId: "", logs: [] });
  const [genDone, setGenDone] = useState<string | null>(null);
  const [pdfExists, setPdfExists] = useState<Set<string>>(new Set());
  const logRef = useRef<HTMLDivElement>(null);

  const load = (cursor?: string | null) => {
    const append = Boolean(cursor);
    if (append) setLoadingMore(true);
    else setLoading(true);

    api.applications.list(cursor)
      .then((result) => {
        setApps((current) => append ? [...current, ...result.items] : result.items);
        setNextCursor(result.nextCursor);
      })
      .catch(console.error)
      .finally(() => {
        if (append) setLoadingMore(false);
        else setLoading(false);
      });
  };

  const refresh = () => {
    setLoading(true);
    setNextCursor(null);
    load(null);
  };

  useEffect(() => {
    load(null);
  }, []);

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
                    refresh();
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
        <div>
          <h1>Applications</h1>
          <div className="page-subtitle">{apps.length} in flight. Click a row to see the AI verdict and manage documents.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
          <RefreshCw size={14} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!loading && apps.length === 0 && (
        <p className="text-muted">No applications yet. Promote a job from the Jobs page.</p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Score</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => {
              const hasPdf = pdfExists.has(app.jobId);
              const isExpanded = expanded === app.jobId;
              return (
                <>
                  <tr
                    key={app.jobId}
                    onClick={() => setExpanded(isExpanded ? null : app.jobId)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 700 }}>{app.company}</td>
                    <td>{app.title}</td>
                    <td>
                      <span className={`score-badge ${scoreClass(app.score)}`}>{app.score}</span>
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
                        className="status-select"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-sm text-muted font-mono">
                      {new Date(app.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                    </td>
                    <td>
                      <div className="flex gap-8" style={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                        {isExpanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${app.jobId}-docs`}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div className="app-inset">
                          <div className="app-inset-grid">
                            <AiVerdict documents={app.documents} />
                            <div>
                              <div className="detail-section-label">Documents</div>
                              <div className="doc-list">
                                {hasPdf && (
                                  <div className="doc-item">
                                    <span className="doc-type cv">CV</span>
                                    cv_tailored.pdf
                                    <a
                                      href={api.applications.pdfUrl(app.jobId)}
                                      className="doc-file"
                                      onClick={(e) => {
                                        window.open(api.applications.pdfUrl(app.jobId), "_blank");
                                        e.preventDefault();
                                      }}
                                    >
                                      Download
                                    </a>
                                  </div>
                                )}
                                {!hasPdf && (
                                  <div className="text-sm text-muted">No documents generated yet.</div>
                                )}
                              </div>
                              <div className="flex gap-8" style={{ marginTop: 12 }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleGenerate(app, hasPdf)}
                                  disabled={generating === app.jobId}
                                >
                                  {generating === app.jobId ? "Working…" : hasPdf ? "Regenerate" : "Create CV"}
                                </button>
                                {app.url && (
                                  <a href={app.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
                                    <ExternalLink size={14} /> Open apply page
                                  </a>
                                )}
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDelete(app.jobId)}
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                              {genLogs.logs.length > 0 && genLogs.jobId === app.jobId && (
                                <div className="log-panel" ref={logRef} style={{ maxHeight: 150, marginTop: 12 }}>
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
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => load(nextCursor)} disabled={loadingMore}>
            {loadingMore ? <Loader2 size={14} className="spin" /> : <ChevronDown size={14} />}
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
