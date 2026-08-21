# Konzept: Vollautomatisiertes GEO-Reporting

**Ziel:** Das GEO Playbook wird vom täglichen Arbeitsassistenten zu einem Reportingprodukt, das für jede Website verständlich zeigt: Was wurde getan, was hat sich messbar entwickelt, was bedeutet das und welche nächste Entscheidung folgt daraus?

> Ein hochwertiger Report darf nicht nur Kennzahlen auflisten. Er verbindet **Maßnahme → beobachtete Entwicklung → Bedeutung → nächste Priorität** und macht Datenfrische sowie Interpretationsgrenzen sichtbar.

## 1. Das Reportingprodukt

| Ausgabe | Empfänger | Rhythmus | Inhalt |
|---|---|---|---|
| **Live-Entscheidungsansicht** | Tommy, Team und interne Verantwortliche | täglich aktualisiert | Maximal fünf Kernsignale, Datenfrische, wichtigste Lücke und eine klare nächste Aufgabe. |
| **Wochenreview** | Team oder betreuter Kunde | wöchentlich | Erledigte Maßnahmen, Wirkungshinweise, Content-/Quellenlücken, offene Freigaben und Plan für die kommende Woche. |
| **Management-Report** | Entscheider beim Kunden | monatlich | Hochwertiger PDF-/Webreport: Ziel, Entwicklung, Top-Maßnahmen, Wirkung, Risiken, nächste Monatsprioritäten und klare Grenzen der Interpretation. |
| **Ausnahmehinweis** | Zuständige Person | bei Bedarf | Zum Beispiel: Daten nicht aktuell, Kernseite verliert Sichtbarkeit, Quelle läuft ab oder eine Conversion entwickelt sich auffällig. |

Die tägliche Ansicht bleibt ADHS-fokussiert. Sie beantwortet nur: **Was ist jetzt wichtig?** Der Monatsreport darf tiefer gehen, weil er eine Entscheidungsunterlage für Kunden und Management ist.

## 2. Einheitliche Datenkette

| Datenquelle | Automatisch erfasste Signale | Nutzen im Report |
|---|---|---|
| **Google Search Console** | Impressionen, Klicks, CTR, Positionen, Suchanfragen und Zielseiten | Zeigt, ob Kernseiten in Google sichtbar werden und wo Nachfrage noch nicht gut beantwortet wird. Die Search Console API erlaubt den programmgesteuerten Abruf von Suchanalysen und Properties.[2] |
| **GA4** | Sitzungen, Zielseiten, Traffic-Quellen, Referral-Traffic und definierte Conversions | Zeigt, ob Sichtbarkeit zu qualifizierter Nutzung und Geschäftswirkung führt. Die Data API kann dieselben Reportdaten wie die GA4-Oberfläche für Dashboards und automatisierte Berichte liefern.[1] |
| **GEO Playbook** | Tagesaktionen, Content-Status, Claims, Quellen, Freigaben, externe Nachweise | Verbindet Daten mit der tatsächlichen Arbeit des Teams. |
| **GEO-Monitoring** | Priorisierte Prompts, geprüfte Antwort-Snapshots, Markenmentionen und Domain-Zitationen | Zeigt Trends in einem transparenten Stichprobenmodell; keine falsche Garantie auf KI-Sichtbarkeit. |

Jede Kennzahl benötigt eine einheitliche Definition, einen Zeitraum, eine Datenquelle und eine sichtbare Aktualität. Das verhindert, dass verschiedene Mitarbeiter dieselbe Metrik unterschiedlich interpretieren.

## 3. Was der Kunde wirklich sieht

Ein monatlicher Kundenreport enthält nicht eine lange Tabelle, sondern eine klare Managementgeschichte:

| Abschnitt | Beispielhafte Frage | Antwort des Reports |
|---|---|---|
| **Ziel** | Wofür optimieren wir? | „Mehr qualifizierte Sichtbarkeit für die drei Kernangebote.“ |
| **Entwicklung** | Was hat sich gegenüber dem Vormonat verändert? | Sichtbarkeits-, Traffic-, Referral- und Conversion-Entwicklung mit 28-/90-Tage-Kontext. |
| **Wirkungshinweise** | Welche Arbeit scheint zu helfen? | Verbesserte Kernseiten, gepflegte Quellen und dokumentierte Maßnahmen mit beobachteter Entwicklung danach. |
| **Lücken & Risiken** | Was bremst uns? | Fehlende Antworten, veraltete Nachweise, schwache CTR, offene Freigaben oder fehlende Daten. |
| **Nächster Monat** | Was tun wir jetzt? | Drei priorisierte Maßnahmen, Verantwortliche und erwartete Wirkung. |
| **Transparenz** | Was wissen wir nicht sicher? | Datenfrische, externe Einflüsse und der Hinweis, dass SEO-/GEO-Wirkung nicht monokausal bewiesen wird. |

## 4. Automatisierung: drei tragfähige Betriebsmodelle

| Ansatz | Ergebnis für den Kunden | Abwägung | Laufende Kosten | Einrichtungsaufwand |
|---|---|---|---|---|
| **A. Eigene Reporting-Engine im GEO Playbook** | Vollständig gebrandete Kundenansicht, automatisch generierte Reviews und Reports, direkte Verknüpfung mit Maßnahmen, Evidenz und Freigaben. | Höchster Produktwert und stärkste Differenzierung; benötigt sichere Hintergrundimporte und einen Versanddienst. | Niedrig bis mittel, abhängig von E-Mail- und optionaler KI-Zusammenfassung. | Höher, aber wiederverwendbar pro Kunde. |
| **B. Google-basierter Visualisierungsreport** | Dashboard und automatische PDF-Zustellung über eine Google-Reportansicht. | Schnell und visuell stark, aber schwächer mit eurem Aufgaben-, Evidenz- und Freigabefluss verknüpft. Automatische PDF-Auslieferung ist vorgesehen.[3] | Niedrig bis mittel; erweiterte Funktionen können eine Pro-Lizenz erfordern. | Niedrig. |
| **C. Hybridmodell** | GEO Playbook als Arbeits- und Entscheidungszentrale; separate Google-Ansicht für visuelle Monatskennzahlen. | Schneller Start, aber zwei Oberflächen. Gute Übergangslösung, bevor A vollständig produktisiert ist. | Niedrig bis mittel. | Mittel. |

Die Entscheidung hängt vor allem davon ab, ob ihr als Agentur eine **eigene, differenzierende Reportinglösung** verkaufen möchtet oder zunächst möglichst schnell visuelle Kundenreports ausliefern wollt.

## 5. Empfohlener Funktionsumfang einer eigenen Reporting-Engine

| Modul | Automatischer Ablauf | Sichtbarer Mehrwert |
|---|---|---|
| **Datenimport** | Täglicher read-only Abruf der freigegebenen Search-Console- und GA4-Daten. | Keine manuelle Excel-Zusammenführung. |
| **Datenqualitätsprüfung** | Kennzeichnet fehlende Zugänge, verspätete Daten, unvollständige Zeiträume und Importfehler. | Keine scheinbar präzisen, aber fehlerhaften Reports. |
| **Wirkungslogik** | Vergleicht Maßnahmen, Zielseiten und 28-/90-Tage-Entwicklung. | Nicht nur „mehr Klicks“, sondern „welche Arbeit könnte dazu beigetragen haben?“. |
| **Reportgenerator** | Erstellt einen kundenindividuellen Webreport und eine druckfähige Monatsfassung. | Einheitlicher Premiumauftritt statt manuell gebauter PowerPoint- oder Excel-Reports. |
| **Narrative Zusammenfassung** | Formuliert aus geprüften Kennzahlen eine kurze Managementzusammenfassung mit Grenzen und Empfehlungen. | Kunden verstehen die Konsequenz statt nur Diagramme zu sehen. |
| **Versand & Archiv** | Zustellung nach freigegebenem Rhythmus; jede Fassung wird im Kundenarbeitsbereich archiviert. | Nachvollziehbarkeit und wiederkehrender Kundennutzen. |

Eine automatisierte Zusammenfassung sollte niemals rohe Daten erfinden. Sie darf nur aus verifizierten Kennzahlen und dokumentierten Maßnahmen formulieren; bei unvollständiger Datenbasis muss sie stattdessen eine klare Datenlücke melden.

## 6. Umsetzung in sinnvollen Stufen

| Stufe | Lieferung | Abnahmekriterium |
|---|---|---|
| **1. Datenzugang** | Morgen: read-only Freigabe von Search Console und GA4 für `geo-tool.com`. | Erste echte Kennzahlen erscheinen mit Datenfrische. |
| **2. Reportingmodell** | KPI-Glossar, Zeitraumlogik, Kernseiten, Ziele und Conversion-Definitionen pro Workspace. | Jede Zahl im Report hat eine eindeutige Bedeutung. |
| **3. Automatischer Wochenreview** | Automatisierte Innenansicht mit Entwicklung, Maßnahmen und offenen Lücken. | Das Team kann den Wochenreview ohne Tabellenarbeit führen. |
| **4. Premium-Monatsreport** | Kundenfähige Web-/PDF-Fassung, individuelle Branding- und Zielkonfiguration. | Ein Kunde versteht in wenigen Minuten Entwicklung, Wirkung und nächste Priorität. |
| **5. Kunden-Templates** | Standardisierte Vorlagen für Agentur, B2B-SaaS, lokale Dienstleister und Wissensprodukte. | Neue Kunden werden ohne Neubau eingerichtet. |
| **6. Versand und Ausnahmehinweise** | Geplanter Versand, Archivierung und Warnungen bei klaren Daten-/Leistungslücken. | Reporting läuft ohne manuelle Monatszusammenstellung. |

## 7. Produkt- und Vertrauensprinzipien

Der Kunde behält Kontrolle über seine Zugänge. Für Website-Daten genügen read-only Rechte auf Search Console und GA4. Für Drittplattformen nutzt der Kunde oder sein Team eigene Konten und Geräte; das GEO Playbook speichert weder Passwörter noch Browser-Cookies. Der Report dokumentiert nur freigegebene, nachweisbare Arbeit und ihre Messsignale.

Damit wird das Reporting zu einem hochwertigen Kundenprodukt: **transparent, nachvollziehbar, messbar und ohne Black-Box-Versprechen.**

## Quellen

[1]: [Google Analytics Data API overview](https://developers.google.com/analytics/devguides/reporting/data/v1)
[2]: [Google Search Console API](https://developers.google.com/webmaster-tools)
[3]: [Google Data Studio: Schedule automatic report delivery](https://docs.cloud.google.com/data-studio/schedule-automatic-report-delivery)

## Technische Betriebsgrundlage für die eigene Reporting-Engine

Die produktive automatische Variante läuft vollständig serverseitig: Ein geplanter Hintergrundjob ruft eine geschützte Serverfunktion auf, diese importiert ausschließlich die freigegebenen Search-Console- und GA4-Daten, schreibt Importlauf und Datenfrische mit und erzeugt aus geprüften Zeitreihen die Reportgrundlage. Supabase dokumentiert hierfür die Kombination aus `pg_cron`, `pg_net`, Edge Functions und Vault; Geheimnisse gehören in Vault beziehungsweise die Serverkonfiguration, nicht in das Browser-Frontend.[4] Der Hintergrundaufruf muss als service-to-service-Aufruf mit einer benannten geheimen Berechtigung erfolgen, während Dashboardnutzer nur rollenbeschränkte Ansichten und manuelle Administrationsaktionen erhalten.[5] Cron-Jobs und ihre Läufe sind serverseitig nachvollziehbar protokollierbar.[6]

[4]: [Supabase: Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
[5]: [Supabase: Securing Edge Functions](https://supabase.com/docs/guides/functions/auth)
[6]: [Supabase: Cron](https://supabase.com/docs/guides/cron)
