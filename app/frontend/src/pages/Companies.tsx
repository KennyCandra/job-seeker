import { useState, useEffect } from "react";
import { api, type CompanyRecord } from "../api";

const ATS_OPTIONS = ["greenhouse", "lever", "ashby"];

export default function Companies() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newAts, setNewAts] = useState("greenhouse");
  const [newBoardUrl, setNewBoardUrl] = useState("");

  const load = () => {
    setLoading(true);
    api.companies.list().then(setCompanies).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggle = async (slug: string, active: boolean) => {
    await api.companies.toggleActive(slug, active);
    setCompanies((prev) =>
      prev.map((c) => (c.slug === slug ? { ...c, active } : c)),
    );
  };

  const handleDelete = async (slug: string) => {
    await api.companies.delete(slug);
    setCompanies((prev) => prev.filter((c) => c.slug !== slug));
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newAts) return;
    await api.companies.create(newName.trim(), newAts, newBoardUrl || undefined);
    setNewName("");
    setNewAts("greenhouse");
    setNewBoardUrl("");
    load();
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.slug.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <div className="page-header">
        <h1>Companies</h1>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12, fontSize: 13, color: "var(--text-muted)" }}>
          Add Company
        </h3>
        <div className="inline-form">
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label>Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div className="form-group" style={{ width: 140 }}>
            <label>ATS</label>
            <select value={newAts} onChange={(e) => setNewAts(e.target.value)}>
              {ATS_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
            <label>Board URL (optional)</label>
            <input
              value={newBoardUrl}
              onChange={(e) => setNewBoardUrl(e.target.value)}
              placeholder="https://boards.greenhouse.io/company"
            />
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>
            Add
          </button>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <input
          placeholder="Search companies..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>ATS</th>
              <th>Board URL</th>
              <th>Last Fetched</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.slug}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>
                  <span className="score-badge score-mid">{c.ats}</span>
                </td>
                <td>
                  <a
                    href={c.boardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm"
                  >
                    {c.boardUrl.slice(0, 40)}…
                  </a>
                </td>
                <td className="text-sm text-muted">
                  {c.lastFetchedAt
                    ? new Date(c.lastFetchedAt).toLocaleDateString()
                    : "Never"}
                </td>
                <td>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={(e) => handleToggle(c.slug, e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(c.slug)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted" style={{ textAlign: "center" }}>
                  No companies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
