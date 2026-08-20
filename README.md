# GEO Playbook

Das **GEO Playbook** ist der tägliche Umsetzungsplan nach dem GEO Tool. Es führt Teams durch Quellenarbeit, Content, Aufbauaufgaben und nur bei passendem Anlass durch regelkonforme externe Sichtbarkeit. Fortschritt wird zentral statt nur in einem Browser gespeichert.

> Das System führt nicht zu Link-Spam. Es priorisiert hilfreiche Inhalte, echte Nachweise, kontextgerechte Beteiligung und eine nachvollziehbare Prüfung externer Erwähnungen.

## Aktueller Funktionsumfang: 10er-Tagesplan

Die vorhandenen **48 Task-IDs** in `src/data/tasks.js` bleiben vollständig erhalten. Sie bilden das einmalige Fundament einschließlich sichtbarer **Red-GEO-Warnhinweise** für frühere riskante Aufgaben. Nur regelkonforme Aufgaben zählen zum Fortschritt oder können erledigt werden. Zusätzlich erzeugt das Playbook pro Arbeitstag eine eigene, zentral gespeicherte Warteschlange aus **zehn wiederkehrenden GEO-Aktionen**.

| Bereich | Funktion |
|---|---|
| **Heute** | Genau eine nächste Aktion ist sichtbar. Nach Abschluss rückt die nächste aus dem 10er-Tagesplan nach. |
| **Playbook** | Die ursprünglichen Aufbauaufgaben, Plattformen und die Ampelprüfung für sichere Outreach-Schritte. |
| **Content** | Briefing und Entwurf mit Status `Idee → Entwurf → Prüfung läuft → Freigegeben → Erledigt`. |
| **Team** | Einladungen, Rollen, Zuständigkeiten, Vier-Augen-Freigaben und persönlicher Portalstart nach Freigabe. |
| **Fortschritt** | Tagesfortschritt, Kalenderverlauf, Fundament-Fortschritt und zentraler Aktivitätsverlauf. |

Die zehn täglichen Aktionen liegen als Produktbibliothek in [`src/data/dailyActions.js`](./src/data/dailyActions.js). Sie enthalten bewusst keine Kommentar-, Link-, Kontakt- oder Bewertungsquoten. Externe Chancen werden nur gelb zur Prüfung gezeigt; Quellenarbeit, Nachweise und Messung bleiben der Kern. Plattformkontingente wie maximal eine kostenlose openPR-Meldung pro Monat sind direkt bei den betreffenden Aufgaben hinterlegt. Die Bibliothek kann später erweitert werden, ohne bestehende Task-IDs zu verändern oder zu löschen.

## Einmalige zentrale Einrichtung

Für die dauerhafte Speicherung wird ein eigenes Supabase-Projekt benötigt.

1. Führe in einem neuen Projekt den vollständigen Inhalt von [`supabase/schema.sql`](./supabase/schema.sql) im **SQL Editor** aus.
2. Aktiviere die Anmeldung per E-Mail-Link und hinterlege die produktive Playbook-URL als Site-URL sowie als erlaubte Weiterleitung.
3. Lege die beiden öffentlichen Verbindungswerte lokal und in der Deployment-Umgebung an.

Der 10er-Tagesplan verwendet bewusst die bereits abgesicherte Tabelle `task_progress` mit einem getrennten internen Tagesplan-Namensraum. Dafür ist keine zusätzliche Datenbankmigration notwendig.

```bash
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_OEFFENTLICHER_ANON_KEY
```

> Der **Service-Role-Key** gehört niemals in dieses Frontend, in Git oder in den Browser. Die Datenbankregeln begrenzen den Zugriff auf den eigenen Arbeitsbereich.

Nach dem Deployment öffnest du das Playbook, forderst über deine E-Mail-Adresse einen Anmeldelink an und legst beim ersten Start den Arbeitsbereich **„GEO Playbook“** sowie den Admin-Namen **„Tommy“** an.

## Lokale Entwicklung

```bash
npm ci
npm run dev
```

Die Qualitätsprüfungen lauten:

```bash
npm run lint
npm run build
```

## Team- und Freigabelogik

Jede Person arbeitet mit dem **eigenen GEO-Playbook-Konto**, dem eigenen Rechner und dem eigenen Browser. Das Playbook speichert **keine Passwörter, Cookies, IP-Adressen oder Zugangstokens** von Drittplattformen. Nach einer dokumentierten Freigabe öffnet der Portal-Button die jeweilige Plattform in einem neuen Tab. Eine bestehende persönliche Browser-Sitzung bleibt dabei beim jeweiligen Nutzer erhalten.

Die Rollen sind bewusst klar getrennt: `Admin` kann Teammitglieder einladen und Aufgaben zuweisen; `Reviewer` und `Admin` dürfen fremde Einreichungen prüfen; `Mitglied` erstellt Entwürfe und dokumentiert die manuelle Ausführung. Eigene externe Maßnahmen können nicht selbst freigegeben werden. Die vier Kriterien **Erlaubt, Relevant, Transparent und Mehrwert** müssen vor einer Freigabe vollständig bestätigt sein.

Für ein **bestehendes** Supabase-Projekt werden die versionierten SQL-Dateien unter [`supabase/migrations`](./supabase/migrations) in Reihenfolge angewendet. Bei einem **neuen** Projekt reicht weiterhin die vollständige Datei [`supabase/schema.sql`](./supabase/schema.sql).

## Spätere Stufen

Die aktuelle Stufe enthält bewusst keine Zahlungsabwicklung, KI-Textgenerierung oder automatisches Veröffentlichen auf externen Plattformen. Diese Erweiterungen werden erst nach einer separaten Freigabe ergänzt.
