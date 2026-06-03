import { useState, useEffect, useRef } from "react";
import { api, type ShortlistItem } from "../api";

interface LogLine {
  type: string;
  message: string;
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? "score-high" : score >= 65 ? "score-mid" : "score-low";
  return <span className={`score-badge ${cls}`}>{score}</span>;
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

    const es = new EventSource("/api/cv/generate");
    const body = JSON.stringify({ jobId: item.jobId });

    // Use POST via fetch with SSE parsing
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
        <h1>Shortlist</h1>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!loading && accepted.length === 0 && (
        <p className="text-muted">No shortlist items. Run the pipeline first.</p>
      )}

      <div className="card-grid">
        {accepted.map((item) => (
          <div key={item.jobId} className="card">
            <div className="flex items-center justify-between mb-16">
              <ScoreBadge score={item.score} />
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => handleDismiss(item.jobId)}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
              <div className="text-sm text-muted">{item.company}</div>
            </div>
            <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
              {item.location}
            </div>
            {item.applyUrl && (
              <a
                href={item.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm"
                style={{ display: "block", marginBottom: 12 }}
              >
                Apply URL →
              </a>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleGenerate(item)}
              disabled={generating === item.jobId}
            >
              {generating === item.jobId ? "⏳ Generating..." : "Generate CV"}
            </button>

            {item.reasons.length > 0 && (
              <div className="text-sm text-muted" style={{ marginTop: 8 }}>
                {item.reasons.slice(0, 2).map((r, i) => (
                  <div key={i}>• {r}</div>
                ))}
              </div>
            )}
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
