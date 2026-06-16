import { useState, useEffect } from "react";
import { api } from "../api";
import { Save, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
  headline: string;
  summary: string;
  skillsJson: string;
  experienceJson: string;
  projectsJson: string;
  educationJson: string;
  preferencesJson: string;
}

interface Answer {
  id: string;
  category: string;
  question: string;
  answer: string;
  tagsJson: string;
}

const EMPTY_PROFILE: Profile = {
  id: "default",
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  portfolio: "",
  github: "",
  headline: "",
  summary: "",
  skillsJson: "[]",
  experienceJson: "[]",
  projectsJson: "[]",
  educationJson: "[]",
  preferencesJson: "{}",
};

function safeJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json); } catch { return fallback; }
}

export default function Profile() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"personal" | "skills" | "experience" | "education" | "projects" | "preferences" | "answers">("personal");
  const [newAnswer, setNewAnswer] = useState({ category: "", question: "", answer: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, answersRes] = await Promise.all([
        api.profile.get(),
        api.profile.answers.list(),
      ]);
      if (profileRes.profile) setProfile(profileRes.profile);
      setAnswers(answersRes.answers || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await api.profile.save(profile);
      setMsg("Profile saved");
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnswer = async () => {
    if (!newAnswer.category || !newAnswer.question || !newAnswer.answer) return;
    try {
      await api.profile.answers.create(newAnswer);
      setNewAnswer({ category: "", question: "", answer: "" });
      const res = await api.profile.answers.list();
      setAnswers(res.answers || []);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleDeleteAnswer = async (id: string) => {
    await api.profile.answers.delete(id);
    setAnswers((prev) => prev.filter((a) => a.id !== id));
  };

  const updateField = (field: keyof Profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const updateJsonField = (field: keyof Profile, value: string) => {
    try {
      JSON.parse(value);
      updateField(field, value);
    } catch {
      updateField(field, value);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  const tabs = [
    { id: "personal", label: "Personal" },
    { id: "skills", label: "Skills" },
    { id: "experience", label: "Experience" },
    { id: "education", label: "Education" },
    { id: "projects", label: "Projects" },
    { id: "preferences", label: "Preferences" },
    { id: "answers", label: "Answers" },
  ] as const;

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

      {msg && (
        <div className="action-toast" onClick={() => setMsg(null)}>
          {msg}
        </div>
      )}

      <div className="jobs-toolbar" style={{ marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === "personal" && (
          <div className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              <input value={profile.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input value={profile.email} onChange={(e) => updateField("email", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={profile.phone} onChange={(e) => updateField("phone", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={profile.location} onChange={(e) => updateField("location", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Headline</label>
              <input value={profile.headline} onChange={(e) => updateField("headline", e.target.value)} />
            </div>
            <div className="form-group">
              <label>LinkedIn</label>
              <input value={profile.linkedin} onChange={(e) => updateField("linkedin", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Portfolio</label>
              <input value={profile.portfolio} onChange={(e) => updateField("portfolio", e.target.value)} />
            </div>
            <div className="form-group">
              <label>GitHub</label>
              <input value={profile.github} onChange={(e) => updateField("github", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Summary</label>
              <textarea
                rows={4}
                value={profile.summary}
                onChange={(e) => updateField("summary", e.target.value)}
                placeholder="Brief professional summary..."
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
          </div>
        )}

        {tab === "skills" && (
          <div className="form-group">
            <label>Skills (JSON array)</label>
            <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
              Format: ["Skill1", "Skill2"] or [{"{ \"category\": \"Lang\", \"items\": [\"JS\", \"TS\"] }"}]
            </p>
            <textarea
              rows={10}
              value={profile.skillsJson}
              onChange={(e) => updateJsonField("skillsJson", e.target.value)}
              style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
            <div style={{ marginTop: 8 }}>
              <span className="text-sm text-muted">Preview: </span>
              {safeJson(profile.skillsJson, []).map((s: any, i: number) => (
                <span key={i} className="tag" style={{ marginRight: 4 }}>{typeof s === "string" ? s : s.category}</span>
              ))}
            </div>
          </div>
        )}

        {tab === "experience" && (
          <div className="form-group">
            <label>Experience (JSON array)</label>
            <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
              Format: [{"{ \"title\": \"SWE\", \"company\": \"Acme\", \"dates\": \"2020-2023\", \"bullets\": [\"...\"] }"}]
            </p>
            <textarea
              rows={15}
              value={profile.experienceJson}
              onChange={(e) => updateJsonField("experienceJson", e.target.value)}
              style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
          </div>
        )}

        {tab === "education" && (
          <div className="form-group">
            <label>Education (JSON array)</label>
            <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
              Format: [{"{ \"degree\": \"BSc CS\", \"school\": \"MIT\", \"year\": \"2020\" }"}]
            </p>
            <textarea
              rows={8}
              value={profile.educationJson}
              onChange={(e) => updateJsonField("educationJson", e.target.value)}
              style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
          </div>
        )}

        {tab === "projects" && (
          <div className="form-group">
            <label>Projects (JSON array)</label>
            <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
              Format: [{"{ \"name\": \"My App\", \"description\": \"...\", \"highlights\": [...], \"techStack\": \"...\" }"}]
            </p>
            <textarea
              rows={12}
              value={profile.projectsJson}
              onChange={(e) => updateJsonField("projectsJson", e.target.value)}
              style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
          </div>
        )}

        {tab === "preferences" && (
          <div className="form-group">
            <label>Preferences (JSON object)</label>
            <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
              Format: {"{ \"remote\": \"hybrid\", \"salary\": \"$100k+\", \"visa\": \"US citizen\" }"}
            </p>
            <textarea
              rows={8}
              value={profile.preferencesJson}
              onChange={(e) => updateJsonField("preferencesJson", e.target.value)}
              style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
          </div>
        )}

        {tab === "answers" && (
          <div>
            <div className="profile-form" style={{ marginBottom: 16, padding: 16, background: "var(--surface-2)", borderRadius: "var(--radius)" }}>
              <h3 style={{ fontSize: 13, marginBottom: 12 }}>Add Application Answer</h3>
              <div className="form-group">
                <label>Category</label>
                <input value={newAnswer.category} onChange={(e) => setNewAnswer((p) => ({ ...p, category: e.target.value }))} placeholder="e.g., salary, availability, work_authorization" />
              </div>
              <div className="form-group">
                <label>Question</label>
                <input value={newAnswer.question} onChange={(e) => setNewAnswer((p) => ({ ...p, question: e.target.value }))} placeholder="e.g., What is your salary expectation?" />
              </div>
              <div className="form-group">
                <label>Answer</label>
                <textarea
                  rows={2}
                  value={newAnswer.answer}
                  onChange={(e) => setNewAnswer((p) => ({ ...p, answer: e.target.value }))}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAddAnswer}>
                <Plus size={14} /> Add
              </button>
            </div>

            {answers.map((a) => (
              <div key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid #21262d" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span className="tag" style={{ marginBottom: 4 }}>{a.category}</span>
                    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{a.question}</div>
                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>{a.answer}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteAnswer(a.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {answers.length === 0 && (
              <p className="text-muted text-sm">No application answers defined yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
