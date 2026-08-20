import { useEffect, useMemo, useState } from "react";
import { PLATFORMS } from "./data/tasks";
import { AUTHORITY_PILLARS, DAILY_ACTION_TEMPLATES, RISK_COPY } from "./data/dailyActions";
import { CONTENT_SOP, DAILY_ACTION_GUIDES, PLAYBOOK_STAGES, WEEKLY_REVIEW } from "./data/knowledgeModules";
import { EXTERNAL_LINK_CHECK, LEGACY_COMPLIANCE_NOTES, RED_GEO_WARNINGS, SIGNAL_CATALOG } from "./data/platformCatalog";
import { isSupabaseConfigured, supabase } from "./supabase";
import IntelligenceView from "./IntelligenceView";
import { loadIntelligenceData } from "./data/intelligenceStore";
import {
  acceptTeamInvitation,
  assignWorkspaceTask,
  bootstrapWorkspace,
  completeApprovedAction,
  createTeamInvitation,
  decideApprovalRequest,
  ensureDailyActions,
  getSession,
  getWorkspace,
  loadWorkspaceData,
  requestMagicLink,
  saveContentItem,
  saveDailyActionStatus,
  saveTaskProgress,
  signOut,
  submitApprovalRequest,
  updateProfileName,
} from "./data/teamStore";
import "./App.css";

const CURRENT_ACTION_SCHEDULES = new Set(["Heute", "Morgen", "Diese Woche"]);
const NAV_ITEMS = [
  { id: "today", label: "Heute", number: "1" },
  { id: "playbook", label: "Playbook", number: "2" },
  { id: "content", label: "Content", number: "3" },
  { id: "team", label: "Team", number: "4" },
  { id: "progress", label: "Fortschritt", number: "5" },
  { id: "intelligence", label: "Intelligenz", number: "6" },
];
const CONTENT_STATUSES = [
  { id: "idea", label: "Idee" },
  { id: "draft", label: "Entwurf" },
  { id: "review", label: "Prüfung läuft" },
  { id: "approved", label: "Freigegeben" },
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
  if (action === "member_invited") return "hat ein Teammitglied eingeladen";
  if (action === "member_joined") return "ist dem Playbook-Team beigetreten";
  if (action === "task_assigned") return `hat „${taskText}“ zugewiesen`;
  if (action === "approval_requested") return `hat „${taskText}“ zur Freigabe eingereicht`;
  if (action === "approval_approved") return `hat „${taskText}“ freigegeben`;
  if (action === "approval_changes_requested") return `hat Änderungen zu „${taskText}“ angefordert`;
  if (action === "approval_declined") return `hat „${taskText}“ nicht freigegeben`;
  if (action === "approval_completed") return `hat die Ausführung zu „${taskText}“ dokumentiert`;
  if (action === "approval_expired") return `hatte eine abgelaufene Freigabe zu „${taskText}“`;
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

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "reviewer") return "Reviewer";
  return "Mitglied";
}

let rewardAudioContext;

function getRewardAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!rewardAudioContext || rewardAudioContext.state === "closed") rewardAudioContext = new AudioContextClass();
  return rewardAudioContext;
}

function unlockRewardChime() {
  const context = getRewardAudioContext();
  if (!context) return;
  if (context.state === "suspended") context.resume().catch(() => {});

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.00001, context.currentTime);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.01);
}

function playRewardChime() {
  const context = getRewardAudioContext();
  if (!context) return;

  const scheduleChime = () => {
    const start = context.currentTime + 0.01;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + (index * 0.09);
      oscillator.type = index === 2 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.06 - (index * 0.009), noteStart + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.46);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.5);
    });
  };

  if (context.state === "suspended") context.resume().then(scheduleChime).catch(() => {});
  else scheduleChime();
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
  const [members, setMembers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [intelligenceData, setIntelligenceData] = useState({ profile: null, topics: [], questions: [], sources: [], claims: [], claimLinks: [], questionLinks: [], metrics: [], monitors: [], snapshots: [], googleIntegration: null, googleImportRuns: [] });
  const [activeView, setActiveView] = useState("today");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [contentReturnView, setContentReturnView] = useState("playbook");
  const [calendarAnchor, setCalendarAnchor] = useState(() => toLocalDate());
  const [toast, setToast] = useState("");
  const [celebration, setCelebration] = useState(null);
  const [rewardSoundOn, setRewardSoundOn] = useState(() => window.localStorage.getItem("geo-playbook-reward-sound") !== "off");
  const [busy, setBusy] = useState(false);
  const [dailyBusyId, setDailyBusyId] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginCooldownEndsAt, setLoginCooldownEndsAt] = useState(0);
  const [setupName, setSetupName] = useState("Tommy");
  const [workspaceName, setWorkspaceName] = useState("GEO Playbook");
  const [profileName, setProfileName] = useState("");
  const [contentForm, setContentForm] = useState({ briefing: "", draft: "", status: "idea" });
  const [inviteForm, setInviteForm] = useState({ email: "", displayName: "", role: "member" });

  const todayKey = toLocalDate();
  const allTasks = useMemo(() => PLATFORMS.flatMap(platform => platform.tasks.map(task => ({ ...task, platform: platform.name, platformId: platform.id, url: platform.url }))), []);
  const actionableTasks = useMemo(() => allTasks.filter(task => !LEGACY_COMPLIANCE_NOTES[task.id]), [allTasks]);
  const setupDoneCount = actionableTasks.filter(task => done[task.id]).length;

  const nextSetupTask = useMemo(() => {
    for (const platform of PLATFORMS) {
      const task = platform.tasks.find(item => !LEGACY_COMPLIANCE_NOTES[item.id] && !done[item.id] && CURRENT_ACTION_SCHEDULES.has(item.when));
      if (task) return { ...task, platform: platform.name, platformId: platform.id, url: platform.url };
    }

    return actionableTasks.find(task => !done[task.id]) || null;
  }, [actionableTasks, done]);

  const todayInstances = useMemo(() => dailyActions.filter(action => action.planned_for === todayKey), [dailyActions, todayKey]);
  const todayInstanceByTemplate = useMemo(() => new Map(todayInstances.map(action => [action.template_id, action])), [todayInstances]);
  const todayQueue = useMemo(() => DAILY_ACTION_TEMPLATES.map(template => ({ ...template, instance: todayInstanceByTemplate.get(template.id) })).filter(item => item.instance), [todayInstanceByTemplate]);
  const todayDoneCount = todayQueue.filter(item => item.instance.status === "done").length;
  const todaySkippedCount = todayQueue.filter(item => item.instance.status === "skipped").length;
  const nextDailyAction = todayQueue.find(item => item.instance.status === "planned") || null;
  const selectedTask = taskById(selectedTaskId) || nextSetupTask || actionableTasks[0];
  const selectedContentTaskId = selectedTask?.id;
  const todayLabel = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const showToast = message => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const triggerReward = (title, detail) => {
    const id = Date.now();
    setCelebration({ id, title, detail });
    if (rewardSoundOn) playRewardChime();
    window.setTimeout(() => setCelebration(current => current?.id === id ? null : current), 3400);
  };

  const toggleRewardSound = () => {
    setRewardSoundOn(current => {
      const next = !current;
      window.localStorage.setItem("geo-playbook-reward-sound", next ? "on" : "off");
      return next;
    });
  };

  const hydrateWorkspace = async (workspaceData, userId) => {
    const [data, intelligence] = await Promise.all([
      loadWorkspaceData(workspaceData.id, userId),
      loadIntelligenceData(workspaceData.id),
    ]);
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
    setMembers(data.members);
    setApprovals(data.approvals);
    setIntelligenceData(intelligence);
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
      const acceptedWorkspaceId = await acceptTeamInvitation();
      const workspaceData = await getWorkspace(currentSession.user.id);
      await hydrateWorkspace(workspaceData, currentSession.user.id);
      if (acceptedWorkspaceId) showToast("Du bist jetzt im GEO-Playbook-Team.");
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
    if (!loginCooldownEndsAt) return undefined;
    const remaining = Math.max(0, loginCooldownEndsAt - Date.now());
    const timeout = window.setTimeout(() => setLoginCooldownEndsAt(0), remaining);
    return () => window.clearTimeout(timeout);
  }, [loginCooldownEndsAt]);

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
    if (loginCooldownEndsAt > Date.now()) return;
    setLoginError("");
    setBusy(true);
    try {
      await requestMagicLink(loginEmail.trim());
      setLoginSent(true);
    } catch (error) {
      const message = errorMessage(error);
      if (/email.*rate|rate.*email|zu viele/i.test(message)) {
        setLoginError("Zu viele Anmeldelinks wurden in kurzer Zeit angefordert. Nutze bitte einen bereits gesendeten Link in deinem E-Mail-Postfach. Neue Links sind vorübergehend gesperrt.");
        setLoginCooldownEndsAt(Date.now() + (10 * 60 * 1000));
      } else {
        setLoginError(message);
      }
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
    if (nextStatus === "done" && rewardSoundOn) unlockRewardChime();
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
      if (nextStatus === "done") triggerReward("Tagesaktion abgeschlossen", "Die nächste klare Aufgabe ist bereit.");
    } catch (error) {
      setDailyActions(previousActions);
      showToast(errorMessage(error));
    } finally {
      setDailyBusyId("");
    }
  };

  const handleTaskToggle = async taskId => {
    const nextValue = !done[taskId];
    if (nextValue && rewardSoundOn) unlockRewardChime();
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
      if (nextValue) triggerReward("Aufbau-Schritt abgeschlossen", "Dein GEO-Fundament wächst.");
    } catch (error) {
      setDone(previousDone);
      setProgress(previousProgress);
      showToast(errorMessage(error));
    }
  };

  const openContent = (taskId, returnView = activeView) => {
    setSelectedTaskId(taskId);
    setContentReturnView(returnView === "content" ? "playbook" : returnView);
    setActiveView("content");
  };

  const saveContent = async event => {
    event.preventDefault();
    if (!selectedTask) return;
    if (contentForm.status === "done" && rewardSoundOn) unlockRewardChime();

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
      if (contentForm.status === "done") triggerReward("Content abgeschlossen", "Dein nächster fokussierter Schritt ist bereit.");
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const refreshWorkspace = async () => {
    if (!workspace || !session?.user) return;
    await hydrateWorkspace(workspace, session.user.id);
  };

  const handleInvite = async event => {
    event.preventDefault();
    setBusy(true);
    try {
      await createTeamInvitation({ workspaceId: workspace.id, ...inviteForm });
      setInviteForm({ email: "", displayName: "", role: "member" });
      await refreshWorkspace();
      showToast("Einladung und sicherer Anmeldelink wurden gesendet.");
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleAssignTask = async (taskId, userId) => {
    if (!userId) return;
    setBusy(true);
    try {
      await assignWorkspaceTask({ workspaceId: workspace.id, taskId, userId });
      await refreshWorkspace();
      showToast("Aufgabe ist klar zugewiesen.");
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitApproval = async ({ task, criteria, requestNote }) => {
    setBusy(true);
    try {
      await saveContentItem({
        workspaceId: workspace.id,
        taskId: task.id,
        briefing: contentForm.briefing,
        draft: contentForm.draft,
        status: "draft",
      });
      await submitApprovalRequest({
        workspaceId: workspace.id,
        taskId: task.id,
        platformName: task.platform,
        platformUrl: task.url,
        criteria,
        requestNote,
        contentSnapshot: contentForm.draft,
      });
      await refreshWorkspace();
      setActiveView("team");
      showToast("Freigabe angefordert. Die nächste Aktion liegt beim Reviewer.");
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleApprovalDecision = async (requestId, decision, decisionNote) => {
    setBusy(true);
    try {
      await decideApprovalRequest({ requestId, decision, decisionNote });
      await refreshWorkspace();
      showToast(decision === "approved" ? "Freigabe erteilt. Der Portal-Startlink ist nun für die zuständige Person sichtbar." : "Entscheidung ist gespeichert.");
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteApproval = async (requestId, publicationUrl, resultNote) => {
    if (rewardSoundOn) unlockRewardChime();
    setBusy(true);
    try {
      await completeApprovedAction({ requestId, publicationUrl, resultNote });
      await refreshWorkspace();
      showToast("Ausführung und Ergebnis sind zentral dokumentiert.");
      triggerReward("Teammaßnahme abgeschlossen", "Ergebnis und Verantwortung sind sauber dokumentiert.");
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
  if (screen === "login") return <AuthScreen email={loginEmail} setEmail={setLoginEmail} sent={loginSent} error={loginError} busy={busy} coolingDown={loginCooldownEndsAt > Date.now()} onSubmit={handleLogin} />;
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
          <div className="topbar-actions">
            <button className="sound-toggle" type="button" aria-pressed={rewardSoundOn} onClick={toggleRewardSound}>Sound: {rewardSoundOn ? "an" : "aus"}</button>
            <div className="profile-control">
              <div className="avatar">{profile.display_name.slice(0, 1).toUpperCase()}</div>
              <div><strong>{profile.display_name}</strong><span>{roleLabel(workspace.role)}</span></div>
            </div>
          </div>
        </header>

        {activeView === "today" && <TodayView nextAction={nextDailyAction} guide={nextDailyAction ? DAILY_ACTION_GUIDES[nextDailyAction.id] : null} todayQueue={todayQueue} todayDoneCount={todayDoneCount} todaySkippedCount={todaySkippedCount} totalCount={todayQueue.length} onUpdate={handleDailyAction} busyId={dailyBusyId} onShowCalendar={() => setActiveView("progress")} setupDoneCount={setupDoneCount} setupTotal={actionableTasks.length} />}
        {activeView === "playbook" && <AuthorityView pillars={AUTHORITY_PILLARS} stages={PLAYBOOK_STAGES} done={done} progress={progress} onToggle={handleTaskToggle} onOpenContent={taskId => openContent(taskId, "playbook")} setupDoneCount={setupDoneCount} setupTotal={actionableTasks.length} />}
        {activeView === "content" && selectedTask && <ContentView task={selectedTask} form={contentForm} setForm={setContentForm} busy={busy} onSave={saveContent} onBack={() => setActiveView(contentReturnView)} members={members} progress={progress[selectedTask.id]} canAssign={workspace.role === "admin"} onAssign={handleAssignTask} approvals={approvals} userId={session.user.id} canRequestApproval={!LEGACY_COMPLIANCE_NOTES[selectedTask.id]} onSubmitApproval={handleSubmitApproval} onCompleteApproval={handleCompleteApproval} />}
        {activeView === "team" && <TeamView workspace={workspace} profile={profile} members={members} approvals={approvals} inviteForm={inviteForm} setInviteForm={setInviteForm} busy={busy} onInvite={handleInvite} onDecision={handleApprovalDecision} onOpenContent={taskId => openContent(taskId, "team")} />}
        {activeView === "progress" && <><CalendarView dailyActions={dailyActions} todayKey={todayKey} selectedDate={calendarAnchor} onSelectDate={setCalendarAnchor} onPreviousWeek={() => setCalendarAnchor(current => toLocalDate(addDays(dateFromIso(current), -7)))} onNextWeek={() => setCalendarAnchor(current => toLocalDate(addDays(dateFromIso(current), 7)))} onGoToday={() => { setCalendarAnchor(todayKey); setActiveView("today"); }} /><ProgressView activity={activity} profileName={profileName} setProfileName={setProfileName} busy={busy} onSaveName={saveName} onSignOut={handleSignOut} todayDoneCount={todayDoneCount} totalCount={todayQueue.length} setupDoneCount={setupDoneCount} setupTotal={actionableTasks.length} /></>}
        {activeView === "intelligence" && <IntelligenceView workspace={workspace} data={intelligenceData} onRefresh={refreshWorkspace} />}
      </main>

      {celebration && <div className="reward-celebration" role="status" aria-live="polite"><div className="reward-sparkles" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(item => <i key={item} />)}</div><p>ABSCHLUSS GESPEICHERT</p><strong>{celebration.title}</strong><span>{celebration.detail}</span></div>}
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

function AuthScreen({ email, setEmail, sent, error, busy, coolingDown, onSubmit }) {
  return (
    <div className="state-shell"><div className="state-card auth-card"><div className="gradient-pill">GEO PLAYBOOK</div><h1>Ein klarer Schritt nach dem anderen.</h1>{sent ? <><p>Wir haben dir einen sicheren Anmeldelink geschickt. Öffne ihn in deinem E-Mail-Postfach, um deinen Tagesplan zu starten.</p><div className="auth-hint"><b>Am Handy:</b> Öffne den Link vollständig im Browser. Schließe ihn nicht direkt in der E-Mail-Vorschau.</div></> : <><p>Melde dich an, um deinen zentral gespeicherten Tagesplan, Kalender und Content-Workflow zu öffnen.</p><form onSubmit={onSubmit} className="auth-form"><label htmlFor="email">Deine E-Mail-Adresse</label><input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tommy@beispiel.de" required disabled={coolingDown} /><button className="primary-button" disabled={busy || coolingDown}>{busy ? "Wird gesendet …" : coolingDown ? "Bitte später erneut versuchen" : "Sicheren Link senden"}</button>{error && <p className="auth-error" role="alert">{error}</p>}</form></>}</div></div>
  );
}

function OnboardingScreen({ name, setName, workspaceName, setWorkspaceName, busy, onSubmit }) {
  return (
    <div className="state-shell"><div className="state-card auth-card"><div className="gradient-pill">STUFE 1 · TOMMY-ADMIN</div><h1>Dein Playbook ist bereit.</h1><p>Lege jetzt den ersten zentralen Arbeitsbereich an. Weitere Teammitglieder können später kontrolliert ergänzt werden.</p><form onSubmit={onSubmit} className="auth-form"><label htmlFor="admin-name">Dein Name</label><input id="admin-name" value={name} onChange={event => setName(event.target.value)} required /><label htmlFor="workspace-name">Name des Arbeitsbereichs</label><input id="workspace-name" value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} required /><button className="primary-button" disabled={busy}>{busy ? "Wird eingerichtet …" : "Playbook als Admin starten"}</button></form></div></div>
  );
}

function TodayView({ nextAction, guide, todayQueue, todayDoneCount, todaySkippedCount, totalCount, onUpdate, busyId, onShowCalendar, setupDoneCount, setupTotal }) {
  const [externalChecks, setExternalChecks] = useState({});
  const statusLabel = nextAction ? RISK_COPY[nextAction.risk] : null;
  const progress = totalCount ? Math.round((todayDoneCount / totalCount) * 100) : 0;
  const finishedActions = todayQueue.filter(action => action.instance.status === "done" || action.instance.status === "skipped");
  const needsExternalCheck = nextAction?.risk === "amber";
  const allExternalChecksPassed = EXTERNAL_LINK_CHECK.every(item => externalChecks[item.id]);

  useEffect(() => {
    setExternalChecks({});
  }, [nextAction?.instance.id]);

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
            {needsExternalCheck && <ExternalLinkCheck platform={nextAction.platform} interactive checks={externalChecks} onChange={setExternalChecks} allPassed={allExternalChecksPassed} />}
            <div className="focus-actions"><button className="primary-button" onClick={() => onUpdate(nextAction.instance, "done")} disabled={busyId === nextAction.instance.id || (needsExternalCheck && !allExternalChecksPassed)}>{busyId === nextAction.instance.id ? "Wird gespeichert …" : needsExternalCheck && !allExternalChecksPassed ? "Erst 4 Kriterien bestätigen" : "Als erledigt markieren"}</button><button className="quiet-button" onClick={() => onUpdate(nextAction.instance, "skipped")} disabled={busyId === nextAction.instance.id}>Heute verschieben</button></div>
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
      <TodayHistory actions={finishedActions} />
      <section className="week-preview"><div><p className="eyebrow">KALENDER</p><h3>Dein Fortschritt bleibt an jedem Tag sichtbar.</h3><p>Erledigte und verschobene Aktionen werden nicht zurückgesetzt, sondern zentral dokumentiert.</p></div><button className="quiet-button" onClick={onShowCalendar}>Kalender öffnen →</button></section>
    </section>
  );
}

function TodayHistory({ actions }) {
  return <section className="today-history"><div><p className="eyebrow">HEUTIGER VERLAUF</p><h3>Was heute erledigt wurde.</h3></div>{actions.length ? <div className="today-history-list">{actions.map(action => {
    const completed = action.instance.status === "done";
    return <article className={completed ? "completed" : "skipped"} key={action.instance.id}><span>{completed ? "✓" : "→"}</span><div><b>{action.title}</b><small>{action.category} · {action.platform}{action.instance.completed_at ? ` · ${formatDate(action.instance.completed_at)}` : ""}</small></div><em>{completed ? "Erledigt" : "Verschoben"}</em></article>;
  })}</div> : <p className="today-history-empty">Sobald du eine Aktion abhakt, steht hier direkt, was erledigt wurde.</p>}</section>;
}

function ActionGuide({ guide }) {
  return <details className="knowledge-card action-guide"><summary>So gehst du bei dieser Aktion vor <span>Mehr anzeigen</span></summary><div className="knowledge-guide-grid"><div><b>Warum?</b><p>{guide.why}</p></div><div><b>So gehst du vor</b><p>{guide.how}</p></div><div><b>Nicht tun</b><p>{guide.avoid}</p></div><div><b>Fertig, wenn …</b><p>{guide.done}</p></div></div></details>;
}

function ExternalLinkCheck({ platform, interactive = false, checks = {}, onChange, allPassed = false }) {
  return <details className={`knowledge-card external-link-check ${interactive ? "interactive" : ""}`} open={interactive ? true : undefined}><summary>4-Kriterien-Prüfung für externe Erwähnung <span>{interactive ? "Jetzt prüfen" : "Bei Plattformchance öffnen"}</span></summary><div className="external-link-check-body"><p>Für <b>{platform}</b>: Eine Erwähnung ist nur vertretbar, wenn alle vier Antworten klar „Ja“ sind.</p><div className="external-check-list">{EXTERNAL_LINK_CHECK.map(item => interactive ? <label className={checks[item.id] ? "checked" : ""} key={item.id}><input type="checkbox" checked={Boolean(checks[item.id])} onChange={event => onChange(current => ({ ...current, [item.id]: event.target.checked }))} /><span><b>{item.title}</b>{item.text}</span></label> : <article key={item.id}><b>{item.title}</b><span>{item.text}</span><em>{item.fail}</em></article>)}</div>{interactive && <p className={`external-check-result ${allPassed ? "approved" : "pending"}`}>{allPassed ? "Grün: Eine transparente Erwähnung kann erwogen werden. Veröffentlichen bleibt ein eigener, kontrollierter Schritt." : "Gelb: Wenn auch nur ein Kriterium offen bleibt, dokumentiere die Chance – aber veröffentliche keinen Link."}</p>}</div></details>;
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
        const actionablePlatformTasks = platform.tasks.filter(task => !LEGACY_COMPLIANCE_NOTES[task.id]);
        const platformDone = actionablePlatformTasks.filter(task => done[task.id]).length;
        const platformPercentage = actionablePlatformTasks.length ? Math.round((platformDone / actionablePlatformTasks.length) * 100) : 0;
        const isRedPlatform = actionablePlatformTasks.length === 0;
        return <article className={`platform-module ${isRedPlatform ? "red-platform" : ""}`} key={platform.id}><div className="module-head"><div><p className="eyebrow">{platform.tierLabel}</p><h2>{platform.name}</h2></div><span>{isRedPlatform ? "Red GEO" : `${platformPercentage}%`}</span></div><div className="mini-track"><div style={{ width: `${platformPercentage}%` }} /></div><div className="module-tasks">{platform.tasks.map(task => {
          const complianceNote = LEGACY_COMPLIANCE_NOTES[task.id];
          return <div className={`task-block ${complianceNote ? "legacy-risk" : ""}`} key={task.id}><div className={`task-item ${done[task.id] ? "done" : ""}`}><button className="task-check" aria-label={complianceNote ? `${task.text} nicht ausführen` : `${task.text} ${done[task.id] ? "wieder öffnen" : "erledigen"}`} onClick={() => onToggle(task.id)} disabled={Boolean(complianceNote)}>{done[task.id] ? "✓" : ""}</button><button className="task-copy" onClick={() => onOpenContent(task.id)} disabled={Boolean(complianceNote)}><span>{task.text}</span><small>{task.when}{progress[task.id]?.completed_at ? ` · ${formatDate(progress[task.id].completed_at)}` : ""}</small></button></div>{complianceNote && <p className="legacy-compliance-note"><b>Red GEO · nicht ausführen</b>{complianceNote}</p>}</div>;
        })}</div>{!isRedPlatform && <ExternalLinkCheck platform={platform.name} />}<a href={platform.url} target="_blank" rel="noreferrer" className="module-link">Plattform öffnen <span>↗</span></a></article>;
      })}</div>
    </section>
  );
}

function SignalCatalog() {
  return <details className="knowledge-card signal-catalog"><summary>Signalquellen & Red GEO <span>Nur bei Bedarf öffnen</span></summary><div className="signal-catalog-body"><p>Der Tagesplan zeigt nur passende Aktionen. Hier siehst du, welche Quellen sich lohnen, welche zuerst geprüft werden müssen und was nicht eingesetzt wird.</p><div className="signal-group-grid">{SIGNAL_CATALOG.map(group => <section className={`signal-group ${group.id}`} key={group.id}><div className="signal-group-head"><b>{group.label}</b><span>{group.summary}</span></div>{group.items.map(item => <article className="signal-source" key={item.title}><div><h3>{item.title}</h3><p>{item.text}</p></div><small>{item.cadence}</small></article>)}</section>)}</div><section className="red-geo-catalog"><div><p className="eyebrow">RED GEO · NICHT AUSFÜHREN</p><h2>Warnwissen statt falscher Abkürzungen.</h2><p>Diese Muster können kurzfristig nach Reichweite aussehen, schaden aber Vertrauen, Plattformkonten oder der langfristigen Sichtbarkeit.</p></div><div className="red-geo-list">{RED_GEO_WARNINGS.map(item => <article key={item.title}><b>{item.title}</b><span>{item.text}</span></article>)}</div></section></div></details>;
}

function CalendarView({ dailyActions, todayKey, selectedDate, onSelectDate, onPreviousWeek, onNextWeek, onGoToday }) {
  const days = Array.from({ length: 7 }, (_, index) => toLocalDate(addDays(dateFromIso(selectedDate), index - 3)));
  const actionCount = DAILY_ACTION_TEMPLATES.length;
  const selectedActions = dailyActions.filter(action => action.planned_for === selectedDate);
  const selectedDoneCount = selectedActions.filter(action => action.status === "done").length;
  const selectedSkippedCount = selectedActions.filter(action => action.status === "skipped").length;
  const selectedLabel = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dateFromIso(selectedDate));

  return (
    <section className="view-stack">
      <div className="intro-copy compact"><div className="gradient-pill">KALENDER & NACHWEIS</div><h1>Was wurde wann wirklich getan?</h1><p>Blättere wochenweise vor oder zurück und tippe einen Tag an. Der Tagesplan wird nur am betreffenden Tag erzeugt – die Historie bleibt unverändert.</p></div>
      <div className="calendar-navigation" aria-label="Kalendernavigation"><button className="quiet-button" onClick={onPreviousWeek}>← 7 Tage</button><div><b>{formatShortDay(days[0])} – {formatShortDay(days[6])}</b><small>{selectedDate === todayKey ? "Heute ausgewählt" : "Tag ausgewählt"}</small></div><div><button className="quiet-button" onClick={() => onSelectDate(todayKey)}>Heute</button><button className="quiet-button" onClick={onNextWeek}>7 Tage →</button></div></div>
      <div className="calendar-grid">{days.map(day => {
        const dayActions = dailyActions.filter(action => action.planned_for === day);
        const doneCount = dayActions.filter(action => action.status === "done").length;
        const skippedCount = dayActions.filter(action => action.status === "skipped").length;
        const isToday = day === todayKey;
        const isSelected = day === selectedDate;
        const statusCopy = dayActions.length ? `${doneCount} erledigt · ${skippedCount} verschoben` : day < todayKey ? "Kein Tagesplan gespeichert" : "Noch nicht gestartet";
        return <button type="button" className={`calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`} onClick={() => onSelectDate(day)} aria-pressed={isSelected} key={day}><div className="calendar-day-head"><span>{isToday ? "Heute" : formatShortDay(day)}</span><b>{doneCount}/{dayActions.length || actionCount}</b></div><div className="calendar-track"><div style={{ width: `${(doneCount / (dayActions.length || actionCount)) * 100}%` }} /></div><p>{statusCopy}</p></button>;
      })}</div>
      <section className="calendar-selected-day"><div><p className="eyebrow">AUSGEWÄHLTER TAG</p><h2>{selectedLabel}</h2><p>{selectedActions.length ? `${selectedDoneCount} erledigt · ${selectedSkippedCount} verschoben · ${selectedActions.length - selectedDoneCount - selectedSkippedCount} offen` : selectedDate > todayKey ? "Der Tagesplan wird erst an diesem Tag angelegt. So entstehen keine künstlichen Zukunftseinträge." : "Für diesen Tag wurde kein Tagesplan gespeichert."}</p></div>{selectedActions.length ? <div className="calendar-selected-list">{selectedActions.map(action => { const template = dailyActionById(action.template_id); return <article key={action.id}><span className={action.status}>{action.status === "done" ? "✓" : action.status === "skipped" ? "→" : "•"}</span><div><b>{template?.title || action.template_id}</b><small>{template?.platform || "GEO Playbook"}</small></div><em className={action.status}>{action.status === "done" ? "Erledigt" : action.status === "skipped" ? "Verschoben" : "Offen"}</em></article>; })}</div> : null}</section>
      <section className="calendar-history"><p className="eyebrow">LETZTE TAGESAKTIONEN</p>{dailyActions.length ? dailyActions.slice(0, 20).map(action => { const template = dailyActionById(action.template_id); return <button type="button" className="calendar-history-row" onClick={() => onSelectDate(action.planned_for)} key={action.id}><div><b>{formatShortDay(action.planned_for)}</b><span>{template?.title || action.template_id}</span></div><em className={action.status}>{action.status === "done" ? "Erledigt" : action.status === "skipped" ? "Verschoben" : "Offen"}</em></button>; }) : <p className="empty-copy">Sobald der erste Tagesplan angelegt ist, erscheint der Verlauf hier.</p>}</section>
      <button className="quiet-button calendar-back" onClick={onGoToday}>Zur heutigen Aktion →</button>
    </section>
  );
}

function ContentView({ task, form, setForm, busy, onSave, onBack, members, progress, canAssign, onAssign, approvals, userId, canRequestApproval, onSubmitApproval, onCompleteApproval }) {
  const [criteria, setCriteria] = useState({});
  const [requestNote, setRequestNote] = useState("");
  const [resultForm, setResultForm] = useState({ publicationUrl: "", resultNote: "" });
  const status = CONTENT_STATUSES.find(item => item.id === form.status)?.label || "Idee";
  const activeApproval = approvals.find(item => item.task_id === task.id && item.requested_by === userId && ["requested", "changes_requested", "approved"].includes(item.status));
  const validApproval = activeApproval?.status === "approved" && activeApproval.expires_at && new Date(activeApproval.expires_at) > new Date();
  const approvalExpired = activeApproval?.status === "approved" && !validApproval;
  const canSubmitAgain = activeApproval?.status === "changes_requested" || approvalExpired;
  const assignedMember = members.find(member => member.user_id === progress?.assigned_to);
  const allCriteriaPassed = EXTERNAL_LINK_CHECK.every(item => criteria[item.id]);
  const contentLocked = activeApproval?.status === "requested" || validApproval;

  useEffect(() => {
    setCriteria({});
    setRequestNote("");
    setResultForm({ publicationUrl: "", resultNote: "" });
  }, [task.id]);

  useEffect(() => {
    if (approvalExpired && !["idea", "draft"].includes(form.status)) {
      setForm(current => ({ ...current, status: "draft" }));
    }
  }, [approvalExpired, form.status, setForm]);

  return (
    <section className="view-stack">
      <button className="back-button" onClick={onBack}>← Zurück</button>
      <div className="intro-copy compact"><div className="gradient-pill">CONTENT-WORKFLOW · {status.toUpperCase()}</div><h1>{task.text}</h1><p>{task.platform} · {task.when}</p></div>
      <ContentSop />
      <form className="content-editor" onSubmit={onSave}>
        <div className="editor-head"><div><p className="eyebrow">SCHRITT FÜR SCHRITT</p><h2>Content vorbereiten</h2></div><span className={`content-status-badge ${form.status}`}>{status}</span></div>
        <label htmlFor="content-status">Arbeitsstatus</label>
        <div className="status-options" id="content-status">{CONTENT_STATUSES.filter(item => ["idea", "draft"].includes(item.id)).map(item => <button type="button" className={form.status === item.id ? "selected" : ""} onClick={() => setForm(current => ({ ...current, status: item.id }))} disabled={contentLocked} key={item.id}>{item.label}</button>)}</div>
        <label htmlFor="briefing">Kurzes Briefing</label><textarea id="briefing" value={form.briefing} onChange={event => setForm(current => ({ ...current, briefing: event.target.value }))} placeholder="Wem hilft dieser Beitrag? Was ist die eine klare Aussage?" rows="4" disabled={contentLocked} />
        <label htmlFor="draft">Entwurf</label><textarea id="draft" value={form.draft} onChange={event => setForm(current => ({ ...current, draft: event.target.value }))} placeholder="Entwurf hier festhalten …" rows="10" disabled={contentLocked} />
        {canAssign && <label htmlFor="task-owner">Zuständig</label>}
        {canAssign && <select id="task-owner" className="team-select" value={progress?.assigned_to || ""} onChange={event => onAssign(task.id, event.target.value)} disabled={busy || contentLocked}><option value="">Teammitglied auswählen …</option>{members.map(member => <option value={member.user_id} key={member.user_id}>{member.display_name} · {roleLabel(member.role)}</option>)}</select>}
        {!canAssign && assignedMember && <p className="assignment-copy">Zuständig: <b>{assignedMember.display_name}</b></p>}
        <div className="editor-footer"><p>{contentLocked ? "Der geprüfte Entwurf ist gesperrt. Für Änderungen muss die Freigabe zuerst zurück in den Entwurf gehen." : "Der Entwurf wird zentral gespeichert. Externe Schritte brauchen zusätzlich eine dokumentierte Freigabe."}</p><button className="primary-button" disabled={busy || contentLocked}>{busy ? "Wird gespeichert …" : "Content speichern"}</button></div>
      </form>
      {canRequestApproval && (!activeApproval || canSubmitAgain) && <section className="approval-request-card"><div><p className="eyebrow">EXTERNE MAẞNAHME</p><h2>{approvalExpired ? "Freigabe abgelaufen – neu prüfen." : "Erst prüfen. Dann persönlich im Portal handeln."}</h2><p>{approvalExpired ? "Der frühere Entwurf darf nicht weiterverwendet werden. Prüfe Kontext, Regeln und Mehrwert erneut, bevor du ihn erneut einreichst." : "Wenn alle vier Kriterien klar erfüllt sind, kann ein Reviewer den genauen Entwurf freigeben."}</p></div><div className="approval-criteria">{EXTERNAL_LINK_CHECK.map(item => <label className={criteria[item.id] ? "checked" : ""} key={item.id}><input type="checkbox" checked={Boolean(criteria[item.id])} onChange={event => setCriteria(current => ({ ...current, [item.id]: event.target.checked }))} /><span><b>{item.title}</b>{item.text}</span></label>)}</div><label htmlFor="request-note">Hinweis für den Reviewer</label><textarea id="request-note" value={requestNote} onChange={event => setRequestNote(event.target.value)} placeholder="Welchen konkreten Mehrwert bietet der Entwurf hier?" rows="3" /><button className="primary-button" onClick={() => onSubmitApproval({ task, criteria, requestNote })} disabled={busy || !allCriteriaPassed || !form.draft.trim()}>{busy ? "Wird eingereicht …" : approvalExpired ? "Erneut zur Freigabe senden" : "An Reviewer zur Freigabe senden"}</button><p className="approval-footnote">Der Entwurf muss gespeichert sein und alle vier Kriterien müssen klar „Ja“ sein.</p></section>}
      {activeApproval?.status === "requested" && <section className="approval-state-card requested"><p className="eyebrow">FREIGABE-STATUS</p><h2>Prüfung läuft</h2><p>{activeApproval.decision_note || "Ein Reviewer prüft jetzt Plattform, Kontext und Entwurf. Der Portal-Startlink bleibt bis zur Freigabe gesperrt."}</p></section>}
      {activeApproval?.status === "changes_requested" && <section className="approval-state-card changes_requested"><p className="eyebrow">ÄNDERUNG NÖTIG</p><h2>Der Entwurf ist wieder bearbeitbar.</h2><p>{activeApproval.decision_note || "Überarbeite den Entwurf nach dem Hinweis. Danach prüfst du die vier Kriterien erneut und reichst ihn neu ein."}</p></section>}
      {approvalExpired && <section className="approval-state-card expired"><p className="eyebrow">FREIGABE ABGELAUFEN</p><h2>Bitte Kontext und Entwurf neu prüfen.</h2><p>Der Portal-Startlink bleibt gesperrt. Nach einer erneuten vollständigen Prüfung kannst du eine neue Freigabe anfordern.</p></section>}
      {validApproval && <section className="approval-state-card approved"><p className="eyebrow">FREIGABE BIS {formatDate(activeApproval.expires_at)}</p><h2>Du kannst den freigegebenen Schritt jetzt selbst ausführen.</h2><p>Der Button öffnet <b>{task.platform}</b> in deinem eigenen Browser. Wenn du dort bereits angemeldet bist, bleibt deine persönliche Sitzung erhalten. Das Dashboard speichert keine Portallogins.</p><a href={activeApproval.platform_url || task.url} target="_blank" rel="noreferrer" className="primary-button">{task.platform} in meinem Browser öffnen ↗</a><div className="completion-form"><label htmlFor="publication-url">Öffentliche URL oder Nachweis, falls vorhanden</label><input id="publication-url" value={resultForm.publicationUrl} onChange={event => setResultForm(current => ({ ...current, publicationUrl: event.target.value }))} placeholder="https://…" /><label htmlFor="result-note">Kurzes Ergebnis</label><textarea id="result-note" value={resultForm.resultNote} onChange={event => setResultForm(current => ({ ...current, resultNote: event.target.value }))} placeholder="Was wurde tatsächlich getan?" rows="3" /><button className="quiet-button" onClick={() => onCompleteApproval(activeApproval.id, resultForm.publicationUrl, resultForm.resultNote)} disabled={busy || !resultForm.resultNote.trim()}>Ausführung dokumentieren</button></div></section>}
    </section>
  );
}

function ApprovalReviewCard({ approval, requesterName, task, busy, canDecide, onDecision, onOpenContent }) {
  const [note, setNote] = useState("");
  const isExpired = approval.status === "approved" && approval.expires_at && new Date(approval.expires_at) <= new Date();
  const isDecisionOpen = canDecide && approval.status === "requested";
  const criteria = approval.criteria || {};
  const statusLabel = isExpired ? "Abgelaufen" : approval.status === "approved" ? "Freigegeben" : approval.status === "completed" ? "Dokumentiert" : approval.status === "changes_requested" ? "Änderung nötig" : approval.status === "declined" ? "Abgelehnt" : approval.status === "expired" ? "Abgelaufen" : "Prüfen";

  return <article className={`approval-row ${isExpired ? "expired" : approval.status}`}><div className="approval-row-head"><div><p className="eyebrow">{approval.platform_name || task?.platform || "Externe Maßnahme"}</p><h3>{task?.text || approval.task_id}</h3><p>Von <b>{requesterName}</b> · {formatDate(approval.created_at)}</p></div><span>{statusLabel}</span></div><div className="criteria-summary"><small>Erlaubt: {criteria.allowed ? "Ja" : "Nein"}</small><small>Relevant: {criteria.relevant ? "Ja" : "Nein"}</small><small>Transparent: {criteria.transparent ? "Ja" : "Nein"}</small><small>Mehrwert: {criteria.value ? "Ja" : "Nein"}</small></div>{approval.request_note && <p className="approval-note">{approval.request_note}</p>}{approval.decision_note && <p className="approval-note decision">{approval.decision_note}</p>}<div className="approval-row-actions"><button className="quiet-button" onClick={() => onOpenContent(approval.task_id)}>Entwurf öffnen</button>{isDecisionOpen && <><input value={note} onChange={event => setNote(event.target.value)} placeholder="Kurze Entscheidungsnotiz" /><button className="primary-button" onClick={() => onDecision(approval.id, "approved", note)} disabled={busy}>Freigeben</button><button className="quiet-button" onClick={() => onDecision(approval.id, "changes_requested", note)} disabled={busy}>Änderung anfordern</button></>}</div></article>;
}

function TeamView({ workspace, profile, members, approvals, inviteForm, setInviteForm, busy, onInvite, onDecision, onOpenContent }) {
  const canReview = ["admin", "reviewer"].includes(workspace.role);
  const canInvite = workspace.role === "admin";
  const memberName = userId => members.find(member => member.user_id === userId)?.display_name || "Teammitglied";
  const approvalStillValid = item => item.status === "approved" && item.expires_at && new Date(item.expires_at) > new Date();
  const reviewInbox = approvals.filter(item => item.status === "requested" && item.requested_by !== profile.id);
  const ownOpen = approvals.filter(item => (item.status === "requested" || item.status === "changes_requested" || approvalStillValid(item)) && item.requested_by === profile.id);
  const ownFocus = ownOpen[0];

  return <section className="view-stack"><div className="intro-copy compact"><div className="gradient-pill">TEAM & FREIGABEN</div><h1>Jeder arbeitet mit dem eigenen Konto. Alles bleibt nachvollziehbar.</h1><p>Das Playbook verwaltet keine Passwörter oder IPs. Es führt euch stattdessen sauber von Entwurf über Freigabe bis zur persönlichen Ausführung im eigenen Browser.</p></div>{canReview && reviewInbox.length > 0 && <article className="team-focus-card"><p className="eyebrow">DEINE NÄCHSTE REVIEW-AKTION</p><h2>{reviewInbox.length} Freigabe{reviewInbox.length === 1 ? "" : "n"} wartet auf dich.</h2><p>Prüfe zuerst den konkreten Mehrwert, die Transparenz und die Plattformregeln. Erst danach wird ein Portal-Startlink sichtbar.</p></article>}{ownFocus && <article className="team-focus-card"><p className="eyebrow">DEINE NÄCHSTE TEAM-AKTION</p><h2>{approvalStillValid(ownFocus) ? "Deine Freigabe ist bereit." : ownFocus.status === "changes_requested" ? "Dein Entwurf braucht eine Überarbeitung." : "Dein Entwurf wird geprüft."}</h2><p>{approvalStillValid(ownFocus) ? "Öffne den Entwurf. Dort findest du den persönlichen Portal-Startlink und den Abschlussnachweis." : ownFocus.status === "changes_requested" ? "Öffne den Entwurf, arbeite den Hinweis ein und reiche ihn danach neu ein." : "Du musst gerade nichts nachschieben. Der nächste Schritt liegt beim Reviewer."}</p><button className="quiet-button" onClick={() => onOpenContent(ownFocus.task_id)}>Entwurf öffnen</button></article>}<section className="team-grid">{canInvite && <article className="team-card invite-card"><p className="eyebrow">TEAM ERGÄNZEN</p><h2>Einladung sicher versenden</h2><p>Die eingeladene Person erhält einen Magic Link und arbeitet anschließend mit ihrem eigenen Browser und Account.</p><form onSubmit={onInvite}><label htmlFor="invite-name">Name</label><input id="invite-name" value={inviteForm.displayName} onChange={event => setInviteForm(current => ({ ...current, displayName: event.target.value }))} placeholder="Tobias" required /><label htmlFor="invite-email">E-Mail-Adresse</label><input id="invite-email" type="email" value={inviteForm.email} onChange={event => setInviteForm(current => ({ ...current, email: event.target.value }))} placeholder="tobias@beispiel.de" required /><label htmlFor="invite-role">Rolle</label><select id="invite-role" className="team-select" value={inviteForm.role} onChange={event => setInviteForm(current => ({ ...current, role: event.target.value }))}><option value="member">Mitglied · erstellt und führt aus</option><option value="reviewer">Reviewer · prüft fremde Entwürfe</option></select><button className="primary-button" disabled={busy}>{busy ? "Wird gesendet …" : "Sicheren Link senden"}</button></form></article>}<article className="team-card"><p className="eyebrow">DEIN TEAM</p><h2>{members.length} aktive Personen</h2><div className="member-list">{members.map(member => <div key={member.user_id}><span>{member.display_name.slice(0, 1).toUpperCase()}</span><p><b>{member.display_name}</b><small>{roleLabel(member.role)}</small></p></div>)}</div></article></section>{approvals.length > 0 && <section className="approval-list"><div><p className="eyebrow">FREIGABEVERLAUF</p><h2>Klare Entscheidungen statt versteckter Schritte.</h2></div>{approvals.map(approval => <ApprovalReviewCard key={approval.id} approval={approval} requesterName={memberName(approval.requested_by)} task={taskById(approval.task_id)} busy={busy} canDecide={canReview && approval.requested_by !== profile.id} onDecision={onDecision} onOpenContent={onOpenContent} />)}</section>}{approvals.length === 0 && <section className="team-empty"><p className="eyebrow">NOCH KEINE FREIGABEN</p><h2>Das ist gut: Erst entsteht ein echter Entwurf.</h2><p>Sobald eine externe Maßnahme alle vier Kriterien erfüllt, erscheint sie hier transparent zur Prüfung.</p></section>}</section>;
}


function ProgressView({ activity, profileName, setProfileName, busy, onSaveName, onSignOut, todayDoneCount, totalCount, setupDoneCount, setupTotal }) {
  const dailyPercentage = totalCount ? Math.round((todayDoneCount / totalCount) * 100) : 0;
  const setupPercentage = Math.round((setupDoneCount / setupTotal) * 100);

  return (
    <section className="view-stack"><div className="intro-copy compact"><div className="gradient-pill">ZENTRAL & NACHVOLLZIEHBAR</div><h1>Dein System lernt aus echter Arbeit.</h1><p>Der Tagesbetrieb zeigt deine heutige Bewegung. Das Aufbau-Playbook zeigt, wie weit dein Fundament bereits steht.</p></div><WeeklyReview /><div className="progress-summary"><strong>{dailyPercentage}%</strong><div><h2>{todayDoneCount} von {totalCount} Tagesaktionen erledigt</h2><div className="progress-track"><div style={{ width: `${dailyPercentage}%` }} /></div><p className="secondary-progress">Aufbau-Fundament: {setupDoneCount} von {setupTotal} · {setupPercentage}%</p></div></div><div className="progress-columns"><article className="activity-card"><p className="eyebrow">LETZTE AKTIVITÄTEN</p>{activity.length ? activity.map(item => <div className="activity-row" key={item.id}><span className="activity-dot" /><div><p><b>{item.actor_name}</b> {activityLabel(item.action, item.task_id)}</p><small>{formatDate(item.created_at)}</small></div></div>) : <p className="empty-copy">Dein Aktivitätsverlauf erscheint nach dem ersten gespeicherten Schritt.</p>}</article><article className="profile-card"><p className="eyebrow">DEIN ADMIN-KONTO</p><form onSubmit={onSaveName}><label htmlFor="profile-name">Anzeigename</label><input id="profile-name" value={profileName} onChange={event => setProfileName(event.target.value)} required /><button className="quiet-button" disabled={busy}>Name speichern</button></form><button className="signout-button" onClick={onSignOut} disabled={busy}>Abmelden</button></article></div></section>
  );
}

export default App;
