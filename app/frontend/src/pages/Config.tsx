import { useState, useEffect } from "react";
import { api, type SearchConfig } from "../api";
import { Plus, X, Save } from "lucide-react";

function TagEditor({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setInput("");
  };

  const remove = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="tag-list">
        {tags.map((t, i) => (
          <span key={i} className="tag">
            {t}
            <span className="tag-remove" onClick={() => remove(i)}>
              <X size={12} />
            </span>
          </span>
        ))}
      </div>
      <div className="flex gap-8">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={`Add ${label.toLowerCase()}...`}
        />
        <button className="btn btn-ghost btn-sm" onClick={add}>
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

const ATS_OPTIONS = ["greenhouse", "lever", "ashby"];

export default function Config() {
  const [config, setConfig] = useState<SearchConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.config
      .get()
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof SearchConfig>(
    key: K,
    value: SearchConfig[K],
  ) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.config.save(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAtsToggle = (ats: string) => {
    if (!config) return;
    const next = config.ats.includes(ats)
      ? config.ats.filter((a) => a !== ats)
      : [...config.ats, ats];
    update("ats", next);
  };

  if (loading) return <p className="text-muted">Loading config...</p>;
  if (!config) return <p className="text-muted">No config found.</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Search Config</h1>
        <div className="flex gap-8">
          <span className="text-sm text-muted" style={{ alignSelf: "center" }}>
            {saved && "Saved!"}
          </span>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <TagEditor
          label="Roles"
          tags={config.roles}
          onChange={(v) => update("roles", v)}
        />

        <TagEditor
          label="Location"
          tags={config.location}
          onChange={(v) => update("location", v)}
        />

        <TagEditor
          label="Exclude"
          tags={config.exclude}
          onChange={(v) => update("exclude", v)}
        />

        <TagEditor
          label="Target Companies"
          tags={config.targetCompanies}
          onChange={(v) => update("targetCompanies", v)}
        />

        <div className="form-group">
          <label>ATS Platforms</label>
          <div className="flex gap-16">
            {ATS_OPTIONS.map((ats) => (
              <label
                key={ats}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={config.ats.includes(ats)}
                  onChange={() => handleAtsToggle(ats)}
                />
                {ats}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Min Score ({config.min_score})</label>
          <input
            type="range"
            min={0}
            max={100}
            value={config.min_score}
            onChange={(e) => update("min_score", Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div className="form-group">
          <label>Discovery Interval (hours)</label>
          <input
            type="number"
            min={0}
            max={720}
            value={config.discovery_interval_hours}
            onChange={(e) =>
              update("discovery_interval_hours", Number(e.target.value))
            }
          />
        </div>
      </div>
    </div>
  );
}
