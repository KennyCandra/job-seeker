import { useEffect, useState } from "react";
import { api } from "../api";
import { Save, Plus, Trash2, Loader2, User, Briefcase, GraduationCap, Wrench, FolderGit2, SlidersHorizontal } from "lucide-react";

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

interface SkillGroup {
  category: string;
  items: string[];
}

interface ExperienceItem {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

interface ProjectItem {
  name: string;
  link?: string;
  techStack: string;
  skillsUsed?: string;
  description?: string;
  highlights: string[];
}

interface EducationItem {
  degree: string;
  school: string;
  year: string;
}

type Tab = "personal" | "skills" | "experience" | "projects" | "education" | "preferences" | "answers" | "raw";

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

const blankExperience: ExperienceItem = { title: "", company: "", dates: "", bullets: [""] };
const blankProject: ProjectItem = { name: "", link: "", techStack: "", skillsUsed: "", description: "", highlights: [""] };
const blankEducation: EducationItem = { degree: "", school: "", year: "" };

function safeJson<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function linesToArray(value: string): string[] {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? lines : [""];
}

function arrayToLines(items: string[] | undefined): string {
  return (items || []).join("\n");
}

function parseSkills(json: string): SkillGroup[] {
  const raw = safeJson<any[]>(json, []);
  if (!Array.isArray(raw)) return [];

  const groups: SkillGroup[] = [];
  const loose: string[] = [];

  for (const item of raw) {
    if (typeof item === "string") loose.push(item);
    else if (item && typeof item === "object") {
      groups.push({
        category: String(item.category || "General"),
        items: Array.isArray(item.items) ? item.items.map(String) : [],
      });
    }
  }

  if (loose.length > 0) groups.unshift({ category: "General", items: loose });
  return groups;
}

function parseArray<T>(json: string): T[] {
  const value = safeJson<T[]>(json, []);
  return Array.isArray(value) ? value : [];
}

function completion(profile: Profile, answers: Answer[]): number {
  const checks = [
    profile.fullName,
    profile.email,
    profile.location,
    profile.headline,
    profile.summary,
    parseSkills(profile.skillsJson).length > 0 ? "skills" : "",
    parseArray(profile.experienceJson).length > 0 ? "experience" : "",
    parseArray(profile.projectsJson).length > 0 ? "projects" : "",
    parseArray(profile.educationJson).length > 0 ? "education" : "",
    answers.length > 0 ? "answers" : "",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function Profile() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("personal");
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
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateField = (field: keyof Profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const updateJson = (field: keyof Profile, value: unknown) => {
    updateField(field, pretty(value));
  };

  const updateRawJsonField = (field: keyof Profile, value: string) => {
    updateField(field, value);
  };

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

  const skills = parseSkills(profile.skillsJson);
  const experience = parseArray<ExperienceItem>(profile.experienceJson);
  const projects = parseArray<ProjectItem>(profile.projectsJson);
  const education = parseArray<EducationItem>(profile.educationJson);
  const preferences = safeJson<Record<string, unknown>>(profile.preferencesJson, {});
  const completeness = completion(profile, answers);

  const setSkillGroups = (items: SkillGroup[]) => {
    updateJson("skillsJson", items.filter((group) => group.category.trim() || group.items.some(Boolean)));
  };

  const setExperience = (items: ExperienceItem[]) => {
    updateJson("experienceJson", items.filter((item) => item.title || item.company || item.bullets?.some(Boolean)));
  };

  const setProjects = (items: ProjectItem[]) => {
    updateJson("projectsJson", items.filter((item) => item.name || item.techStack || item.highlights?.some(Boolean)));
  };

  const setEducation = (items: EducationItem[]) => {
    updateJson("educationJson", items.filter((item) => item.degree || item.school || item.year));
  };

  const setPreference = (key: string, value: string) => {
    updateJson("preferencesJson", { ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "personal", label: "Identity", icon: <User size={14} /> },
    { id: "skills", label: "Skills", icon: <Wrench size={14} /> },
    { id: "experience", label: "Experience", icon: <Briefcase size={14} /> },
    { id: "projects", label: "Projects", icon: <FolderGit2 size={14} /> },
    { id: "education", label: "Education", icon: <GraduationCap size={14} /> },
    { id: "preferences", label: "Preferences", icon: <SlidersHorizontal size={14} /> },
    { id: "answers", label: "Answers", icon: <Plus size={14} /> },
    { id: "raw", label: "Raw", icon: <Wrench size={14} /> },
  ];

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p className="text-sm text-muted">Source profile used for filtering, CV generation, and application answers.</p>
        </div>
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

      <section className="profile-hero">
        <div className="profile-avatar">{profile.fullName ? profile.fullName.slice(0, 1).toUpperCase() : "?"}</div>
        <div className="profile-hero-main">
          <div className="profile-kicker">Candidate profile</div>
          <h2>{profile.fullName || "Add your name"}</h2>
          <p>{profile.headline || "Add a headline that the CV generator can reuse."}</p>
          <div className="profile-meta">
            {profile.location && <span>{profile.location}</span>}
            {profile.email && <span>{profile.email}</span>}
            {profile.github && <span>{profile.github}</span>}
          </div>
        </div>
        <div className="profile-score">
          <strong>{completeness}%</strong>
          <span>Complete</span>
        </div>
      </section>

      <div className="profile-layout">
        <aside className="profile-tabs">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={`profile-tab${tab === item.id ? " active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <section className="profile-panel">
          {tab === "personal" && (
            <>
              <SectionTitle title="Identity" note="Used directly in generated CV headers and application forms." />
              <div className="profile-form">
                <TextField label="Full name" value={profile.fullName} onChange={(value) => updateField("fullName", value)} />
                <TextField label="Email" value={profile.email} onChange={(value) => updateField("email", value)} />
                <TextField label="Phone" value={profile.phone} onChange={(value) => updateField("phone", value)} />
                <TextField label="Location" value={profile.location} onChange={(value) => updateField("location", value)} />
                <TextField label="Headline" value={profile.headline} onChange={(value) => updateField("headline", value)} />
                <TextField label="LinkedIn" value={profile.linkedin} onChange={(value) => updateField("linkedin", value)} />
                <TextField label="Portfolio" value={profile.portfolio} onChange={(value) => updateField("portfolio", value)} />
                <TextField label="GitHub" value={profile.github} onChange={(value) => updateField("github", value)} />
                <TextAreaField label="Professional summary" value={profile.summary} rows={5} onChange={(value) => updateField("summary", value)} />
              </div>
            </>
          )}

          {tab === "skills" && (
            <>
              <SectionTitle title="Skills" note="Grouped skills are easier for the CV generator to pick from for each job." />
              <div className="stack-list">
                {skills.map((group, index) => (
                  <div className="profile-item" key={index}>
                    <div className="profile-item-grid">
                      <TextField
                        label="Category"
                        value={group.category}
                        onChange={(value) => {
                          const next = [...skills];
                          next[index] = { ...group, category: value };
                          setSkillGroups(next);
                        }}
                      />
                      <TextAreaField
                        label="Skills, comma separated"
                        rows={3}
                        value={group.items.join(", ")}
                        onChange={(value) => {
                          const next = [...skills];
                          next[index] = { ...group, items: value.split(",").map((item) => item.trim()).filter(Boolean) };
                          setSkillGroups(next);
                        }}
                      />
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSkillGroups(skills.filter((_, i) => i !== index))}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                ))}
                {skills.length === 0 && <EmptyState text="No skills yet. Add groups like Languages, Backend, Frontend, Cloud." />}
                <button className="btn btn-primary btn-sm" onClick={() => setSkillGroups([...skills, { category: "Backend", items: [] }])}>
                  <Plus size={14} /> Add skill group
                </button>
              </div>
            </>
          )}

          {tab === "experience" && (
            <>
              <SectionTitle title="Experience" note="Bullets should be concrete. These become the raw material for tailored resume bullets." />
              <EditableCards
                items={experience.length ? experience : []}
                emptyText="No experience entries yet."
                addLabel="Add experience"
                onAdd={() => setExperience([...experience, { ...blankExperience }])}
                render={(item, index) => (
                  <ProfileCard
                    title={item.title || "Untitled role"}
                    onRemove={() => setExperience(experience.filter((_, i) => i !== index))}
                  >
                    <div className="profile-item-grid">
                      <TextField label="Title" value={item.title || ""} onChange={(value) => updateListItem(experience, index, { title: value }, setExperience)} />
                      <TextField label="Company" value={item.company || ""} onChange={(value) => updateListItem(experience, index, { company: value }, setExperience)} />
                      <TextField label="Dates" value={item.dates || ""} onChange={(value) => updateListItem(experience, index, { dates: value }, setExperience)} />
                      <TextAreaField label="Bullets, one per line" rows={5} value={arrayToLines(item.bullets)} onChange={(value) => updateListItem(experience, index, { bullets: linesToArray(value) }, setExperience)} />
                    </div>
                  </ProfileCard>
                )}
              />
            </>
          )}

          {tab === "projects" && (
            <>
              <SectionTitle title="Projects" note="This is where CV Autopilot can pull proof for job-specific tailoring." />
              <EditableCards
                items={projects.length ? projects : []}
                emptyText="No projects yet."
                addLabel="Add project"
                onAdd={() => setProjects([...projects, { ...blankProject }])}
                render={(item, index) => (
                  <ProfileCard
                    title={item.name || "Untitled project"}
                    onRemove={() => setProjects(projects.filter((_, i) => i !== index))}
                  >
                    <div className="profile-item-grid">
                      <TextField label="Project name" value={item.name || ""} onChange={(value) => updateListItem(projects, index, { name: value }, setProjects)} />
                      <TextField label="Link" value={item.link || ""} onChange={(value) => updateListItem(projects, index, { link: value }, setProjects)} />
                      <TextField label="Tech stack" value={item.techStack || ""} onChange={(value) => updateListItem(projects, index, { techStack: value }, setProjects)} />
                      <TextField label="Skills used" value={item.skillsUsed || ""} onChange={(value) => updateListItem(projects, index, { skillsUsed: value }, setProjects)} />
                      <TextAreaField label="Description" rows={3} value={item.description || ""} onChange={(value) => updateListItem(projects, index, { description: value }, setProjects)} />
                      <TextAreaField label="Highlights, one per line" rows={6} value={arrayToLines(item.highlights)} onChange={(value) => updateListItem(projects, index, { highlights: linesToArray(value) }, setProjects)} />
                    </div>
                  </ProfileCard>
                )}
              />
            </>
          )}

          {tab === "education" && (
            <>
              <SectionTitle title="Education" note="Short, plain entries work best for generated CVs." />
              <EditableCards
                items={education.length ? education : []}
                emptyText="No education entries yet."
                addLabel="Add education"
                onAdd={() => setEducation([...education, { ...blankEducation }])}
                render={(item, index) => (
                  <ProfileCard
                    title={item.degree || "Education"}
                    onRemove={() => setEducation(education.filter((_, i) => i !== index))}
                  >
                    <div className="profile-item-grid">
                      <TextField label="Degree" value={item.degree || ""} onChange={(value) => updateListItem(education, index, { degree: value }, setEducation)} />
                      <TextField label="School" value={item.school || ""} onChange={(value) => updateListItem(education, index, { school: value }, setEducation)} />
                      <TextField label="Year" value={item.year || ""} onChange={(value) => updateListItem(education, index, { year: value }, setEducation)} />
                    </div>
                  </ProfileCard>
                )}
              />
            </>
          )}

          {tab === "preferences" && (
            <>
              <SectionTitle title="Preferences" note="Used for filtering jobs and answering application questions. Keep sensitive/legal facts accurate." />
              <div className="profile-form">
                <TextField label="Remote preference" value={String(preferences.remote || "")} onChange={(value) => setPreference("remote", value)} />
                <TextField label="Salary expectation" value={String(preferences.salary || "")} onChange={(value) => setPreference("salary", value)} />
                <TextField label="Work authorization / visa" value={String(preferences.visa || "")} onChange={(value) => setPreference("visa", value)} />
                <TextField label="Availability" value={String(preferences.availability || "")} onChange={(value) => setPreference("availability", value)} />
                <TextAreaField label="Target roles" rows={3} value={String(preferences.targetRoles || "")} onChange={(value) => setPreference("targetRoles", value)} />
                <TextAreaField label="Avoid / reject criteria" rows={3} value={String(preferences.avoid || "")} onChange={(value) => setPreference("avoid", value)} />
                <TextAreaField label="Notes for applications" rows={5} value={String(preferences.notes || "")} onChange={(value) => setPreference("notes", value)} />
              </div>
            </>
          )}

          {tab === "answers" && (
            <>
              <SectionTitle title="Saved Answers" note="Reusable answers for application forms. Unknown or sensitive facts should stay blank until confirmed." />
              <div className="answer-composer">
                <TextField label="Category" value={newAnswer.category} onChange={(value) => setNewAnswer((prev) => ({ ...prev, category: value }))} placeholder="salary, availability, work_authorization" />
                <TextField label="Question" value={newAnswer.question} onChange={(value) => setNewAnswer((prev) => ({ ...prev, question: value }))} placeholder="What is your salary expectation?" />
                <TextAreaField label="Answer" rows={3} value={newAnswer.answer} onChange={(value) => setNewAnswer((prev) => ({ ...prev, answer: value }))} />
                <button className="btn btn-primary btn-sm" onClick={handleAddAnswer}>
                  <Plus size={14} /> Add answer
                </button>
              </div>

              <div className="answer-list">
                {answers.map((answer) => (
                  <div key={answer.id} className="answer-card">
                    <div>
                      <span className="tag">{answer.category}</span>
                      <h3>{answer.question}</h3>
                      <p>{answer.answer}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteAnswer(answer.id)} title="Delete answer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {answers.length === 0 && <EmptyState text="No saved application answers yet." />}
              </div>
            </>
          )}

          {tab === "raw" && (
            <>
              <SectionTitle title="Raw Data" note="Escape hatch for quick bulk edits. Invalid JSON can break downstream generation." />
              <div className="raw-grid">
                <JsonEditor label="Skills JSON" value={profile.skillsJson} onChange={(value) => updateRawJsonField("skillsJson", value)} />
                <JsonEditor label="Experience JSON" value={profile.experienceJson} onChange={(value) => updateRawJsonField("experienceJson", value)} />
                <JsonEditor label="Projects JSON" value={profile.projectsJson} onChange={(value) => updateRawJsonField("projectsJson", value)} />
                <JsonEditor label="Education JSON" value={profile.educationJson} onChange={(value) => updateRawJsonField("educationJson", value)} />
                <JsonEditor label="Preferences JSON" value={profile.preferencesJson} onChange={(value) => updateRawJsonField("preferencesJson", value)} />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function updateListItem<T>(items: T[], index: number, patch: Partial<T>, setItems: (items: T[]) => void) {
  const next = [...items];
  next[index] = { ...next[index], ...patch };
  setItems(next);
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="profile-section-title">
      <h2>{title}</h2>
      <p>{note}</p>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextAreaField({ label, value, rows, onChange }: { label: string; value: string; rows: number; onChange: (value: string) => void }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function JsonEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const valid = (() => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div className="form-group">
      <label>{label} <span className={valid ? "json-valid" : "json-invalid"}>{valid ? "valid" : "invalid"}</span></label>
      <textarea className="json-editor" rows={10} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ProfileCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="profile-item">
      <div className="profile-item-header">
        <h3>{title}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onRemove}>
          <Trash2 size={13} /> Remove
        </button>
      </div>
      {children}
    </div>
  );
}

function EditableCards<T>({ items, emptyText, addLabel, onAdd, render }: {
  items: T[];
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  render: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <div className="stack-list">
      {items.map((item, index) => render(item, index))}
      {items.length === 0 && <EmptyState text={emptyText} />}
      <button className="btn btn-primary btn-sm" onClick={onAdd}>
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="profile-empty">{text}</div>;
}
