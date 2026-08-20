# GEO Outreach Playbook

Das **GEO Outreach Playbook** ist das ergänzende Handbuch zum GEO Tool. Es führt Teams durch konkrete Outreach-Schritte, hält Content-Entwürfe fest und speichert Fortschritt zentral statt nur in einem Browser.

## Stufe 1: enthaltene Funktionen

Die Anwendung bietet einen fokussierten Tagesmodus, ein Playbook mit allen bestehenden Aufgaben, einen Content-Workflow und einen zentralen Aktivitätsverlauf. Der Fortschritt wird pro Arbeitsbereich gespeichert. Die vorhandenen Task-IDs in `src/data/tasks.js` bleiben die stabile Grundlage für den Status jeder Aufgabe.

| Bereich | Funktion |
|---|---|
| **Tommy-Admin** | Sichere Anmeldung per E-Mail-Link und einmaliger Start des ersten Arbeitsbereichs. |
| **Heute** | Eine dominante nächste Aufgabe mit prominentem Plattform-Link und Abschlussaktion. |
| **Playbook** | Alle Plattformaufgaben in einer klaren, geführten Übersicht. |
| **Content** | Briefing, Entwurf und Status `Idee → Entwurf → Freigabe → Erledigt` pro Aufgabe. |
| **Fortschritt** | Zentraler Aufgabenstatus, Zeitstempel und Aktivitätsverlauf. |

## Einmalige zentrale Einrichtung

Für die dauerhafte Speicherung wird ein eigenes Supabase-Projekt benötigt. Öffne dort den **SQL Editor**, führe den vollständigen Inhalt von [`supabase/schema.sql`](./supabase/schema.sql) aus und aktiviere anschließend die Anmeldung per E-Mail-Link.

Lege in der lokalen Datei `.env.local` sowie in der Deployment-Umgebung diese beiden **öffentlichen** Variablen an. Die Datei `.env.local` darf nicht versioniert werden.

```bash
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_OEFFENTLICHER_ANON_KEY
```

> Der **Service-Role-Key** gehört niemals in dieses Frontend, in Git oder in den Browser. Die Datenbankregeln in `schema.sql` sorgen dafür, dass angemeldete Mitglieder nur ihren eigenen Arbeitsbereich lesen und bearbeiten können.

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

Stufe 1 enthält bewusst keine Mitarbeitereinladungen, Zahlungsabwicklung, KI-Textgenerierung oder automatisches Veröffentlichen auf externen Plattformen. Diese Erweiterungen werden erst nach einer separaten Freigabe ergänzt.
