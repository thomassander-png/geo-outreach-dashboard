# GEO Outreach Playbook

Das **GEO Outreach Playbook** ist das ergänzende Handbuch zum GEO Tool. Es führt Teams durch einen klaren GEO-Sichtbarkeitsprozess, hält Content und Nachweise fest und speichert Fortschritt zentral statt nur in einem Browser.

> Das System führt nicht zu Link-Spam. Es priorisiert hilfreiche Inhalte, echte Nachweise, kontextgerechte Beteiligung und eine nachvollziehbare Prüfung externer Erwähnungen.

## Aktueller Funktionsumfang: 10er-Tagesplan

Die vorhandenen **48 Aufbauaufgaben** in `src/data/tasks.js` bleiben vollständig erhalten. Sie bilden das einmalige Fundament. Zusätzlich erzeugt das Playbook pro Arbeitstag eine eigene, zentral gespeicherte Warteschlange aus **zehn wiederkehrenden GEO-Aktionen**.

| Bereich | Funktion |
|---|---|
| **Heute** | Genau eine nächste Aktion ist sichtbar. Nach Abschluss rückt die nächste aus dem 10er-Tagesplan nach. |
| **Autorität** | Themenautorität, Nachweise, Erwähnungen und Messung als klarer GEO-Rahmen sowie die ursprünglichen Aufbauaufgaben. |
| **Sichtbarkeit** | Ampelprüfung: Grün für direkte Arbeit, Gelb für kontextabhängige externe Chancen, Rot für Spam, verdeckte Werbung und Manipulation. |
| **Kalender** | Tagesziel, erledigte und verschobene Aktionen sowie Zeitstempel bleiben teamweit nachvollziehbar gespeichert. |
| **Content** | Briefing, Entwurf und Status `Idee → Entwurf → Freigabe → Erledigt` pro Aufbauaufgabe. |
| **Fortschritt** | Tagesfortschritt, Fundament-Fortschritt und zentraler Aktivitätsverlauf. |

Die zehn täglichen Aktionen liegen als Produktbibliothek in [`src/data/dailyActions.js`](./src/data/dailyActions.js). Sie können später erweitert werden, ohne bestehende Task-IDs zu verändern oder zu löschen.

## Einmalige zentrale Einrichtung

Für die dauerhafte Speicherung wird ein eigenes Supabase-Projekt benötigt.

1. Führe in einem neuen Projekt zuerst den vollständigen Inhalt von [`supabase/schema.sql`](./supabase/schema.sql) im **SQL Editor** aus.
2. Führe anschließend jede Datei in [`supabase/migrations`](./supabase/migrations) in alphabetischer Reihenfolge aus. Für das 10er-System ist das aktuell [`20260820_daily_playbook.sql`](./supabase/migrations/20260820_daily_playbook.sql).
3. Aktiviere die Anmeldung per E-Mail-Link und hinterlege die produktive Playbook-URL als Site-URL sowie als erlaubte Weiterleitung.
4. Lege die beiden öffentlichen Verbindungswerte lokal und in der Deployment-Umgebung an.

```bash
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_OEFFENTLICHER_ANON_KEY
```

> Der **Service-Role-Key** gehört niemals in dieses Frontend, in Git oder in den Browser. Die Datenbankregeln begrenzen den Zugriff auf den eigenen Arbeitsbereich.

Nach dem Deployment öffnest du das Playbook, forderst über deine E-Mail-Adresse einen Anmeldelink an und legst beim ersten Start den Arbeitsbereich **„GEO Outreach Playbook“** sowie den Admin-Namen **„Tommy“** an.

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

## Spätere Stufen

Die aktuelle Stufe enthält bewusst keine Mitarbeitereinladungen, Zahlungsabwicklung, KI-Textgenerierung oder automatisches Veröffentlichen auf externen Plattformen. Diese Erweiterungen werden erst nach einer separaten Freigabe ergänzt.
