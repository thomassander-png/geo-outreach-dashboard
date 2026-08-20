# Offizielle Datenquellen für GEO-Intelligence

## Google Search Console API

Die offizielle Search Console API bietet programmatischen Zugriff auf Suchanalysen, bestätigte Properties und Sitemaps. Für eine vollständige Performance-Zeitreihe empfiehlt Google, die Daten täglich für einen einzelnen Tag abzufragen und die Ergebnisse über `startRow` zu paginieren. Daten sind typischerweise mit zwei bis drei Tagen Verzögerung verfügbar. Beim gleichzeitigen Gruppieren nach Seite und Suchanfrage können Daten aus Skalierungsgründen unvollständig sein.

- API-Übersicht: https://developers.google.com/webmaster-tools
- Performance-Daten und Pagination: https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data

## Google Analytics Data API

Die offizielle GA4 Data API stellt programmatischen Zugriff auf die Reportdaten bereit, die auch in der Analytics-Oberfläche erscheinen. Sie unterstützt benutzerdefinierte Dashboards, automatisierte Berichte sowie Methoden wie `runReport` und `batchRunReports`.

- API-Übersicht: https://developers.google.com/analytics/devguides/reporting/data/v1

## Architekturfolge

Die erste Messstufe soll daher manuelle Baseline- und CSV-Imports vollständig unterstützen. Spätere Search-Console- und GA4-Anbindungen müssen read-only, OAuth-geschützt und als tägliche Hintergrundimporte umgesetzt werden. Die Datenfrische muss im Dashboard sichtbar sein; Daten dürfen nicht als Echtzeit oder kausal interpretiert werden, wenn die Quelle das nicht hergibt.

## Sichere Hintergrundautomatisierung im bestehenden Supabase-Projekt

Für wiederkehrende Imports kann eine Supabase Edge Function über `pg_cron` und `pg_net` zeitgesteuert aufgerufen werden. Das zur Funktionsauslösung benötigte Projekttoken soll laut offizieller Dokumentation über Supabase Vault bereitgestellt werden. Damit muss weder ein Token noch ein OAuth-Refresh-Token in der statischen Vite-Anwendung gespeichert werden.

- Offizielle Anleitung: https://supabase.com/docs/guides/functions/schedule-functions
- Hintergrundfunktionen im bestehenden Projekt: aktuell keine Edge Functions vorhanden.
- Verfügbar: `supabase_vault` und `pg_cron`.

### Sicherheitsregel für die Google-Anbindung

Google OAuth-Client-Secret und OAuth-Refresh-Token dürfen ausschließlich in geschützter Serverkonfiguration beziehungsweise in Vault liegen. Der Browser erhält nur eine zeitlich begrenzte OAuth-Freigabe und ruft nach erfolgreicher Verbindung ausschließlich read-only Daten ab. Automatisierte Veröffentlichungen auf Drittplattformen sind ausdrücklich nicht Teil dieser Integration.

## Google OAuth und minimale Berechtigungen

Die Search Console API verlangt OAuth 2.0 für private Nutzerdaten. Die minimal notwendige Scope für dieses Dashboard lautet `https://www.googleapis.com/auth/webmasters.readonly`; sie gewährt ausschließlich lesenden Zugriff. Die Data API von Google Analytics eignet sich für programmatische Dashboard- und Reportingdaten; die Integration wird auf die lesende Analytics-Berechtigung `https://www.googleapis.com/auth/analytics.readonly` begrenzt.

Für die produktive Freigabe müssen ein Google-Cloud-OAuth-Client, ein Consent Screen und die beiden APIs eingerichtet werden. Google weist darauf hin, dass öffentliche Apps für Nutzerdaten-Scope je nach Konfiguration eine Verifikation benötigen können. Der initiale OAuth-Flow wird deshalb erst nach expliziter Nutzerfreigabe gestartet.

- Search Console: https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- OAuth Scopes: https://developers.google.com/identity/protocols/oauth2/scopes
- GA4 Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
