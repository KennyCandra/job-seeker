import { useState, useEffect, useRef } from "react";
import { api, type ShortlistItem } from "../api";

interface LogLine {
  type: string;
  message: string;
}

function scoreClass(score: number) {
  return score >= 90 ? "score-high" : score >= 80 ? "score-mid" : "score-low";
}

// Verdict pill (strong/good/fair) is a presentation-only band derived from
// the score, matching the README's scoring bands. The underlying accept/
// reject verdict from the API is unchanged and still drives what's shown.
function verdictBand(score: number): "strong" | "good" | "fair" {
  if (score >= 90) return "strong";
  if (score >= 80) return "good";
  return "fair";
}

export default function Shortlist() {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [genLogs, setGenLogs] = useState<LogLine[]>([]);
  const [genDone, setGenDone] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    api.shortlist.list().then(setItems).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDismiss = async (jobId: string) => {
    await api.shortlist.delete(jobId);
    setItems((prev) => prev.filter((i) => i.jobId !== jobId));
  };

  const handleGenerate = (item: ShortlistItem) => {
    setGenerating(item.jobId);
    setGenLogs([]);
    setGenDone(null);

    const body = JSON.stringify({ jobId: item.jobId });

    fetch("/api/cv/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
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

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith("data: ")) {
              const data = JSON.parse(dataLine.slice(6));
              if (eventType === "log") {
                setGenLogs((prev) => [...prev, data as LogLine]);
              } else if (eventType === "done") {
                if (data.pdfPath) setGenDone(data.pdfPath);
                setGenerating(null);
              }
            }
          }
        }
      }
    }).catch((err) => {
      setGenLogs((prev) => [...prev, { type: "error", message: err.message }]);
      setGenerating(null);
    });
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [genLogs]);

  const accepted = items.filter((i) => i.verdict === "accept");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Shortlist</h1>
          <div className="page-subtitle">
            {accepted.length} AI-matched roles, ranked by fit. Generate a tailored CV in one click.
          </div>
        </div>
        <div className="flex" style={{ gap: 12, alignItems: "center" }}>
          <div className="shortlist-filters">
            <span>score ≥ 70</span>
            <span>all platforms</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {!loading && accepted.length === 0 && (
        <p className="text-muted">No shortlist items. Run the pipeline first.</p>
      )}

      <div className="shortlist-grid">
        {accepted.map((item) => (
          <div key={item.jobId} className="shortlist-card">
            <div className="shortlist-card-head">
              <div className={`shortlist-score ${scoreClass(item.score)}`}>{item.score}</div>
              <span className={`verdict-pill ${verdictBand(item.score)}`}>{verdictBand(item.score)}</span>
            </div>
            <div className="title">{item.title}</div>
            <div className="meta">{item.company} · {item.location}</div>

            {item.reasons.length > 0 && (
              <div className="shortlist-reasons">
                {item.reasons.slice(0, 3).map((r, i) => (
                  <div key={i}>
                    <span className="chevron">›</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="shortlist-card-actions">
              <button
                className="btn btn-ink"
                onClick={() => handleGenerate(item)}
                disabled={generating === item.jobId}
              >
                {generating === item.jobId ? "Generating…" : "Tailor CV"}
              </button>
              {item.applyUrl ? (
                <a
                  href={item.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ textDecoration: "none" }}
                >
                  View
                </a>
              ) : (
                <button className="btn btn-ghost" onClick={() => handleDismiss(item.jobId)}>
                  Dismiss
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {generating && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Generating CV...</h2>
            <div className="log-panel" ref={logRef} style={{ maxHeight: 200 }}>
              {genLogs.map((l, i) => (
                <div key={i} className={`log-line ${l.type}`}>
                  <span>{l.message}</span>
                </div>
              ))}
            </div>
            {genDone && (
              <div style={{ marginTop: 16 }}>
                <a href={genDone} className="btn btn-success" download>
                  Download PDF
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
