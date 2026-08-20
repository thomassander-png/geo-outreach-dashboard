import { useEffect, useMemo, useState } from "react";
import { PLATFORMS, RULES, WEEK_RHYTHM } from "./data/tasks";
import { isSupabaseConfigured, supabase } from "./supabase";
import {
  bootstrapWorkspace,
  getSession,
  getWorkspace,
  loadWorkspaceData,
  requestMagicLink,
  saveContentItem,
  saveTaskProgress,
  signOut,
  updateProfileName,
} from "./data/teamStore";
import "./App.css";

const CURRENT_ACTION_SCHEDULES = new Set(["Heute", "Morgen", "Diese Woche"]);
const NAV_ITEMS = [
  { id: "today", label: "Heute", number: "1" },
  { id: "playbook", label: "Playbook", number: "2" },
  { id: "content", label: "Content", number: "3" },
  { id: "progress", label: "Fortschritt", number: "4" },
];
const CONTENT_STATUSES = [
  { id: "idea", label: "Idee" },
  { id: "draft", label: "Entwurf" },
  { id: "approved", label: "Freigabe" },
  { id: "done", label: "Erledigt" },
];

function errorMessage(error) {
  return error?.message || "Etwas ist schiefgelaufen. Bitte versuche es erneut.";
}

function taskById(taskId) {
  for (const platform of PLATFORMS) {
    const task = platform.tasks.find(item => item.id === taskId);
    if (task) {
      return { ...task, platform: platform.name, platformId: platform.id, url: platform.url };
    }
  }

  return null;
}

function activityLabel(action, taskId) {
  const task = taskById(taskId);
  const taskText = task?.text || "den Arbeitsbereich";

  if (action === "workspace_created") return "hat den Playbook-Arbeitsbereich eingerichtet";
  if (action === "task_completed") return `hat „${taskText}“ erledigt`;
  if (action === "task_reopened") return `hat „${taskText}“ wieder geöffnet`;
  if (action === "content_updated") return `hat Content zu „${taskText}“ aktualisiert`;
  return "hat den Status aktualisiert";
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function App() {
  const [screen, setScreen] = useState(isSupabaseConfigured ? "loading" : "configuration");
  const [session, setSession] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [profile, setProfile] = useState(null);
  const [done, setDone] = useState({});
  const [progress, setProgress] = useState({});
  const [contentItems, setContentItems] = useState({});
  const [activity, setActivity] = useState([]);
  const [activeView, setActiveView] = useState("today");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [setupName, setSetupName] = useState("Tommy");
  const [workspaceName, setWorkspaceName] = useState("GEO Outreach Playbook");
  const [profileName, setProfileName] = useState("");
  const [contentForm, setContentForm] = useState({ briefing: "", draft: "", status: "idea" });

  const allTasks = useMemo(() => PLATFORMS.flatMap(platform => platform.tasks.map(task => ({ ...task, platform: platform.name, platformId: platform.id, url: platform.url }))), []);
  const doneCount = allTasks.filter(task => done[task.id]).length;
  const percentage = Math.round((doneCount / allTasks.length) * 100);

  const nextTask = useMemo(() => {
    for (const platform of PLATFORMS) {
      const task = platform.tasks.find(item => !done[item.id] && CURRENT_ACTION_SCHEDULES.has(item.when));
      if (task) return { ...task, platform: platform.name, platformId: platform.id, url: platform.url };
    }

    return allTasks.find(task => !done[task.id]) || null;
  }, [allTasks, done]);

  const selectedTask = taskById(selectedTaskId) || nextTask || allTasks[0];
  const selectedContentTaskId = selectedTask?.id;
  const today = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const showToast = message => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const hydrateWorkspace = async (workspaceData, userId) => {
    const data = await loadWorkspaceData(workspaceData.id, userId);
    setWorkspace(workspaceData);
    setProfile(data.profile);
    setDone(data.done);
    setProgress(data.progress);
    setContentItems(data.content);
    setActivity(data.activity);
    setProfileName(data.profile.display_name);
    setScreen("app");
  };

  const initializeSession = async currentSession => {
    if (!currentSession?.user) {
      setSession(null);
      setScreen("login");
      return;
    }

    setSession(currentSession);
    setScreen("loading");

    try {
      const workspaceData = await getWorkspace(currentSession.user.id);
      await hydrateWorkspace(workspaceData, currentSession.user.id);
    } catch (error) {
      if (error.message?.includes("noch kein Playbook-Arbeitsbereich")) {
        setSetupName(currentSession.user.user_metadata?.display_name || "Tommy");
        setScreen("onboarding");
      } else {
        setScreen("error");
        showToast(errorMessage(error));
      }
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let active = true;
    getSession()
      .then(data => {
        if (active) initializeSession(data.session);
      })
      .catch(error => {
        if (active) {
          setScreen("error");
          showToast(errorMessage(error));
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) initializeSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedContentTaskId) return;
    const item = contentItems[selectedContentTaskId];
    setContentForm({
      briefing: item?.briefing || "",
      draft: item?.draft || "",
      status: item?.status || "idea",
    });
  }, [selectedContentTaskId, contentItems]);

  const handleLogin = async event => {
    event.preventDefault();
    setBusy(true);
    try {
      await requestMagicLink(loginEmail.trim());
      setLoginSent(true);
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleBootstrap = async event => {
    event.preventDefault();
    setBusy(true);
    try {
      const workspaceId = await bootstrapWorkspace({ workspaceName, profileName: setupName });
      const workspaceData = { id: workspaceId, name: workspaceName, role: "admin" };
      await hydrateWorkspace(workspaceData, session.user.id);
      showToast("Dein Playbook ist eingerichtet.");
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleTaskToggle = async taskId => {
    const nextValue = !done[taskId];
    const previousDone = done;
    const previousProgress = progress;
    const task = taskById(taskId);

    setDone(current => ({ ...current, [taskId]: nextValue }));
    setProgress(current => ({
      ...current,
      [taskId]: {
        ...current[taskId],
        is_done: nextValue,
        completed_by: nextValue ? profile.display_name : null,
        completed_at: nextValue ? new Date().toISOString() : null,
      },
    }));

    try {
      await saveTaskProgress({
        workspaceId: workspace.id,
        taskId,
        isDone: nextValue,
        actorName: profile.display_name,
      });
      setActivity(current => [{
        id: `local-${taskId}-${Date.now()}`,
        action: nextValue ? "task_completed" : "task_reopened",
        task_id: taskId,
        actor_name: profile.display_name,
        created_at: new Date().toISOString(),
      }, ...current].slice(0, 5));
      showToast(nextValue ? "Erledigt – die nächste Aufgabe wartet schon." : `„${task?.text || "Aufgabe"}“ ist wieder offen.`);
    } catch (error) {
      setDone(previousDone);
      setProgress(previousProgress);
      showToast(errorMessage(error));
    }
  };

  const openContent = taskId => {
    setSelectedTaskId(taskId);
    setActiveView("content");
  };

  const saveContent = async event => {
    event.preventDefault();
    if (!selectedTask) return;

    setBusy(true);
    try {
      await saveContentItem({
        workspaceId: workspace.id,
        taskId: selectedTask.id,
        ...contentForm,
      });
      setContentItems(current => ({
        ...current,
        [selectedTask.id]: { ...contentForm, updated_at: new Date().toISOString() },
      }));
      setActivity(current => [{
        id: `local-content-${selectedTask.id}-${Date.now()}`,
        action: "content_updated",
        task_id: selectedTask.id,
        actor_name: profile.display_name,
        created_at: new Date().toISOString(),
      }, ...current].slice(0, 5));
      showToast("Content-Status gespeichert.");
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const saveName = async event => {
    event.preventDefault();
    const nextName = profileName.trim();
    if (!nextName || nextName === profile.display_name) return;

    setBusy(true);
    try {
      await updateProfileName(nextName);
      setProfile(current => ({ ...current, display_name: nextName }));
      showToast("Dein Name ist gespeichert.");
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (screen === "configuration") {
    return <ConfigurationScreen />;
  }

  if (screen === "loading") {
    return <StateScreen eyebrow="GEO OUTREACH PLAYBOOK" title="Dein Arbeitsbereich wird geladen." text="Einen Moment – wir rufen deinen aktuellen Fortschritt ab." />;
  }

  if (screen === "error") {
    return <StateScreen eyebrow="VERBINDUNG PRÜFEN" title="Der Arbeitsbereich ist gerade nicht erreichbar." text="Bitte prüfe die zentrale Datenbank-Konfiguration und lade die Seite danach neu." />;
  }

  if (screen === "login") {
    return (
      <AuthScreen
        email={loginEmail}
        setEmail={setLoginEmail}
        sent={loginSent}
        busy={busy}
        onSubmit={handleLogin}
      />
    );
  }

  if (screen === "onboarding") {
    return (
      <OnboardingScreen
        name={setupName}
        setName={setSetupName}
        workspaceName={workspaceName}
        setWorkspaceName={setWorkspaceName}
        busy={busy}
        onSubmit={handleBootstrap}
      />
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="GEO Outreach Playbook Startseite">
          <span className="brand-mark"><span /> <span /> <span /></span>
          <span>GEO <b>TOOL</b></span>
        </a>
        <div className="sidebar-product">Outreach Playbook</div>
        <nav className="side-nav" aria-label="Playbook Navigation">
          {NAV_ITEMS.map(item => (
            <button
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setActiveView(item.id)}
            >
              <span className="nav-number">{item.number}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="team-chip"><span className="status-dot" /> {workspace.name}</div>
          <div className="team-muted">Ein Team · zentral gespeichert</div>
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div>
            <p className="eyebrow">PHASE 1 · SIGNALE AUFBAUEN</p>
            <p className="date-label">{today}</p>
          </div>
          <div className="profile-control">
            <div className="avatar">{profile.display_name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{profile.display_name}</strong>
              <span>Admin</span>
            </div>
          </div>
        </header>

        {activeView === "today" && (
          <TodayView
            nextTask={nextTask}
            doneCount={doneCount}
            totalCount={allTasks.length}
            percentage={percentage}
            done={done}
            progress={progress}
            onToggle={handleTaskToggle}
            onOpenContent={openContent}
          />
        )}

        {activeView === "playbook" && (
          <PlaybookView done={done} progress={progress} onToggle={handleTaskToggle} onOpenContent={openContent} />
        )}

        {activeView === "content" && selectedTask && (
          <ContentView
            task={selectedTask}
            form={contentForm}
            setForm={setContentForm}
            busy={busy}
            onSave={saveContent}
            onBack={() => setActiveView("today")}
          />
        )}

        {activeView === "progress" && (
          <ProgressView
            doneCount={doneCount}
            totalCount={allTasks.length}
            percentage={percentage}
            activity={activity}
            profileName={profileName}
            setProfileName={setProfileName}
            busy={busy}
            onSaveName={saveName}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function ConfigurationScreen() {
  return (
    <StateScreen
      eyebrow="GEO OUTREACH PLAYBOOK"
      title="Zentrale Speicherung einrichten"
      text="Damit Aufgaben und Content dauerhaft teamweit gespeichert werden, fehlen noch die beiden öffentlichen Verbindungswerte der zentralen Datenbank. Danach erscheint der Tommy-Login automatisch."
      extra={<code>VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY</code>}
    />
  );
}

function StateScreen({ eyebrow, title, text, extra }) {
  return (
    <div className="state-shell">
      <div className="state-card">
        <div className="gradient-pill">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
        {extra && <div className="state-extra">{extra}</div>}
      </div>
    </div>
  );
}

function AuthScreen({ email, setEmail, sent, busy, onSubmit }) {
  return (
    <div className="state-shell">
      <div className="state-card auth-card">
        <div className="gradient-pill">GEO OUTREACH PLAYBOOK</div>
        <h1>Ein klarer Schritt nach dem anderen.</h1>
        {sent ? (
          <p>Wir haben dir einen sicheren Anmeldelink geschickt. Öffne ihn in deinem E-Mail-Postfach, um dein Playbook zu starten.</p>
        ) : (
          <>
            <p>Melde dich an, um deinen zentral gespeicherten Fortschritt und Content-Workflow zu öffnen.</p>
            <form onSubmit={onSubmit} className="auth-form">
              <label htmlFor="email">Deine E-Mail-Adresse</label>
              <input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tommy@beispiel.de" required />
              <button className="primary-button" disabled={busy}>{busy ? "Wird gesendet …" : "Sicheren Link senden"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function OnboardingScreen({ name, setName, workspaceName, setWorkspaceName, busy, onSubmit }) {
  return (
    <div className="state-shell">
      <div className="state-card auth-card">
        <div className="gradient-pill">STUFE 1 · TOMMY-ADMIN</div>
        <h1>Dein Playbook ist bereit.</h1>
        <p>Lege jetzt den ersten zentralen Arbeitsbereich an. Weitere Teammitglieder können später kontrolliert ergänzt werden.</p>
        <form onSubmit={onSubmit} className="auth-form">
          <label htmlFor="admin-name">Dein Name</label>
          <input id="admin-name" value={name} onChange={event => setName(event.target.value)} required />
          <label htmlFor="workspace-name">Name des Arbeitsbereichs</label>
          <input id="workspace-name" value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} required />
          <button className="primary-button" disabled={busy}>{busy ? "Wird eingerichtet …" : "Playbook als Admin starten"}</button>
        </form>
      </div>
    </div>
  );
}

function TodayView({ nextTask, doneCount, totalCount, percentage, done, progress, onToggle, onOpenContent }) {
  const stats = [
    { label: "Erledigt", value: doneCount, accent: "violet" },
    { label: "Offene Schritte", value: totalCount - doneCount, accent: "blue" },
    { label: "Fortschritt", value: `${percentage}%`, accent: "green" },
  ];

  return (
    <section className="view-stack">
      <div className="intro-copy">
        <div className="gradient-pill">DEIN HEUTIGER FOKUS</div>
        <h1>Was ist jetzt der nächste gute GEO-Schritt?</h1>
        <p>Arbeite nur diese Aufgabe ab. Danach rückt der nächste Schritt automatisch nach.</p>
      </div>

      {nextTask ? (
        <article className="focus-card">
          <div className="focus-orb" />
          <div className="focus-content">
            <p className="eyebrow">NÄCHSTE AUFGABE · {nextTask.platform}</p>
            <h2>{nextTask.text}</h2>
            <p className="focus-meta">{nextTask.when} · Erst helfen, dann verlinken.</p>
            <div className="focus-actions">
              <a href={nextTask.url} target="_blank" rel="noreferrer" className="primary-button">Öffnen <span>→</span></a>
              <button className="quiet-button" onClick={() => onOpenContent(nextTask.id)}>Content vorbereiten</button>
              <button className="complete-button" onClick={() => onToggle(nextTask.id)}>{done[nextTask.id] ? "Erledigt" : "Als erledigt markieren"}</button>
            </div>
          </div>
          {progress[nextTask.id]?.completed_at && <p className="completion-note">Zuletzt erledigt: {formatDate(progress[nextTask.id].completed_at)}</p>}
        </article>
      ) : (
        <article className="focus-card completed-focus"><div className="focus-content"><p className="eyebrow">PHASE 1</p><h2>Alle aktuellen Schritte sind erledigt.</h2><p className="focus-meta">Jetzt kannst du Phase 2 gezielt vorbereiten.</p></div></article>
      )}

      <div className="stat-grid">
        {stats.map(stat => <div className={`stat-card ${stat.accent}`} key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
      </div>

      <article className="progress-card">
        <div className="progress-card-head"><div><p className="eyebrow">DEIN FORTSCHRITT</p><h3>{doneCount} von {totalCount} Aufgaben erledigt</h3></div><span>{percentage}%</span></div>
        <div className="progress-track"><div style={{ width: `${percentage}%` }} /></div>
      </article>

      <section className="micro-section">
        <p className="eyebrow">DEIN WOCHENRHYTHMUS</p>
        <div className="rhythm-list">
          {WEEK_RHYTHM.map(day => <div className="rhythm-line" key={day.day}><b>{day.day}</b><span>{day.tasks.map(task => task.text).join(" · ")}</span></div>)}
        </div>
      </section>
    </section>
  );
}

function PlaybookView({ done, progress, onToggle, onOpenContent }) {
  return (
    <section className="view-stack">
      <div className="intro-copy compact"><div className="gradient-pill">DEIN GEO-HANDBUCH</div><h1>Jede Plattform. Ein klarer Ablauf.</h1><p>Die Schritte bleiben bewusst in Reihenfolge. Erledige nur, was gerade ansteht.</p></div>
      <div className="playbook-grid">
        {PLATFORMS.map(platform => {
          const platformDone = platform.tasks.filter(task => done[task.id]).length;
          const platformPercentage = Math.round((platformDone / platform.tasks.length) * 100);
          return (
            <article className="platform-module" key={platform.id}>
              <div className="module-head"><div><p className="eyebrow">{platform.tierLabel}</p><h2>{platform.name}</h2></div><span>{platformPercentage}%</span></div>
              <div className="mini-track"><div style={{ width: `${platformPercentage}%` }} /></div>
              <div className="module-tasks">
                {platform.tasks.map(task => (
                  <div className={`task-item ${done[task.id] ? "done" : ""}`} key={task.id}>
                    <button className="task-check" aria-label={`${task.text} ${done[task.id] ? "wieder öffnen" : "erledigen"}`} onClick={() => onToggle(task.id)}>{done[task.id] ? "✓" : ""}</button>
                    <button className="task-copy" onClick={() => onOpenContent(task.id)}><span>{task.text}</span><small>{task.when}{progress[task.id]?.completed_at ? ` · ${formatDate(progress[task.id].completed_at)}` : ""}</small></button>
                  </div>
                ))}
              </div>
              <a href={platform.url} target="_blank" rel="noreferrer" className="module-link">Plattform öffnen <span>↗</span></a>
            </article>
          );
        })}
      </div>
      <section className="rules-panel"><p className="eyebrow">DIE GOLDENEN REGELN</p>{RULES.map(rule => <p key={rule}><span />{rule}</p>)}</section>
    </section>
  );
}

function ContentView({ task, form, setForm, busy, onSave, onBack }) {
  const status = CONTENT_STATUSES.find(item => item.id === form.status)?.label || "Idee";
  return (
    <section className="view-stack">
      <button className="back-button" onClick={onBack}>← Zurück zu Heute</button>
      <div className="intro-copy compact"><div className="gradient-pill">CONTENT-WORKFLOW · {status.toUpperCase()}</div><h1>{task.text}</h1><p>{task.platform} · {task.when}</p></div>
      <form className="content-editor" onSubmit={onSave}>
        <div className="editor-head"><div><p className="eyebrow">SCHRITT FÜR SCHRITT</p><h2>Content vorbereiten</h2></div><a href={task.url} target="_blank" rel="noreferrer" className="quiet-button">Plattform öffnen ↗</a></div>
        <label htmlFor="content-status">Status</label>
        <div className="status-options" id="content-status">
          {CONTENT_STATUSES.map(item => <button type="button" className={form.status === item.id ? "selected" : ""} onClick={() => setForm(current => ({ ...current, status: item.id }))} key={item.id}>{item.label}</button>)}
        </div>
        <label htmlFor="briefing">Kurzes Briefing</label>
        <textarea id="briefing" value={form.briefing} onChange={event => setForm(current => ({ ...current, briefing: event.target.value }))} placeholder="Wem hilft dieser Beitrag? Was ist die eine klare Aussage?" rows="4" />
        <label htmlFor="draft">Entwurf</label>
        <textarea id="draft" value={form.draft} onChange={event => setForm(current => ({ ...current, draft: event.target.value }))} placeholder="Entwurf hier festhalten …" rows="10" />
        <div className="editor-footer"><p>Der Entwurf wird zentral gespeichert. Veröffentlichen bleibt bewusst ein eigener, kontrollierter Schritt.</p><button className="primary-button" disabled={busy}>{busy ? "Wird gespeichert …" : "Content speichern"}</button></div>
      </form>
    </section>
  );
}

function ProgressView({ doneCount, totalCount, percentage, activity, profileName, setProfileName, busy, onSaveName, onSignOut }) {
  return (
    <section className="view-stack">
      <div className="intro-copy compact"><div className="gradient-pill">ZENTRAL & NACHVOLLZIEHBAR</div><h1>Dein Fortschritt bleibt erhalten.</h1><p>Aufgaben, Content und wichtige Änderungen sind im Arbeitsbereich dokumentiert.</p></div>
      <div className="progress-summary"><strong>{percentage}%</strong><div><h2>{doneCount} von {totalCount} Aufgaben erledigt</h2><div className="progress-track"><div style={{ width: `${percentage}%` }} /></div></div></div>
      <div className="progress-columns">
        <article className="activity-card"><p className="eyebrow">LETZTE AKTIVITÄTEN</p>{activity.length ? activity.map(item => <div className="activity-row" key={item.id}><span className="activity-dot" /><div><p><b>{item.actor_name}</b> {activityLabel(item.action, item.task_id)}</p><small>{formatDate(item.created_at)}</small></div></div>) : <p className="empty-copy">Dein Aktivitätsverlauf erscheint nach dem ersten gespeicherten Schritt.</p>}</article>
        <article className="profile-card"><p className="eyebrow">DEIN ADMIN-KONTO</p><form onSubmit={onSaveName}><label htmlFor="profile-name">Anzeigename</label><input id="profile-name" value={profileName} onChange={event => setProfileName(event.target.value)} required /><button className="quiet-button" disabled={busy}>Name speichern</button></form><button className="signout-button" onClick={onSignOut} disabled={busy}>Abmelden</button></article>
      </div>
    </section>
  );
}

export default App;
