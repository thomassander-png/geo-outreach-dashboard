# Implementierungsplan: Eigener GEO-Premiumreport

**Produktziel:** Der GEO-Premiumreport wird ein eigener, kundenfähiger Bestandteil des GEO Playbooks. Er verbindet automatisiert eingelesene Sichtbarkeits- und Wirkungsdaten mit der dokumentierten GEO-Arbeit des Teams. Der Report beantwortet für Entscheider verständlich: **Was wurde getan? Was hat sich entwickelt? Was bedeutet das? Was ist als Nächstes wichtig?**

## 1. Zielbild und Abgrenzung

Der Premiumreport ist kein isoliertes SEO-Dashboard. Er nutzt die bereits vorhandene Arbeits-Engine, Evidenzdaten, Teamfreigaben, Search-Console-/GA4-Zeitreihen und GEO-Monitoring. Er erzeugt daraus eine klare, prüfbare Managementansicht.

> Ein Report zeigt Wirkungshinweise, keine erfundene Kausalität. Zu jeder Aussage gehören Zeitraum, Datenfrische, Quelle und die dokumentierte Maßnahme, auf die sie sich bezieht.

| Ebene | Nutzer | Ergebnis |
|---|---|---|
| **Live-Entscheidung** | Team | Maximal fünf Kennzahlen, wichtigste Lücke und nächste Aufgabe. |
| **Wochenreview** | Team und Account Lead | Maßnahmen, Lernsignale, Risiken, offene Freigaben und Wochenplan. |
| **Monatsreport** | Kunde und Management | Ziele, Fortschritt, Wirkungshinweise, klare Grenzen und drei Monatsprioritäten. |
| **Reportarchiv** | Kunde und Agentur | Unveränderbare, nach Zeitraum versionierte Fassungen mit Versand- und Freigabestatus. |

## 2. Wiederverwendbare bestehende Grundlage

| Bereits vorhanden | Wird im Premiumreport genutzt |
|---|---|
| `intelligence_profiles` | Domain, Markt, Zielgruppe, Geschäfts- und Conversion-Ziel. |
| `metric_snapshots` | Zeitreihen aus manuellen Daten, CSV, Search Console und GA4. |
| Themen, Nutzerfragen, Claims und Quellen | Fachliche Erklärung, warum eine Maßnahme priorisiert ist. |
| `google_integrations` und `google_import_runs` | Verbindungsstatus, Datenfrische und technische Importnachweise. |
| Content-, Tages- und Teamaktivität | Nachweis, welche Maßnahmen tatsächlich durchgeführt wurden. |
| Teamrollen und Freigaben | Verantwortlichkeit und Kundenvertrauen. |

Die Reportingstufe ergänzt nur fehlende Reportingstrukturen; sie dupliziert keine vorhandenen Metriken, Aufgaben oder Evidence-Daten.

## 3. Ergänzendes Reporting-Datenmodell

| Neue Struktur | Zweck | Wichtige Schutzregel |
|---|---|---|
| `reporting_profiles` | Branding, Berichtssprache, Zeitzone, Zieldefinition, Status und Freigabemodus je Workspace. | Nur Admins ändern Reportkonfiguration. |
| `report_recipients` | Empfänger, Rolle, Zustellkanal und Einwilligungsstatus. | Nur Admins pflegen; keine personenbezogenen Nutzungsdaten im Report. |
| `report_runs` | Typ, Zeitraum, Datenfrische, Erstellungs- und Freigabestatus, Version. | Nach Versand nicht überschreibbar; Korrektur erzeugt eine neue Version. |
| `report_insights` | Geprüfte Kennzahlen-Aussagen, Ursache, Grenze und nächste Empfehlung. | Automatische Aussagen müssen auf gespeicherte Kennzahlen/Maßnahmen verweisen. |
| `report_artifacts` | Kunden-Webansicht, PDF-Referenz und optionaler Speicherort. | Zugriff nur für berechtigte Workspace-Mitglieder und freigegebene Empfänger. |
| `report_delivery_runs` | Versandzeitpunkt, Ergebnis, Fehler und Empfängergruppe. | E-Mail-Adressen niemals im Clientlog ausgeben. |

## 4. Sichere Automatisierung

| Lauf | Rhythmus | Aufgabe | Schutz |
|---|---|---|---|
| **GSC-Import** | Täglich nach Datenverfügbarkeit | Search-Performance nach Zielseite, Suchanfrage, Land und Gerät abrufen. | Read-only OAuth, Tokens nur serverseitig, Importlauf protokollieren. |
| **GA4-Import** | Täglich | Sitzungen, relevante Zielseiten, Quellen, Referral und definierte Conversions abrufen. | Read-only OAuth, Property-ID je Workspace, Datenfrische anzeigen. |
| **Datenqualitätslauf** | Nach jedem Import | Lücken, Doppelungen, fehlende Zeiträume und ungewöhnliche Werte markieren. | Keine automatische Korrektur still im Hintergrund. |
| **Wochenreview** | Wöchentlich | Geprüfte Kennzahlen, Maßnahmen und offene Lücken zu einer Teamansicht verdichten. | Bei unvollständigen Daten: Lücke statt Erkenntnis anzeigen. |
| **Monatsreport** | Monatlich nach definiertem Stichtag | Versionierte Reportdaten erzeugen, Freigabe vorbereiten und erst danach zustellen. | Versand erst nach Freigaberegel; Versionen bleiben archiviert. |
| **Ausnahmehinweis** | Ereignisbasiert | Bei Importfehlern, fehlender Datenfrische oder priorisierten Lücken warnen. | Nur relevante, priorisierte Hinweise; kein Benachrichtigungslärm. |

Die Hintergrundläufe werden über serverseitig geschützte Funktionen ausgelöst. Geheimnisse und OAuth-Tokens liegen ausschließlich in Vault-/Serverkonfiguration. Dashboardnutzer erhalten nur rollenbeschränkte Ansichten, nie Schlüssel oder Tokens.

## 5. Der sichtbare Premiumreport

Der Report erhält eine ruhige, hochwertige Kundenansicht mit viel Weißraum, prägnanten Kernaussagen und maximal wenigen, gut erklärten Diagrammen. Der Kunde muss nicht durch Daten scrollen, sondern erkennt zuerst die Entwicklung und die Konsequenz.

| Abschnitt | Inhalt | Beispiel |
|---|---|---|
| **Titelkarte** | Domain, Zeitraum, Ziel und Datenfrische. | „GEO-Wirkungsreport · geo-tool.com · August 2026 · Daten bis 29.08.“ |
| **Executive Summary** | Drei klare Aussagen in Alltagssprache. | „Sichtbarkeit der Kernseiten steigt; Conversion-Signal auf Seite X stabil; Evidenzlücke bei Thema Y offen.“ |
| **Wirkung** | Zielmetriken im Vergleich mit erklärtem Zeitraum. | Klicks, qualifizierte Sitzungen, Referral und Conversions. |
| **Getane Arbeit** | Dokumentierte Content-, Quellen- und Teammaßnahmen. | „3 Kernseiten überarbeitet, 8 Quellen geprüft, 2 Freigaben abgeschlossen.“ |
| **Wirkungshinweise** | Maßnahme und beobachtete Entwicklung getrennt von einer Kausalitätsbehauptung. | „Nach Aktualisierung von Seite X: steigende Impressionen im Beobachtungsfenster.“ |
| **Lücken und Risiken** | Daten-, Evidenz-, Content- und Freigabelücken. | „Zielseite Y hat hohe Impressionen, aber schwache CTR.“ |
| **Nächste Prioritäten** | Drei konkrete, verantwortete Aufgaben mit erwarteter Wirkung. | „FAQ für Frage Z ergänzen; Owner: Tobias; Review: 14 Tage.“ |
| **Transparenz** | Datenquellen, Datenfrische und Interpretationsgrenzen. | „GEO-Stichprobe; keine Garantie für KI-Zitationen.“ |

## 6. Delivery und Kundensteuerung

| Delivery-Stufe | Ablauf | Kundenerlebnis |
|---|---|---|
| **Webreport** | Ein geschützter, jederzeit aktueller Reportbereich im Kunden-Workspace. | Kunde sieht den aktuellen Stand und das Reportarchiv. |
| **Freigabeansicht** | Account Lead prüft die Monatsfassung, ergänzt bei Bedarf einen Kommentar und gibt sie frei. | Keine ungeprüfte automatische Managementaussage. |
| **PDF-Fassung** | Nach Freigabe wird eine druckfähige Fassung derselben Reportversion erstellt. | Hochwertiger Bericht für Vorstand, E-Mail und Archiv. |
| **Automatischer Versand** | Der freigegebene Report geht an die festgelegten Empfänger; Zustellung wird geloggt. | Planbar, wiederkehrend und ohne manuelle Monatsarbeit. |
| **Ausnahmehinweis** | Bei Datenfehler oder kritischer Lücke: kurze, klare Nachricht mit Link zur Handlung. | Hilfreich statt störend. |

Für den Produktionsversand wird ein eigener professioneller E-Mail-Versanddienst benötigt. Er ersetzt die engen Standardlimits des aktuellen Magic-Link-Versands und liefert zuverlässig pro Kunde, Absenderdomain und Versandprotokoll.

## 7. Freigabereihenfolge

| Phase | Lieferung | Abnahmekriterium | Abhängigkeit |
|---:|---|---|---|
| **0** | Google Search Console und GA4 read-only verbinden. | Erste echte Daten mit Datenfrische im Workspace. | Tommy bestätigt OAuth morgen. |
| **1** | Reportingprofil, KPI-Glossar und Kernseitenmodell. | Jede Berichtszahl hat Bedeutung, Quelle und Zeitraum. | Keine externe Abhängigkeit. |
| **2** | Sichere Importfunktionen und tägliche Hintergrundläufe. | Importlauf ist nachvollziehbar, wiederholbar und fehlertransparent. | Google OAuth und serverseitige Geheimnisverwaltung. |
| **3** | Live-Entscheidungsansicht und Wochenreview. | Team sieht „Was wirkt?“ und „Was ist jetzt wichtig?“ ohne Tabellenarbeit. | Genügend Baseline-Daten. |
| **4** | Premium-Monatsreport, Archiv und interne Freigabe. | Eine hochwertige, versionierte Kundenfassung kann freigegeben werden. | Reportmodell und Branding. |
| **5** | PDF-Generierung, Kundenversand und Zustellprotokoll. | Freigegebene Reports werden zuverlässig zugestellt und archiviert. | Professioneller E-Mail-Versanddienst. |
| **6** | Kunden-Onboarding-Vorlagen und Mehrkundenbetrieb. | Neuer Kunde erhält Domain, Ziele, Zugänge und Reportingprofil geführt. | Zwei validierte eigene Fallstudien. |

## 8. Vor dem technischen Bau noch zu entscheiden

| Entscheidung | Konkrete Auswahl | Warum sie wichtig ist |
|---|---|---|
| **Erster Pilot** | `geo-tool.com` allein oder parallel `geoagenturen.de`. | Ein Pilot reduziert Risiko und schafft eine verwertbare Fallstudie. |
| **Berichtsfreigabe** | Immer interne Freigabe oder Versand vollautomatisch nach definierter Regel. | Bestimmt Kundensicherheit und internen Aufwand. |
| **Erster Empfängerkreis** | Nur Tommy/Team oder bereits ein Testkunde. | Bestimmt Datenschutz-, Branding- und Versandanforderungen. |
| **Erster Versandrhythmus** | Wochenreview, Monatsreport oder beides. | Verhindert Report-Überlastung. |
| **Zusammenfassung** | Zunächst regelbasiert oder später KI-gestützt nach Datenfreigabe. | Regelbasiert ist sofort prüfbar; KI-Text muss mit strengen Datenbelegen arbeiten. |

## 9. Produktversprechen

> **„Der GEO-Premiumreport macht sichtbar, welche saubere Content- und GEO-Arbeit stattgefunden hat, welche Entwicklung die Daten zeigen und welche nächste Maßnahme den größten nachvollziehbaren Wert hat.“**

Das Produkt verspricht keine garantierten Rankings oder KI-Zitate. Es verkauft einen transparenten, messbaren und teamfähigen Wachstumsprozess – und damit genau den Unterschied zwischen einem gewöhnlichen SEO-Dashboard und einer hochwertigen GEO-Operationsplattform.
