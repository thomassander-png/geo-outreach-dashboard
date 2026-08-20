# Fahrplan: GEO Outreach Dashboard von 70 % auf 95 % Reifegrad

**Ausgangslage:** Das GEO Playbook ist heute ein zuverlässiges Arbeits- und Compliance-System. Es führt Personen und Teams durch tägliche, dokumentierte GEO-Arbeit, schützt externe Maßnahmen durch die 4-Kriterien-Prüfung und macht Verantwortlichkeiten nachvollziehbar. Die fehlende Stufe ist nicht mehr „mehr Outreach“, sondern **Messbarkeit, Lernfähigkeit und Priorisierung nach nachgewiesener Wirkung**.

> **Zielbild bei 95 %:** Das System verbindet Content, Quellen, Suchnachfrage, Sichtbarkeit, echte externe Erwähnungen und Resultate zu einer nachvollziehbaren Entscheidungskette. Es sagt nicht nur, *was erledigt wurde*, sondern auch, *was nachweislich Wirkung entfaltet hat und was als Nächstes den größten Wert liefert*.

## Zielarchitektur

| Schicht | Aufgabe | Ergebnis für Tommy und das Team |
|---|---|---|
| **Arbeits-Engine** | 10er-Tagesplan, Content, Teamrollen, Freigaben und Kalender. | Eine klare, sichere nächste Handlung ohne visuelles Chaos. |
| **Evidenz-Engine** | Verknüpft Themen, Nutzerfragen, Claims, Quellen, Content-Seiten und Nachweise. | Jeder Content-Schritt ist fachlich begründet und aktualisierbar. |
| **Mess-Engine** | Importiert Such-, Traffic-, Referral- und Conversion-Signale. | Sichtbarkeit wird anhand realer Daten statt Bauchgefühl bewertet. |
| **GEO-Monitoring** | Erfasst definierte Prompt-Sets, Antworten, Quellen- und Markenmentions als validierte Stichprobe. | Das Team erkennt, ob und wo geo-tool.com in relevanten Antwortumfeldern erscheint. |
| **Entscheidungs-Engine** | Verdichtet Wirkung, Aufwand, Risiko und Lernwert zu Empfehlungen. | Die nächste Aufgabe ist nicht nur offen, sondern begründet priorisiert. |
| **Governance-Engine** | Freigaben, Nachweise, Rollen, Red-GEO und Audit-Log. | Das Produkt bleibt seriös, teamfähig und verkaufbar. |

## Reifegradstufen und Priorität

| Stufe | Ziel-Reifegrad | Kernziel | Ergebnis, das vor der nächsten Stufe stehen muss |
|---|---:|---|---|
| **A. Messfundament** | 70 % → 78 % | Einheitliche Baseline und ein belastbares KPI-Modell. | Jeder Workspace hat Domain, Zielgruppe, Geschäftsziel, Kernseiten und Ausgangswerte. |
| **B. Themen- und Evidenzgraph** | 78 % → 84 % | Content wird mit Fragen, Claims und Quellen verbunden. | Für jeden wichtigen Inhalt ist klar: Frage, Quelle, Nachweis, Aktualität und nächste Lücke. |
| **C. GEO-Monitoring** | 84 % → 89 % | Antwort- und Quellenpräsenz wird als validierte Stichprobe gemessen. | Ein Prompt-Set zeigt Veränderung über Zeit, ohne künstliche Präzision vorzutäuschen. |
| **D. Wirkungsbasierte Priorisierung** | 89 % → 92 % | Handlungsempfehlungen folgen echten Signalen. | Das Dashboard kann begründen, warum eine Aktion wichtiger ist als die nächste Alternative. |
| **E. Produktisierung und Skalierung** | 92 % → 95 % | Wiederholbarer Kunden- und Teamprozess. | Neue Kunden können geführt eingerichtet werden; Reports und Reviews sind reproduzierbar. |

## Stufe A – Messfundament

Diese Stufe ist der wichtigste nächste Schritt. Ohne verlässliche Ausgangswerte kann keine spätere GEO-Aussage seriös bewertet werden.

| Baustein | Umsetzung | Akzeptanzkriterium |
|---|---|---|
| **Workspace-Zielbild** | Pro Workspace: Hauptdomain, Zielgruppe, Kernangebot, Conversion-Ziel, Prioritätsländer und Kernseiten hinterlegen. | Jede Tagesaufgabe ist einem Geschäfts- oder Sichtbarkeitsziel zuordenbar. |
| **KPI-Glossar** | Einheitliche Begriffe definieren: organische Impressionen, Klicks, CTR, Position, qualifizierte Sitzungen, Referral-Traffic, Conversion, Erwähnung, Antwortquellen-Share. | Kein Teammitglied verwendet dieselbe Kennzahl mit unterschiedlicher Bedeutung. |
| **Baseline-Snapshot** | 28- und 90-Tage-Ausgangswerte je Kernseite, Thema und Suchanfrage speichern. | Ein späterer Effekt kann gegen einen festen Ausgangswert verglichen werden. |
| **Messquellen** | Zunächst manueller CSV-Import; anschließend read-only Anbindung von Google Search Console und GA4. | Die erste Wirkungstabelle lässt sich ohne Copy/Paste aus mehreren Oberflächen erzeugen. |
| **KPI-Startseite** | Ruhige „Was wirkt gerade?“-Ansicht mit maximal fünf Kernkennzahlen und einer klaren Datenfrische-Anzeige. | Tommy erkennt in unter 30 Sekunden, ob Handlungsbedarf besteht. |

Die Search Console API kann Suchanalysen und bestätigte Properties programmatisch abfragen. Für eine vollständige Zeitreihe empfiehlt Google eine tägliche Abfrage und Paginierung der Ergebnisse. [1] [2] Die GA4 Data API liefert dieselben Reportdaten wie die Analytics-Oberfläche und ist ausdrücklich für eigene Dashboards und automatisierte Berichte vorgesehen. [3]

**Empfohlene erste Lieferung:** Ein Baseline-Wizard mit manuellem CSV-Import, KPI-Glossar und einfacher Messübersicht. Die Google-Anbindungen werden erst nach fachlicher Freigabe und OAuth-Entscheidung ergänzt.

## Stufe B – Themen- und Evidenzgraph

Diese Stufe macht aus Content-Arbeit eine belegbare Wissensarbeit. Nicht jeder Text soll getrackt werden, sondern nur die Inhalte, die für das Kernangebot und die relevanten Nutzerfragen wichtig sind.

| Baustein | Umsetzung | Akzeptanzkriterium |
|---|---|---|
| **Themenkarte** | Pillars → Unterthemen → Nutzerfragen → Kernseiten abbilden. | Für jede Prioritätsfrage gibt es einen sichtbaren Bearbeitungsstand. |
| **Claim- und Quellenregister** | Faktische Behauptungen mit Quelle, Prüfdaten, Verantwortlichem und nächstem Review-Termin speichern. | Veraltete oder unbelegte Aussagen werden automatisch als Lücke sichtbar. |
| **Content-zu-Frage-Zuordnung** | Jeder Entwurf erhält primäre Frage, Suchintention, Zielseite und Nachweisstatus. | Doppelarbeit und Content ohne klare Nachfrage werden reduziert. |
| **Freshness-Review** | Inhalte mit hoher Wirkung erhalten einen zeitgesteuerten Prüfstatus. | Erfolgreiche Kernseiten veralten nicht unbemerkt. |

**Ergebnis:** Der 10er-Tagesplan kann künftig nicht nur „Quelle prüfen“, sondern konkret „Claim X auf Seite Y prüfen, weil die Quelle in 30 Tagen abläuft“ empfehlen.

## Stufe C – GEO-Monitoring als validierte Stichprobe

Die Messung von Antworten in KI-Systemen darf nicht als exakte, vollautomatisch vollständige Wahrheit verkauft werden. Antworten können sich nach Standort, Zeitpunkt, Konto, Modell und Prompt ändern. Das Produkt sollte daher mit einem transparenten **Prompt-Sampling-Modell** beginnen.

| Baustein | Umsetzung | Akzeptanzkriterium |
|---|---|---|
| **Prompt-Bibliothek** | 30–60 priorisierte Fragen mit Zielgruppe, Suchintention, Thema und Sprache speichern. | Jede Messung erfolgt gegen dieselbe definierte Ausgangsliste. |
| **Antwort-Snapshot** | Datum, System, Prompt, Antwort, genannte Domains, Quellen, Markenmention und Prüfperson dokumentieren. | Jede GEO-Aussage ist später nachvollziehbar überprüfbar. |
| **Citation-/Mention-Score** | Quote der geprüften Antworten mit Erwähnung oder Quelle zu geo-tool.com; getrennt nach Thema und System. | Das Team erkennt Trends, nicht nur Einzelbeispiele. |
| **Manueller Start, kontrollierte Automatisierung später** | Zuerst strukturierte menschliche Prüfung; erst danach eine externe Messintegration nach Qualitäts-, Preis- und Richtlinienprüfung. | Keine unzuverlässige Automatisierung bestimmt die Strategie. |
| **Wettbewerbsvergleich** | Nur klar definierte Vergleichsdomains und Themen; keine künstliche „Top-100“-Liste. | Erkenntnisse bleiben handlungsfähig und übersichtlich. |

**Wichtig:** In dieser Stufe wird nichts automatisch veröffentlicht. Das System misst und priorisiert; die existierende Team- und Freigabelogik bleibt für externe Handlungen verbindlich.

## Stufe D – Wirkungsbasierte Priorisierung

Erst wenn Baseline, Evidenz und Monitoring vorliegen, wird der Tagesplan wirklich intelligent. Die Priorisierung braucht keine Black Box, sondern einen erklärbaren Score.

| Signalgruppe | Beispiel | Gewichtung im ersten Modell |
|---|---|---:|
| **Geschäftsrelevanz** | Kernangebot, strategische Zielgruppe, Conversion-Nähe. | 30 % |
| **Sichtbarkeitslücke** | Hohe Impressionen bei schwacher CTR, fehlende Antwortabdeckung, nicht beantwortete Nutzerfrage. | 25 % |
| **Evidenzlücke** | Schwache Quellen, fehlende Nachweise, ablaufende Faktenprüfung. | 20 % |
| **Nachgewiesene Wirkung** | Mehr qualifizierter Traffic, Referral, Conversion oder validierte Mention. | 15 % |
| **Aufwand und Risiko** | Bearbeitungsdauer, Abhängigkeiten, Plattform- und Red-GEO-Risiko. | 10 % |

Die Gewichtungen sind anfangs bewusst **editierbar und erklärbar**. Jede Empfehlung zeigt: „Warum ist diese Aufgabe heute oben?“ Damit bleibt das Tool ADHS-freundlich und vertrauenswürdig.

## Stufe E – Produktisierung und Skalierung

| Baustein | Umsetzung | Nutzen für das verkaufbare Produkt |
|---|---|---|
| **Onboarding-Wizard** | Kundenprofil, Ziele, Domain, Messzugänge, Themen und Verantwortliche geführt erfassen. | Neue Kunden starten ohne Beratungschaos. |
| **Wochenreview** | Automatische Zusammenfassung: Wirkung, offene Lücken, Freigaben, Quelle-Freshness und nächste Woche. | Kunden erhalten eine nachvollziehbare Steuerungsroutine. |
| **Kundenreport** | Exportierbarer Monatsbericht mit Fortschritt, Maßnahmen, Wirkung und klaren Grenzen der Interpretation. | Das Playbook wird beratungs- und verkaufsfähig. |
| **Vorlagen je Kundentyp** | B2B-SaaS, Agentur, lokale Dienstleistung und Wissensprodukt als vorkonfigurierte Themen-/KPI-Sets. | Schnellere Aktivierung bei gleichbleibender Qualität. |
| **Produkt-Grenzen sichtbar machen** | Keine Fake-Profile, keine gekauften Accounts, keine Passwortspeicherung, keine automatisierte Fremdveröffentlichung. | Vertrauen und rechtssichere Positionierung statt kurzfristiger Tricks. |

## Reihenfolge der Umsetzung

| Reihenfolge | Arbeitspaket | Warum zuerst? | Grobe Dauer nach Freigabe |
|---:|---|---|---|
| **1** | Messfundament mit Baseline-Wizard, KPI-Glossar und CSV-Import | Macht alle späteren Entscheidungen messbar. | 1–2 Wochen |
| **2** | Themenkarte, Claim-/Quellenregister und Freshness-Review | Verbessert direkt die Qualität der eigenen Quelle. | 1–2 Wochen |
| **3** | Google Search Console read-only integrieren | Liefert die wichtigste kontinuierliche Suchdatenbasis. | 1–2 Wochen |
| **4** | GA4 read-only integrieren | Verbindet Sichtbarkeit mit qualifiziertem Traffic und Wirkung. | 1 Woche |
| **5** | Prompt-Bibliothek und manuelles GEO-Monitoring | Bringt AI-Answer-Realität ins System, ohne falsche Messpräzision. | 1–2 Wochen |
| **6** | Erklärbarer Priorisierungsscore und intelligente Tagesplan-Reihenfolge | Macht aus Daten konkrete nächste Aufgaben. | 1–2 Wochen |
| **7** | Wochenreview, Kundenreport und Onboarding-Templates | Produktisiert die bewiesene Arbeitsweise. | 2–3 Wochen |

Die Dauern sind bewusst als **Arbeitsblöcke**, nicht als Garantie, formuliert. OAuth-Freigaben, Datenqualität und die Anzahl bestehender Kernseiten beeinflussen die tatsächliche Dauer.

## Entscheidungen vor Stufe A

| Entscheidung | Empfehlung |
|---|---|
| **Erster Messscope** | Ausschließlich `geo-tool.com`, Deutschland, ein klarer Kernmarkt und 10–20 Kernseiten. |
| **Primäres Ziel** | Zuerst qualifizierte organische Sichtbarkeit und nutzbare Content-Lücken; nicht reine Erwähnungsmenge. |
| **Datenstart** | CSV-Baseline sofort, danach read-only Google-Anbindungen. |
| **GEO-Monitoring** | Erst strukturierte manuelle Stichprobe; erst später eine kostenpflichtige oder externe Automation bewerten. |
| **Teamstart** | Tommy als Admin, Tobias als Mitglied; eine zweite prüfende Person nur für echte externe Maßnahmen ergänzen. |
| **Definition von 95 %** | Ein System mit verlässlichem Workflow, Messung, Lernschleife, Kundenfähigkeit und nachvollziehbaren Grenzen – nicht eine Garantie für Rankings oder KI-Zitate. |

## Der beste erste nächste Schritt

> **Stufe A starten: Baseline-Wizard und KPI-Glossar für geo-tool.com.**

Das ist der kürzeste Weg von „wir arbeiten sinnvoll“ zu „wir können beweisen, welche Arbeit Wirkung zeigt“. Danach entscheidet nicht mehr die Menge der erledigten Aufgaben über Priorität, sondern die Kombination aus Geschäftsziel, Sichtbarkeitslücke, Evidenzqualität und messbarer Wirkung.

## Quellen

[1]: https://developers.google.com/webmaster-tools "Google Search Console API"
[2]: https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data "Google Search Console API – Performance-Daten abrufen"
[3]: https://developers.google.com/analytics/devguides/reporting/data/v1 "Google Analytics Data API – Übersicht"
