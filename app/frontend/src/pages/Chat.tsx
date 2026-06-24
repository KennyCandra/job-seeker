import { useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Loader2, X } from "lucide-react";

interface ManualJob {
  id: string;
  companySlug: string;
  companyName: string;
  title: string;
  location: string;
  url: string;
  description: string;
  status: string;
}

export default function Chat({ onViewJobs }: { onViewJobs?: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJob, setSavedJob] = useState<ManualJob | null>(null);

  const handleSave = async () => {
    const pasted = text.trim();
    if (pasted.length < 20 || saving) return;

    setSaving(true);
    setError(null);
    setSavedJob(null);

    try {
      const res = await fetch("/api/jobs/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save job");

      setSavedJob(data.job);
      setText("");
    } catch (err: any) {
      setError(err.message || "Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="chat-toggle" onClick={() => setOpen(!open)} title="Paste job">
        {open ? <X size={20} /> : <BriefcaseBusiness size={20} />}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>Paste Job</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              <X size={13} />
            </button>
          </div>

          <div className="paste-job-body">
            <p className="text-sm text-muted">
              Paste a job post or description. It will be extracted and saved under the Custom company.
            </p>

            <textarea
              className="paste-job-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste job title, company text, URL, location, and description..."
              disabled={saving}
            />

            {error && <div className="paste-job-alert error">{error}</div>}

            {savedJob && (
              <div className="paste-job-alert success">
                <CheckCircle2 size={16} />
                <div>
                  <strong>{savedJob.title || "Saved job"}</strong>
                  <span>{savedJob.companyName} · {savedJob.location || "No location"}</span>
                  <code>{savedJob.id}</code>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-area">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving || text.trim().length < 20}
            >
              {saving ? <Loader2 size={14} className="spin" /> : <BriefcaseBusiness size={14} />}
              {saving ? "Saving..." : "Save Job"}
            </button>
            {savedJob && (
              <button className="btn btn-ghost btn-sm" onClick={onViewJobs}>
                View in Jobs
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
