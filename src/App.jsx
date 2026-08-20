import { useEffect, useMemo, useState } from "react";
import { PLATFORMS } from "./data/tasks";
import { AUTHORITY_PILLARS, DAILY_ACTION_TEMPLATES, RISK_COPY } from "./data/dailyActions";
import { CONTENT_SOP, DAILY_ACTION_GUIDES, PLAYBOOK_STAGES, WEEKLY_REVIEW } from "./data/knowledgeModules";
import { LEGACY_COMPLIANCE_NOTES, RED_GEO_WARNINGS, SIGNAL_CATALOG } from "./data/platformCatalog";
import { isSupabaseConfigured, supabase } from "./supabase";
import {
  bootstrapWorkspace,
  ensureDailyActions,
  getSession,
  getWorkspace,
  loadWorkspaceData,
  requestMagicLink,
  saveContentItem,
  saveDailyActionStatus,
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

function toLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromIso(value) {
  return new Date(`${value}T12:00:00`);
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatShortDay(value) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "short" }).format(dateFromIso(value));
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

function dailyActionById(templateId) {
  return DAILY_ACTION_TEMPLATES.find(item => item.id === templateId) || null;
}

function activityLabel(action, taskId) {
  const task = taskById(taskId);
  const dailyTemplateId = taskId?.startsWith("daily:") ? taskId.split(":").slice(2).join(":") : taskId;
  const dailyAction = dailyActionById(dailyTemplateId);
  const taskText = task?.text || dailyAction?.title || "den Arbeitsbereich";

  if (action === "workspace_created") return "hat den Playbook-Arbeitsbereich eingerichtet";
  if (action === "task_completed") return `hat „${taskText}“ erledigt`;
  if (action === "task_reopened") return `hat „${taskText}“ wieder geöffnet`;
  if (action === "content_updated") return `hat Content zu „${taskText}“ aktualisiert`;
  if (action === "daily_action_planned") return `hat „${taskText}“ für den Tagesplan angelegt`;
  if (action === "daily_action_done") return `hat „${taskText}“ heute erledigt`;
  if (action === "daily_action_skipped") return `hat „${taskText}“ heute verschoben`;
  if (action === "daily_action_reopened") return `hat „${taskText}“ wieder geöffnet`;
  return "hat den Status aktualisiert";
}

function mergeDailyRows(existingRows, incomingRows) {
  const rowMap = new Map(existingRows.map(row => [row.id, row]));
  incomingRows.forEach(row => rowMap.set(row.id, row));
  return [...rowMap.values()].sort((first, second) => second.planned_for.localeCompare(first.planned_for));
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
  const [dailyActions, setDailyActions] = useState([]);
  const [activeView, setActiveView] = useState("today");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [dailyBusyId, setDailyBusyId] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [setupName, setSetupName] = useState("Tommy");
  const [workspaceName, setWorkspaceName] = useState("GEO Playbook");
  const [profileName, setProfileName] = useState("");
  const [contentForm, setContentForm] = useState({ briefing: "", draft: "", status: "idea" });

  const todayKey = toLocalDate();
  const allTasks = useMemo(() => PLATFORMS.flatMap(platform => platform.tasks.map(task => ({ ...task, platform: platform.name, platformId: platform.id, url: platform.url }))), []);
  const setupDoneCount = allTasks.filter(task => done[task.id]).length;

  const nextSetupTask = useMemo(() => {
    for (const platform of PLATFORMS) {
      const task = platform.tasks.find(item => !done[item.id] && CURRENT_ACTION_SCHEDULES.has(item.when));
      if (task) return { ...task, platform: platform.name, platformId: platform.id, url: platform.url };
    }

    return allTasks.find(task => !done[task.id]) || null;
  }, [allTasks, done]);

  const todayInstances = useMemo(() => dailyActions.filter(action => action.planned_for === todayKey), [dailyActions, todayKey]);
  const todayInstanceByTemplate = useMemo(() => new Map(todayInstances.map(action => [action.template_id, action])), [todayInstances]);
  const todayQueue = useMemo(() => DAILY_ACTION_TEMPLATES.map(template => ({ ...template, instance: todayInstanceByTemplate.get(template.id) })).filter(item => item.instance), [todayInstanceByTemplate]);
  const todayDoneCount = todayQueue.filter(item => item.instance.status === "done").length;
  const todaySkippedCount = todayQueue.filter(item => item.instance.status === "skipped").length;
  const nextDailyAction = todayQueue.find(item => item.instance.status === "planned") || null;
  const selectedTask = taskById(selectedTaskId) || nextSetupTask || allTasks[0];
  const selectedContentTaskId = selectedTask?.id;
  const todayLabel = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const showToast = message => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const hydrateWorkspace = async (workspaceData, userId) => {
    const data = await loadWorkspaceData(workspaceData.id, userId);
    const plannedRows = await ensureDailyActions({
      workspaceId: workspaceData.id,
      plannedFor: todayKey,
      templateIds: DAILY_ACTION_TEMPLATES.map(item => item.id),
    });

    setWorkspace(workspaceData);
    setProfile(data.profile);
    setDone(data.done);
    setProgress(data.progress);
    setContentItems(data.content);
    setActivity(data.activity);
    setDailyActions(mergeDailyRows(data.dailyActions, plannedRows));
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
  // Die Auth-Subscription wird bewusst nur einmal beim Start registriert.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleDailyAction = async (instance, nextStatus) => {
    const previousActions = dailyActions;
    const completedAt = nextStatus === "done" ? new Date().toISOString() : null;
    setDailyBusyId(instance.id);
    setDailyActions(current => current.map(item => item.id === instance.id ? {
      ...item,
      status: nextStatus,
      completed_by: nextStatus === "done" ? profile.display_name : null,
      completed_at: completedAt,
    } : item));

    try {
      const savedAction = await saveDailyActionStatus({ workspaceId: workspace.id, id: instance.id, status: nextStatus, actorName: profile.display_name });
      setDailyActions(current => current.map(item => item.id === savedAction.id ? savedAction : item));
      const action = nextStatus === "done" ? "daily_action_done" : nextStatus === "skipped" ? "daily_action_skipped" : "daily_action_reopened";
      setActivity(current => [{
        id: `daily-${instance.id}-${Date.now()}`,
        action,
        task_id: instance.template_id,
        actor_name: profile.display_name,
        created_at: new Date().toISOString(),
      }, ...current].slice(0, 12));
      showToast(nextStatus === "done" ? "Erledigt – die nächste Aktion ist bereit." : nextStatus === "skipped" ? "Für heute verschoben. Die nächste Aktion ist bereit." : "Aktion wieder geöffnet.");
    } catch (error) {
      setDailyActions(previousActions);
      showToast(errorMessage(error));
    } finally {
      setDailyBusyId("");
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
        id: `setup-${taskId}-${Date.now()}`,
        action: nextValue ? "task_completed" : "task_reopened",
        task_id: taskId,
        actor_name: profile.display_name,
        created_at: new Date().toISOString(),
      }, ...current].slice(0, 12));
      showToast(nextValue ? "Aufbau-Schritt gespeichert." : `„${task?.text || "Aufgabe"}“ ist wieder offen.`);
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
        id: `content-${selectedTask.id}-${Date.now()}`,
        action: "content_updated",
        task_id: selectedTask.id,
        actor_name: profile.display_name,
        created_at: new Date().toISOString(),
      }, ...current].slice(0, 12));
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

  if (screen === "configuration") return <ConfigurationScreen />;
  if (screen === "loading") return <StateScreen eyebrow="GEO PLAYBOOK" title="Dein Arbeitsbereich wird geladen." text="Einen Moment – wir rufen deinen Tagesplan und deinen Fortschritt ab." />;
  if (screen === "error") return <StateScreen eyebrow="VERBINDUNG PRÜFEN" title="Der Arbeitsbereich ist gerade nicht erreichbar." text="Bitte prüfe die zentrale Datenbank-Konfiguration und lade die Seite danach neu." />;
  if (screen === "login") return <AuthScreen email={loginEmail} setEmail={setLoginEmail} sent={loginSent} busy={busy} onSubmit={handleLogin} />;
  if (screen === "onboarding") return <OnboardingScreen name={setupName} setName={setSetupName} workspaceName={workspaceName} setWorkspaceName={setWorkspaceName} busy={busy} onSubmit={handleBootstrap} />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="GEO Playbook Startseite">
          <span className="brand-mark"><span /> <span /> <span /></span>
          <span>GEO <b>TOOL</b></span>
        </a>
        <div className="sidebar-product">GEO Playbook</div>
        <nav className="side-nav" aria-label="Playbook Navigation">
          {NAV_ITEMS.map(item => (
            <button className={`nav-item ${activeView === item.id ? "active" : ""}`} key={item.id} onClick={() => setActiveView(item.id)}>
              <span className="nav-number">{item.number}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="team-chip"><span className="status-dot" /> GEO Playbook</div>
          <div className="team-muted">Ein Team · zentral gespeichert</div>
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div>
            <p className="eyebrow">GEO PLAYBOOK · 10ER-TAGESPLAN</p>
            <p className="date-label">{todayLabel}</p>
          </div>
          <div className="profile-control">
            <div className="avatar">{profile.display_name.slice(0, 1).toUpperCase()}</div>
            <div><strong>{profile.display_name}</strong><span>{workspace.role === "admin" ? "Admin" : "Mitglied"}</span></div>
          </div>
        </header>

        {activeView === "today" && <TodayView nextAction={nextDailyAction} guide={nextDailyAction ? DAILY_ACTION_GUIDES[nextDailyAction.id] : null} todayDoneCount={todayDoneCount} todaySkippedCount={todaySkippedCount} totalCount={todayQueue.length} onUpdate={handleDailyAction} busyId={dailyBusyId} onShowCalendar={() => setActiveView("progress")} setupDoneCount={setupDoneCount} setupTotal={allTasks.length} />}
        {activeView === "playbook" && <AuthorityView pillars={AUTHORITY_PILLARS} stages={PLAYBOOK_STAGES} done={done} progress={progress} onToggle={handleTaskToggle} onOpenContent={openContent} setupDoneCount={setupDoneCount} setupTotal={allTasks.length} />}
        {activeView === "content" && selectedTask && <ContentView task={selectedTask} form={contentForm} setForm={setContentForm} busy={busy} onSave={saveContent} onBack={() => setActiveView("playbook")} />}
        {activeView === "progress" && <><CalendarView dailyActions={dailyActions} todayKey={todayKey} onGoToday={() => setActiveView("today")} /><ProgressView activity={activity} profileName={profileName} setProfileName={setProfileName} busy={busy} onSaveName={saveName} onSignOut={handleSignOut} todayDoneCount={todayDoneCount} totalCount={todayQueue.length} setupDoneCount={setupDoneCount} setupTotal={allTasks.length} /></>}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function ConfigurationScreen() {
  return <StateScreen eyebrow="GEO PLAYBOOK" title="Zentrale Speicherung einrichten" text="Damit Tagesplan, Kalender und Content dauerhaft teamweit gespeichert werden, fehlen die beiden öffentlichen Verbindungswerte der zentralen Datenbank." extra={<code>VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY</code>} />;
}

function StateScreen({ eyebrow, title, text, extra }) {
  return <div className="state-shell"><div className="state-card"><div className="gradient-pill">{eyebrow}</div><h1>{title}</h1><p>{text}</p>{extra && <div className="state-extra">{extra}</div>}</div></div>;
}

function AuthScreen({ email, setEmail, sent, busy, onSubmit }) {
  return (
    <div className="state-shell"><div className="state-card auth-card"><div className="gradient-pill">GEO PLAYBOOK</div><h1>Ein klarer Schritt nach dem anderen.</h1>{sent ? <p>Wir haben dir einen sicheren Anmeldelink geschickt. Öffne ihn in deinem E-Mail-Postfach, um deinen Tagesplan zu starten.</p> : <><p>Melde dich an, um deinen zentral gespeicherten Tagesplan, Kalender und Content-Workflow zu öffnen.</p><form onSubmit={onSubmit} className="auth-form"><label htmlFor="email">Deine E-Mail-Adresse</label><input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tommy@beispiel.de" required /><button className="primary-button" disabled={busy}>{busy ? "Wird gesendet …" : "Sicheren Link senden"}</button></form></>}</div></div>
  );
}

function OnboardingScreen({ name, setName, workspaceName, setWorkspaceName, busy, onSubmit }) {
  return (
    <div className="state-shell"><div className="state-card auth-card"><div className="gradient-pill">STUFE 1 · TOMMY-ADMIN</div><h1>Dein Playbook ist bereit.</h1><p>Lege jetzt den ersten zentralen Arbeitsbereich an. Weitere Teammitglieder können später kontrolliert ergänzt werden.</p><form onSubmit={onSubmit} className="auth-form"><label htmlFor="admin-name">Dein Name</label><input id="admin-name" value={name} onChange={event => setName(event.target.value)} required /><label htmlFor="workspace-name">Name des Arbeitsbereichs</label><input id="workspace-name" value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} required /><button className="primary-button" disabled={busy}>{busy ? "Wird eingerichtet …" : "Playbook als Admin starten"}</button></form></div></div>
  );
}

function TodayView({ nextAction, guide, todayDoneCount, todaySkippedCount, totalCount, onUpdate, busyId, onShowCalendar, setupDoneCount, setupTotal }) {
  const statusLabel = nextAction ? RISK_COPY[nextAction.risk] : null;
  const progress = totalCount ? Math.round((todayDoneCount / totalCount) * 100) : 0;

  return (
    <section className="view-stack">
      <div className="intro-copy"><div className="gradient-pill">DEIN HEUTIGER FOKUS</div><h1>Was ist jetzt der nächste gute GEO-Schritt?</h1><p>Dein Tagesplan hat zehn kleine Aktionen. Du siehst immer nur die nächste – danach rückt die Warteschlange weiter.</p></div>
      {nextAction ? (
        <article className="focus-card daily-focus-card">
          <div className="focus-orb" />
          <div className="focus-content">
            <p className="eyebrow">{nextAction.category} · {nextAction.platform}</p>
            <h2>{nextAction.title}</h2>
            <p className="focus-meta">{nextAction.detail}</p>
            <div className={`risk-chip ${nextAction.risk}`}><b>{statusLabel.label}</b><span>{statusLabel.text}</span></div>
            {guide && <ActionGuide guide={guide} />}
            <div className="focus-actions"><button className="primary-button" onClick={() => onUpdate(nextAction.instance, "done")} disabled={busyId === nextAction.instance.id}>{busyId === nextAction.instance.id ? "Wird gespeichert …" : "Als erledigt markieren"}</button><button className="quiet-button" onClick={() => onUpdate(nextAction.instance, "skipped")} disabled={busyId === nextAction.instance.id}>Heute verschieben</button></div>
          </div>
        </article>
      ) : (
        <article className="focus-card completed-focus"><div className="focus-content"><p className="eyebrow">HEUTE ABGESCHLOSSEN</p><h2>Dein Tagesplan ist sauber erledigt.</h2><p className="focus-meta">Die Ergebnisse bleiben im Kalender sichtbar. Morgen startet ein neuer, klarer 10er-Plan.</p></div></article>
      )}
      <section className="today-metrics">
        <article className="daily-score-card"><p className="eyebrow">HEUTE</p><strong>{todayDoneCount} <span>/ {totalCount}</span></strong><p>erledigte Aktionen</p><div className="progress-track"><div style={{ width: `${progress}%` }} /></div></article>
        <article className="small-metric"><strong>{todaySkippedCount}</strong><span>verschoben</span></article>
        <article className="small-metric"><strong>{setupDoneCount}<small> / {setupTotal}</small></strong><span>Aufbau-Schritte</span></article>
      </section>
      <section className="week-preview"><div><p className="eyebrow">KALENDER</p><h3>Dein Fortschritt bleibt an jedem Tag sichtbar.</h3><p>Erledigte und verschobene Aktionen werden nicht zurückgesetzt, sondern zentral dokumentiert.</p></div><button className="quiet-button" onClick={onShowCalendar}>Kalender öffnen →</button></section>
    </section>
  );
}

function ActionGuide({ guide }) {
  return <details className="knowledge-card action-guide"><summary>So gehst du bei dieser Aktion vor <span>Mehr anzeigen</span></summary><div className="knowledge-guide-grid"><div><b>Warum?</b><p>{guide.why}</p></div><div><b>So gehst du vor</b><p>{guide.how}</p></div><div><b>Nicht tun</b><p>{guide.avoid}</p></div><div><b>Fertig, wenn …</b><p>{guide.done}</p></div></div></details>;
}

function KnowledgePath({ stages }) {
  return <section className="knowledge-path"><div><p className="eyebrow">WISSEN, WENN DU ES BRAUCHST</p><h2>Vier Etappen für nachhaltige GEO-Arbeit.</h2><p>Öffne nur die Etappe, die gerade zu deiner Aufgabe passt.</p></div><div className="stage-list">{stages.map(stage => <details className="knowledge-card stage-card" key={stage.id}><summary><span className="stage-number">{stage.number}</span><span><b>{stage.title}</b><small>{stage.summary}</small></span><em>Öffnen</em></summary><div className="stage-body"><p><b>Nächster sinnvoller Schritt:</b> {stage.next}</p><div>{stage.cards.map(card => <article key={card.title}><h3>{card.title}</h3><p>{card.text}</p></article>)}</div></div></details>)}</div></section>;
}

function ContentSop() {
  return <details className="knowledge-card content-sop"><summary>Content-SOP: fünf klare Schritte <span>Mehr anzeigen</span></summary><ol>{CONTENT_SOP.map(([number, title, text]) => <li key={number}><b>{number} · {title}</b><span>{text}</span></li>)}</ol></details>;
}

function WeeklyReview() {
  return <details className="knowledge-card weekly-review"><summary>10-Minuten-Wochenreview <span>Mehr anzeigen</span></summary><p>Nutze den Kalender und die echten Ergebnisse. Triff nur diese drei Entscheidungen:</p><div>{WEEKLY_REVIEW.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}</div></details>;
}

function AuthorityView({ pillars, stages, done, progress, onToggle, onOpenContent, setupDoneCount, setupTotal }) {
  return (
    <section className="view-stack">
      <div className="intro-copy compact"><div className="gradient-pill">DEIN GEO-PLAYBOOK</div><h1>Grundlagen, Plattformen und klare Outreach-Schritte.</h1><p>Hier liegt das Fundament: echte Fachlichkeit, nachvollziehbare Belege und passende Beteiligung – nicht bloß viele Links.</p></div>
      <div className="pillar-grid">{pillars.map(pillar => <article className="pillar-card" key={pillar.title}><span>{pillar.status}</span><h2>{pillar.title}</h2><p>{pillar.text}</p></article>)}</div>
      <KnowledgePath stages={stages} />
      <SignalCatalog />
      <article className="setup-summary"><div><p className="eyebrow">AUFBAU-PLAYBOOK</p><h2>{setupDoneCount} von {setupTotal} Grundlagen erledigt</h2><p>Die ursprünglichen Aufbauaufgaben bleiben vollständig erhalten und werden separat vom Tagesbetrieb geführt.</p></div><div className="progress-track"><div style={{ width: `${Math.round((setupDoneCount / setupTotal) * 100)}%` }} /></div></article>
      <div className="playbook-grid">{PLATFORMS.map(platform => {
        const platformDone = platform.tasks.filter(task => done[task.id]).length;
        const platformPercentage = Math.round((platformDone / platform.tasks.length) * 100);
        return <article className="platform-module" key={platform.id}><div className="module-head"><div><p className="eyebrow">{platform.tierLabel}</p><h2>{platform.name}</h2></div><span>{platformPercentage}%</span></div><div className="mini-track"><div style={{ width: `${platformPercentage}%` }} /></div><div className="module-tasks">{platform.tasks.map(task => {
          const complianceNote = LEGACY_COMPLIANCE_NOTES[task.id];
          return <div className={`task-block ${complianceNote ? "legacy-risk" : ""}`} key={task.id}><div className={`task-item ${done[task.id] ? "done" : ""}`}><button className="task-check" aria-label={complianceNote ? `${task.text} nicht ausführen` : `${task.text} ${done[task.id] ? "wieder öffnen" : "erledigen"}`} onClick={() => onToggle(task.id)} disabled={Boolean(complianceNote)}>{done[task.id] ? "✓" : ""}</button><button className="task-copy" onClick={() => onOpenContent(task.id)} disabled={Boolean(complianceNote)}><span>{task.text}</span><small>{task.when}{progress[task.id]?.completed_at ? ` · ${formatDate(progress[task.id].completed_at)}` : ""}</small></button></div>{complianceNote && <p className="legacy-compliance-note"><b>Red GEO · nicht ausführen</b>{complianceNote}</p>}</div>;
        })}</div><a href={platform.url} target="_blank" rel="noreferrer" className="module-link">Plattform öffnen <span>↗</span></a></article>;
      })}</div>
    </section>
  );
}

function SignalCatalog() {
  return <details className="knowledge-card signal-catalog"><summary>Signalquellen & Red GEO <span>Nur bei Bedarf öffnen</span></summary><div className="signal-catalog-body"><p>Der Tagesplan zeigt nur passende Aktionen. Hier siehst du, welche Quellen sich lohnen, welche zuerst geprüft werden müssen und was nicht eingesetzt wird.</p><div className="signal-group-grid">{SIGNAL_CATALOG.map(group => <section className={`signal-group ${group.id}`} key={group.id}><div className="signal-group-head"><b>{group.label}</b><span>{group.summary}</span></div>{group.items.map(item => <article className="signal-source" key={item.title}><div><h3>{item.title}</h3><p>{item.text}</p></div><small>{item.cadence}</small></article>)}</section>)}</div><section className="red-geo-catalog"><div><p className="eyebrow">RED GEO · NICHT AUSFÜHREN</p><h2>Warnwissen statt falscher Abkürzungen.</h2><p>Diese Muster können kurzfristig nach Reichweite aussehen, schaden aber Vertrauen, Plattformkonten oder der langfristigen Sichtbarkeit.</p></div><div className="red-geo-list">{RED_GEO_WARNINGS.map(item => <article key={item.title}><b>{item.title}</b><span>{item.text}</span></article>)}</div></section></div></details>;
}

function CalendarView({ dailyActions, todayKey, onGoToday }) {
  const days = Array.from({ length: 7 }, (_, index) => toLocalDate(addDays(new Date(), index - 3)));
  const actionCount = DAILY_ACTION_TEMPLATES.length;

  return (
    <section className="view-stack"><div className="intro-copy compact"><div className="gradient-pill">KALENDER & NACHWEIS</div><h1>Was wurde wann wirklich getan?</h1><p>Der Tagesplan startet neu. Der Nachweis bleibt zentral erhalten – für dich und später für dein Team.</p></div><div className="calendar-grid">{days.map(day => {
      const dayActions = dailyActions.filter(action => action.planned_for === day);
      const doneCount = dayActions.filter(action => action.status === "done").length;
      const skippedCount = dayActions.filter(action => action.status === "skipped").length;
      const isToday = day === todayKey;
      return <article className={`calendar-day ${isToday ? "today" : ""}`} key={day}><div className="calendar-day-head"><span>{isToday ? "Heute" : formatShortDay(day)}</span><b>{doneCount}/{dayActions.length || actionCount}</b></div><div className="calendar-track"><div style={{ width: `${(doneCount / (dayActions.length || actionCount)) * 100}%` }} /></div><p>{dayActions.length ? `${doneCount} erledigt · ${skippedCount} verschoben` : day < todayKey ? "Kein Tagesplan gespeichert" : "Noch nicht gestartet"}</p></article>;
    })}</div><section className="calendar-history"><p className="eyebrow">LETZTE TAGESAKTIONEN</p>{dailyActions.length ? dailyActions.slice(0, 20).map(action => { const template = dailyActionById(action.template_id); return <div className="calendar-history-row" key={action.id}><div><b>{formatShortDay(action.planned_for)}</b><span>{template?.title || action.template_id}</span></div><em className={action.status}>{action.status === "done" ? "Erledigt" : action.status === "skipped" ? "Verschoben" : "Offen"}</em></div>; }) : <p className="empty-copy">Sobald der erste Tagesplan angelegt ist, erscheint der Verlauf hier.</p>}</section><button className="quiet-button calendar-back" onClick={onGoToday}>Zur heutigen Aktion →</button></section>
  );
}

function ContentView({ task, form, setForm, busy, onSave, onBack }) {
  const status = CONTENT_STATUSES.find(item => item.id === form.status)?.label || "Idee";
  return (
    <section className="view-stack"><button className="back-button" onClick={onBack}>← Zurück zum Playbook</button><div className="intro-copy compact"><div className="gradient-pill">CONTENT-WORKFLOW · {status.toUpperCase()}</div><h1>{task.text}</h1><p>{task.platform} · {task.when}</p></div><ContentSop /><form className="content-editor" onSubmit={onSave}><div className="editor-head"><div><p className="eyebrow">SCHRITT FÜR SCHRITT</p><h2>Content vorbereiten</h2></div><a href={task.url} target="_blank" rel="noreferrer" className="quiet-button">Plattform öffnen ↗</a></div><label htmlFor="content-status">Status</label><div className="status-options" id="content-status">{CONTENT_STATUSES.map(item => <button type="button" className={form.status === item.id ? "selected" : ""} onClick={() => setForm(current => ({ ...current, status: item.id }))} key={item.id}>{item.label}</button>)}</div><label htmlFor="briefing">Kurzes Briefing</label><textarea id="briefing" value={form.briefing} onChange={event => setForm(current => ({ ...current, briefing: event.target.value }))} placeholder="Wem hilft dieser Beitrag? Was ist die eine klare Aussage?" rows="4" /><label htmlFor="draft">Entwurf</label><textarea id="draft" value={form.draft} onChange={event => setForm(current => ({ ...current, draft: event.target.value }))} placeholder="Entwurf hier festhalten …" rows="10" /><div className="editor-footer"><p>Der Entwurf wird zentral gespeichert. Veröffentlichen bleibt ein eigener, kontrollierter Schritt.</p><button className="primary-button" disabled={busy}>{busy ? "Wird gespeichert …" : "Content speichern"}</button></div></form></section>
  );
}

function ProgressView({ activity, profileName, setProfileName, busy, onSaveName, onSignOut, todayDoneCount, totalCount, setupDoneCount, setupTotal }) {
  const dailyPercentage = totalCount ? Math.round((todayDoneCount / totalCount) * 100) : 0;
  const setupPercentage = Math.round((setupDoneCount / setupTotal) * 100);

  return (
    <section className="view-stack"><div className="intro-copy compact"><div className="gradient-pill">ZENTRAL & NACHVOLLZIEHBAR</div><h1>Dein System lernt aus echter Arbeit.</h1><p>Der Tagesbetrieb zeigt deine heutige Bewegung. Das Aufbau-Playbook zeigt, wie weit dein Fundament bereits steht.</p></div><WeeklyReview /><div className="progress-summary"><strong>{dailyPercentage}%</strong><div><h2>{todayDoneCount} von {totalCount} Tagesaktionen erledigt</h2><div className="progress-track"><div style={{ width: `${dailyPercentage}%` }} /></div><p className="secondary-progress">Aufbau-Fundament: {setupDoneCount} von {setupTotal} · {setupPercentage}%</p></div></div><div className="progress-columns"><article className="activity-card"><p className="eyebrow">LETZTE AKTIVITÄTEN</p>{activity.length ? activity.map(item => <div className="activity-row" key={item.id}><span className="activity-dot" /><div><p><b>{item.actor_name}</b> {activityLabel(item.action, item.task_id)}</p><small>{formatDate(item.created_at)}</small></div></div>) : <p className="empty-copy">Dein Aktivitätsverlauf erscheint nach dem ersten gespeicherten Schritt.</p>}</article><article className="profile-card"><p className="eyebrow">DEIN ADMIN-KONTO</p><form onSubmit={onSaveName}><label htmlFor="profile-name">Anzeigename</label><input id="profile-name" value={profileName} onChange={event => setProfileName(event.target.value)} required /><button className="quiet-button" disabled={busy}>Name speichern</button></form><button className="signout-button" onClick={onSignOut} disabled={busy}>Abmelden</button></article></div></section>
  );
}

export default App;
