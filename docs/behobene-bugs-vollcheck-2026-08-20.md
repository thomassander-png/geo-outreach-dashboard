# Behobene Bugs – Dashboard-Vollcheck

**Stand:** 20. August 2026  
**Release:** `8f71fc9 – Fix: Stabilität und Freigabeabläufe härten`

| Bereich | Behobener Fehler | Korrektur |
|---|---|---|
| Gelbe Tagesaktionen | Aktionen mit externer Relevanz konnten trotz offener 4-Kriterien-Prüfung als erledigt markiert werden. | Der Erledigt-Button bleibt gesperrt, bis **Erlaubt, Relevant, Transparent** und **Mehrwert** bestätigt sind. |
| Abgelaufene Freigaben | Eine abgelaufene Freigabe konnte den Entwurf blockieren. | Sie wird klar als abgelaufen markiert; eine erneute vollständige Prüfung und Einreichung ist möglich. |
| Änderungswünsche | Ein bereits abgeschlossener Änderungswunsch konnte nochmals entschieden werden. | Nur Anfragen mit Status **angefordert** können entschieden werden. Nach Änderungen ist eine neue Einreichung notwendig. |
| Teamrollen | Reviewer und Mitglieder erhielten teils irreführende Freigabeaktionen oder sahen die Teamübersicht nicht vollständig. | Rollenabhängige Anzeige vereinheitlicht; Freigaben nur für berechtigte Personen und fremde Einreichungen. |
| Aufgaben-Zuweisung | Zugewiesene Aufgaben waren serverseitig nicht vollständig gegen direkte Umgehung geschützt. | RLS-Regeln und Spaltenrechte schützen Zuweisungen auch außerhalb der Oberfläche. |
| Historie | Bei sehr vielen gespeicherten Tagesaktionen konnte der Verlauf unvollständig werden. | Paginierte Abfragen laden Tagesaktionen, Content und Freigaben vollständig nach. |
| Aktivitätslog | Das Erzeugen eines Tagesplans wurde intern als „wieder geöffnet“ protokolliert. | Neuer eindeutiger Log-Eintrag: **Tagesplan angelegt**. |
| Datenbankleistung | Mehrere Fremdschlüssel für Team-, Freigabe- und Aktivitätsdaten hatten keine abdeckenden Indizes. | Passende Indizes ergänzt. |
| Datenbankzugriff | Interne Trigger- und Hilfsfunktionen waren unnötig für angemeldete Nutzer ausführbar. | Öffentliche Ausführung entzogen; nur notwendige rollenprüfende Funktionen bleiben erreichbar. |

## Qualitätssicherung

`npm run lint` und `npm run build` wurden erfolgreich ausgeführt. Der Live-Build wurde verifiziert, die Datenbankmigrationen sind registriert, und keine bestehenden Task-IDs wurden geändert oder gelöscht.
