import { useState, useEffect } from "react";
import { PLATFORMS, WEEK_RHYTHM, RULES } from "./data/tasks";
import "./App.css";

const STORAGE_KEY = "geo-dashboard-v1";
const PROGRESS_VERSION_KEY = "geo-dashboard-progress-version";
const CURRENT_PROGRESS_VERSION = "2026-08-18-portal-status";

const INITIAL_DONE = {
  gf1: true,
  gf2: true,
  rd1: true,
  rd2: true,
  li1: true,
};

function loadState() {
  try {
    if (localStorage.getItem(PROGRESS_VERSION_KEY) !== CURRENT_PROGRESS_VERSION) {
      localStorage.setItem(PROGRESS_VERSION_KEY, CURRENT_PROGRESS_VERSION);
      return { ...INITIAL_DONE };
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { ...INITIAL_DONE };
  } catch {
    return { ...INITIAL_DONE };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(PROGRESS_VERSION_KEY, CURRENT_PROGRESS_VERSION);
}

const TIER_STYLES = {
  1: { bg: "#EEF2FF", color: "#4338CA" },
  2: { bg: "#F0FDF4", color: "#15803D" },
  3: { bg: "#FFF7ED", color: "#C2410C" },
  4: { bg: "#FAF5FF", color: "#7C3AED" },
  5: { bg: "#F0F9FF", color: "#0369A1" },
};
const NEXT_ACTION_PLATFORM_IDS = ["gf", "rd", "li", "pr"];
const CURRENT_ACTION_SCHEDULES = new Set(["Heute", "Morgen", "Diese Woche"]);

export default function App() {
  const [done, setDone] = useState(loadState);
  const [toast, setToast] = useState("");
  const [userName, setUserName] = useState(() => localStorage.getItem("geo-username") || "");
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => { saveState(done); }, [done]);

  const toggle = (id) => {
    setDone(prev => {
      const next = { ...prev, [id]: !prev[id] };
      return next;
    });
    showToast(done[id] ? "Zurueckgesetzt" : "Erledigt!");
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const allTasks = PLATFORMS.flatMap(p => p.tasks);
  const doneCount = allTasks.filter(t => done[t.id]).length;
  const pct = Math.round((doneCount / allTasks.length) * 100);

  const nextTask = (() => {
    for (const platformId of NEXT_ACTION_PLATFORM_IDS) {
      const platform = PLATFORMS.find(p => p.id === platformId);
      const task = platform?.tasks.find(t => !done[t.id] && CURRENT_ACTION_SCHEDULES.has(t.when));

      if (task) return { ...task, platform: platform.name, url: platform.url };
    }

    return null;
  })();

  const today = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  const stats = [
    { label: "Gutefrage Posts", value: done["gf2"] ? (done["gf3"] ? 5 : 3) : (done["gf1"] ? 0 : 0), color: "#4338CA" },
    { label: "Reddit Kommentare", value: done["rd3"] ? (done["rd4"] ? 7 : 5) : 0, color: "#111" },
    { label: "LinkedIn Posts", value: done["li1"] ? (done["li3"] ? 2 : 1) : 0, color: "#15803D" },
    { label: "PR Artikel", value: done["pr2"] ? (done["pr3"] ? 2 : 1) : 0, color: "#111" },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="logo">GEO<span className="logo-dot">.</span>Outreach</div>
          <div className="phase-chip">Phase 1 — Signale aufbauen</div>
        </div>
        <div className="topbar-right">
          <span className="date-label">{today}</span>
          <button className="user-btn" onClick={() => setShowNameInput(v => !v)}>
            {userName || "Name setzen"}
          </button>
        </div>
      </header>

      {showNameInput && (
        <div className="name-bar">
          <input
            className="name-input"
            placeholder="Dein Name..."
            defaultValue={userName}
            onKeyDown={e => {
              if (e.key === "Enter") {
                const v = e.target.value.trim();
                setUserName(v);
                localStorage.setItem("geo-username", v);
                setShowNameInput(false);
              }
            }}
            autoFocus
          />
          <span className="name-hint">Enter zum Speichern</span>
        </div>
      )}

      {nextTask && (
        <div className="next-card">
          <div className="next-bar" />
          <div className="next-content">
            <div className="next-label">Naechste Aufgabe auf {nextTask.platform}</div>
            <div className="next-text">{nextTask.text}</div>
            <div className="next-when">{nextTask.when}</div>
          </div>
          <a href={nextTask.url} target="_blank" rel="noreferrer" className="next-btn">
            Oeffnen →
          </a>
        </div>
      )}

      {!nextTask && (
        <div className="next-card done-card">
          <div className="next-content">
            <div className="next-label">Phase 1 abgeschlossen!</div>
            <div className="next-text">Alle Aufgaben erledigt. Jetzt Phase 2 starten: Wikidata, mehr Reddit, mehr PR.</div>
          </div>
        </div>
      )}

      <div className="stats-row">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="progress-row">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: pct + "%" }} />
        </div>
        <div className="progress-label">{doneCount} / {allTasks.length} Aufgaben — {pct}%</div>
      </div>

      <div className="section-head">Plattformen & Aufgaben</div>
      <div className="platforms-grid">
        {PLATFORMS.map(p => {
          const pDone = p.tasks.filter(t => done[t.id]).length;
          const pPct = Math.round((pDone / p.tasks.length) * 100);
          const ts = TIER_STYLES[p.tier];
          return (
            <div className="platform-card" key={p.id}>
              <div className="platform-head">
                <div className="platform-name">{p.name}</div>
                <div className="platform-meta">
                  <span className="tier-badge" style={{ background: ts.bg, color: ts.color }}>
                    {p.tierLabel}
                  </span>
                  <span className="pct-label">{pPct}%</span>
                  <a href={p.url} target="_blank" rel="noreferrer" className="platform-open-btn">
                    Öffnen ↗
                  </a>
                </div>
              </div>
              <div className="task-list">
                {p.tasks.map(t => (
                  <div
                    key={t.id}
                    className={`task-row ${done[t.id] ? "task-done" : ""}`}
                    onClick={() => toggle(t.id)}
                  >
                    <div className={`checkbox ${done[t.id] ? "checked" : ""}`}>
                      {done[t.id] && "✓"}
                    </div>
                    <div className="task-text">{t.text}</div>
                    <div className="task-when">{t.when}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-head">Wochenrhythmus</div>
      <div className="rhythm-card">
        {WEEK_RHYTHM.map(d => (
          <div className="rhythm-row" key={d.day}>
            <div className="rhythm-day">{d.day}</div>
            <div className="rhythm-tasks">
              {d.tasks.map((t, i) => (
                <span key={i} className={`rhythm-tag ${t.key ? "rhythm-key" : ""}`}>{t.text}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">Goldene Regeln</div>
      <div className="rules-card">
        {RULES.map((r, i) => (
          <div className="rule-row" key={i}>
            <div className="rule-dot" />
            <span>{r}</span>
          </div>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
