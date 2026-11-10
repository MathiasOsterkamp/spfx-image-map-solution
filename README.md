# SPFx-Lösung „Bildbereiche verlinken“

SharePoint-Framework-Lösung (SPFx **1.4.1**) mit **React 16.14**, **Fluent UI 8** und **TypeScript 4.7**.
Ein Bild auswählen oder hochladen, darauf Bereiche (Rechteck, Kreis, Ellipse) festlegen und jeden Bereich mit Link,
Ziel (neuer Tab ja/nein), Titel, optionalem Tooltip und Hover-Stil versehen (Rahmenfarbe, Rahmendicke, Rahmenstil,
Füllfarbe mit Transparenz, Eckenradius). Für die Bildbereiche selbst wird keine zusätzliche Bibliothek verwendet.

## Voraussetzungen

| Werkzeug | Version |
|---|---|
| Node.js | **8.x** (getestet mit 8.17.0, siehe `.nvmrc`). SPFx 1.4.1 läuft nicht auf Node ≥ 10 (gulp 3) |
| npm | 5 oder 6 (getestet mit 6.14.18) |
| gulp-cli | global: `npm i -g gulp` (oder `npx gulp …`) |

## Schnellstart

```bash
nvm use            # Node 8 aus .nvmrc
npm install
gulp serve         # lokale Workbench: https://localhost:4321/temp/workbench.html
```

Für die gehostete Workbench `https://<tenant>/sites/<site>/_layouts/15/workbench.aspx` mit laufendem `gulp serve --nobrowser` aufrufen.
Upload und Bibliothek funktionieren nur dort, die lokale Workbench hat keinen SharePoint-Kontext.

## Bauen und Paketieren

```bash
npm run ship
# entspricht: gulp clean && gulp bundle --ship && gulp package-solution --ship
```

Ergebnis: `sharepoint/solution/image-map-webpart.sppkg`

Die Skripte sind (`includeClientSideAssets: true`) im Paket enthalten. Ein CDN ist nicht nötig.

## Bereitstellen

1. `image-map-webpart.sppkg` in den **App-Katalog** hochladen (SharePoint Online: Tenant-App-Katalog,
   SharePoint 2019: App-Katalog der Webanwendung).
2. Im Dialog „Bereitstellen“ bestätigen.
3. Auf der Zielwebsite: *Website-Inhalte → App hinzufügen → image-map-webpart-client-side-solution*.
4. Moderne Seite bearbeiten → Webpart **„Bildbereiche verlinken“** hinzufügen.

> **SharePoint 2019 / On-Premises:** In `.yo-rc.json` steht `"environment": "spo"`. Das betrifft nur den Generator, nicht das Paket.
> SPFx 1.4.1 ist die passende Version für SharePoint 2019. Die Icon-Schrift lädt standardmäßig vom Microsoft-CDN. Ohne Internetzugang
> die Schriftdateien selbst hosten und in `ImageMapWebPart.ts` `initializeIcons('https://…/fonts/')` angeben.

## Build-Anpassungen in `gulpfile.js`

| Anpassung | Warum |
|---|---|
| `TypeScriptConfiguration.setTypescriptCompiler(require('typescript'))` | SPFx 1.4.1 bringt TypeScript 2.4 mit. Fluent UI 8 und `@types/react@16` brauchen TypeScript 4.x. Die Version kommt aus `package.json` |
| `configureWebpack.mergeConfig({ linkedExternalsToBundle: ['react', 'react-dom'] })` | **Wichtig:** SPFx 1.4.1 lädt React sonst zur Laufzeit von SharePoint (SP2019: React 15.6, dort laufen keine Hooks). So wird React 16.14 fest ins Bundle eingebaut, und das Manifest verweist nicht mehr auf das React von SharePoint |
| `tslint.enabled = false` | Das tslint aus SPFx 1.4.1 ist nicht mit TypeScript 4.x kompatibel („Invalid source file“). Die Typprüfung übernimmt der Compiler mit `strict: true` |

Zusätzlich: `npm run typecheck` führt nur die Typprüfung aus.

## Projektstruktur

```
├── config/
│   ├── config.json                 Bundle-Definition
│   ├── package-solution.json       Lösungs-ID, Version, Paketpfad
│   ├── serve.json / write-manifests.json / copy-assets.json / deploy-azure-storage.json
├── src/webparts/imageMap/
│   ├── ImageMapWebPart.ts          Webpart, Eigenschaftenbereich, Daten-Bereinigung
│   ├── ImageMapWebPart.manifest.json
│   ├── config/securityConfig.ts    Zentrale Sicherheitsregeln
│   ├── components/                 Viewer, Editor, Panels, Farbwahl, Styles
│   ├── services/ImageService.ts    SharePoint-REST (SPHttpClient)
│   ├── models/IImageMap.ts         Datenmodell
│   └── utils/                      Validierung, Datei-Prüfung, Geometrie, Hover-CSS, Sanitizing
├── gulpfile.js                     Build-Anpassungen (s. o.)
├── tsconfig.json                   ES5, strict, TS 4.7
└── package.json
```

## Was geprüft wurde

- `npm install`, `gulp bundle --ship` und `gulp package-solution --ship` mit Node 8.17.0 und npm 6.14.18 laufen ohne Fehler. Die `.sppkg` wird erzeugt.
- Das minifizierte Bundle ist reines ES5 (läuft auch im IE11), etwa 720 KB groß und enthält React 16.14 im Production-Build.
- Das ausgelieferte Bundle wurde in jsdom mit nachgebauten SPFx-Schnittstellen geladen. Anzeige- und Bearbeitungsmodus rendern,
  unsichere Links werden verworfen, Texte bereinigt, Kreise korrekt positioniert.
- Unit-Checks: über 90 Fälle zu Validierung, Längen, Sonderzeichen, Geometrie und Sanitizing.
- **Tastatur und ARIA:** 26 automatisierte Tests in jsdom, u. a. Werkzeug-Kurztasten, Einfügen per Enter, Seitensuche nur mit Pfeiltasten,
  keine Kurztasten in Textfeldern, Undo fasst Pfeiltasten zusammen, Schnellaktionen mit einem Tab-Stopp, Esc-Rückweg, Fokus nach dem Löschen, Vollbild.
- **axe-core 4:** 0 Verstöße im Anzeigemodus, im Editor, mit geöffnetem Panel (Reiter Link) und im Reiter Stil.
  Farbkontrast lässt sich in jsdom nicht messen und muss im Browser geprüft werden.
- **Nicht** geprüft: Lauf in einem echten SharePoint-Tenant bzw. SharePoint 2019 und Test mit einem echten Screenreader.

## Bundle-Größe

Etwa 720 KB minifiziert, davon React 16 ca. 120 KB, den Großteil macht Fluent UI aus. Fluent wird über Deep-Imports (`@fluentui/react/lib/…`)
eingebunden. Webpack 3 aus SPFx 1.4.1 kennt kein Tree-Shaking über Paketgrenzen hinweg.

## Versionierung

Für Updates `version` in `config/package-solution.json` erhöhen (z. B. `1.0.1.0`), neu paketieren und im App-Katalog ersetzen.
Gespeicherte Webpart-Daten bleiben kompatibel, denn neue Felder (z. B. `tooltip`) sind optional und werden beim Laden ergänzt.

---

## Bedienung im Editor

### Toolbar (Fluent `CommandBar`)

| Gruppe | Einträge |
|---|---|
| Bild | Untermenü: Bild auswählen/ändern, Alternativtext bearbeiten |
| Werkzeuge | Auswählen · Rechteck · Kreis · Ellipse (Optionsgruppe, `menuitemradio` + `aria-checked`) |
| Verlauf | Rückgängig · Wiederholen (Name nennt den Schritt, z. B. „Rückgängig: Bereich verschoben“) |
| „…“ | Bereich einfügen (Rechteck/Kreis/Ellipse in der Bildmitte) · Lesereihenfolge sortieren |
| rechts | Hinweis-Zähler (öffnet Liste mit Sprunglinks) · Vorschau · Vollbild |

Bei wenig Platz verschwinden zuerst die Beschriftungen (nur Icons, der Name bleibt als `aria-label`/Tooltip erhalten),
danach rutschen Verlauf und Trennlinien ins „…“-Menü. Die Werkzeuge bleiben sichtbar.

### Tastatur

| Wo | Taste | Wirkung |
|---|---|---|
| Toolbar | Tab / Umschalt+Tab | In die Leiste hinein bzw. heraus |
| Toolbar | ← → | Zwischen den Einträgen wechseln |
| Toolbar | Enter / Leertaste, ↓ | Auslösen bzw. Untermenü öffnen |
| Zeichenfläche | V · R · K · E | Werkzeug Auswählen · Rechteck · Kreis · Ellipse |
| Zeichenfläche | Enter | Gewählte Form in der Bildmitte einfügen |
| Bereich | ← → ↑ ↓ (+Umschalt) | Verschieben um 0,5 % (5 %) |
| Bereich | Strg + Pfeile (+Umschalt) | Größe ändern, bei Kreisen den Durchmesser |
| Bereich | Enter / Leertaste | Eigenschaften öffnen |
| Bereich | Strg+D | Duplizieren |
| Bereich | Entf | Löschen (Fokus springt zum nächsten Bereich) |
| Bereich | Tab | Zu den Schnellaktionen (ein Tab-Stopp, dort ← → und Esc zurück) |
| überall im Editor | Strg+Z · Strg+Y / Strg+Umschalt+Z | Rückgängig · Wiederholen (in Textfeldern gilt das native Rückgängig) |
| Panel / Vollbild | Esc | Erst Panel schließen, dann Vollbild beenden. Der Fokus kehrt zum Bereich zurück |
| Seitensuche | ↓ ↑, Enter, Esc | Ergebnisse durchgehen, wählen, schließen |

**Kurztasten mit einem Buchstaben (V/R/K/E)** wirken nur, wenn der Fokus auf der Zeichenfläche oder einem Bereich liegt,
nicht in Textfeldern und nicht in der Toolbar (WCAG 2.1.4). Die Zeichenfläche hat `role="application"`, damit Screenreader
die Tasten durchreichen.

**Rückgängig:** Bis zu 50 Schritte. Aufeinanderfolgende gleichartige Änderungen (Tippen in einem Feld, mehrere Pfeiltasten)
werden zu einem Schritt zusammengefasst.

### Eigenschaften (Reiter Link · Stil · Position)

- **Link:** Ziel mit **Seitensuche** (durchsucht die Bibliothek „Websiteseiten“ der aktuellen Website nach Titel; ein leerer Titel
  wird mit dem Seitentitel gefüllt), Titel, Tooltip, neuer Tab.
- **Stil:** Form und **Stil-Vorlagen** (Markant, Dezent, Nur Rahmen, Hervorheben) oder „Eigener Stil“ mit allen Einzelwerten.
- **Position:** Abstand, Breite/Höhe bzw. Durchmesser in %.
- Enthält ein Reiter Fehler, zeigt er ein Warnsymbol und Screenreader hören „Link, enthält Fehler“.
- Normal öffnen die Eigenschaften als Panel rechts, im **Vollbild** als Spalte neben der Zeichenfläche.

### Schnellaktionen am Bereich

Am ausgewählten Bereich erscheint eine kleine Leiste mit Ziel, Bearbeiten, Duplizieren und Löschen (`role="toolbar"`).
Sie steht im DOM direkt hinter dem Bereich und ist deshalb mit einem Tab erreichbar.

## Formen

| Form | Verhalten |
|---|---|
| Rechteck | Breite und Höhe frei, optional mit Eckenradius |
| **Kreis** | Bleibt bei jeder Bildgröße und jedem Seitenverhältnis rund. Gespeichert wird der Durchmesser in % der Bildbreite. Im Anzeigemodus entsteht die Höhe per `padding-bottom`, dafür ist kein JavaScript nötig. Im Editor gibt es nur Eckgriffe |
| Ellipse | Breite und Höhe frei, folgt dem Seitenverhältnis des Bildes |

## Titel und Tooltip

- **Titel** (Pflicht, max. 255 Zeichen) ist der Linktext, den Screenreader vorlesen.
- **Tooltip** (optional, max. 255 Zeichen) erscheint beim Überfahren. Leer bedeutet, dass der Titel als Tooltip erscheint.

## Sicherheit

### Zentrale Konfiguration (`config/securityConfig.ts`)

Die Regeln sind bewusst **nicht** im Eigenschaftenbereich änderbar, damit Seitenbearbeiter sie nicht lockern können.

| Einstellung | Standard | Wirkung |
|---|---|---|
| `httpsOnly` | `true` | Externe Links nur per https. http nur auf dem eigenen SharePoint-Host |
| `allowedLinkDomains` | `[]` (alle) | Freigabeliste für externe Domains inkl. Subdomains, z. B. `['firma.de']` |
| `imagesSameHostOnly` | `true` | Bilder nur aus dem eigenen SharePoint (keine Tracking-Pixel, keine fremden Inhalte) |
| `allowedImageHosts` | `[]` | Zusätzlich erlaubte Bild-Hosts (z. B. eigenes CDN) |
| `maxUploadMB` | `10` | Maximale Upload-Größe |
| `allowedUploadTypes` | PNG, JPEG, GIF, WebP | **SVG ausgeschlossen** (kann Skripte enthalten) |
| `maxAreas` | `100` | Maximale Anzahl Bereiche pro Bild |
| `maxUrlLength` | 2048 | Gesamtlänge eines Links (praxisübliche Grenze von Browsern und Servern) |
| `maxSharePointPathLength` | 400 | Dekodierter Pfad bei Links in den eigenen SharePoint (Grenze von SharePoint Online/2019) |
| `maxTitleLength` / `maxTooltipLength` / `maxAltLength` | 255 / 255 / 255 | Titel, Tooltip, Alternativtext |

Weitere feste Grenzen: Domainname max. 253 Zeichen (DNS), Domain-Label max. 63, E-Mail max. 64 Zeichen vor dem @ und insgesamt 254 (RFC 5321).

### Erlaubte Zeichen

| Feld | Nicht erlaubt |
|---|---|
| Link / Bild-URL | Leerzeichen, die Zeichen < > " ` { } &#124; ^ [ ] \\, Steuerzeichen, unsichtbare Zeichen, % ohne zwei Hex-Ziffern. Für Leerzeichen und Sonderzeichen gibt es einen Korrekturvorschlag mit Prozentkodierung (z. B. %20). Umlaute im Pfad sind erlaubt |
| Titel, Tooltip, Alternativtext | Die Zeichen < > { } [ ] \\ ` &#124; ^ ~, Steuerzeichen (Tab, Zeilenumbruch), unsichtbare Zeichen |

**Unsichtbare Zeichen** sind Null-Breite-Zeichen, weiche Trennstriche und Textrichtungs-Umschalter (U+202A–U+202E, U+2066–U+2069).
Sie werden für Täuschungen genutzt, etwa damit „rechnung‮fdp.exe“ wie „rechnungexe.pdf“ aussieht.
Erlaubt bleiben Buchstaben aller Sprachen inkl. Umlaute, Ziffern und übliche Satzzeichen wie `. , ; : ! ? - – ( ) / & ' " „ “ % € @ # + =`.
Die Felder begrenzen die Eingabe auf die Maximallänge und zeigen einen Zeichenzähler. Altdaten mit unerlaubten Zeichen werden im Anzeigemodus bereinigt ausgegeben.

### Maßnahmen

- **Link-Prüfung mit Positivliste** (`utils/validation.ts`): erlaubt sind nur `https:`, `mailto:`, `tel:`, serverrelative Pfade (`/…`) und Sprungmarken (`#…`).
  Abgelehnt werden unter anderem `javascript:` (auch mit Groß-/Kleinschreibung, Leerzeichen oder Tabs), `data:`, `vbscript:`, `file:`,
  protokoll-relative `//host`, Backslash-Tricks, Steuerzeichen, Zugangsdaten in der URL (`https://intranet@evil.com`)
  und ungültige Hostnamen. Für Eingaben wie „www.firma.de“ gibt es einen Korrekturvorschlag.
- **Erneute Prüfung beim Anzeigen:** Webpart-Properties gelten als nicht vertrauenswürdig, weil sie sich per REST oder im Seiten-JSON
  manipulieren lassen. `sanitizeAreas` typisiert und begrenzt alle Werte beim Laden. Der Anzeigemodus prüft jede URL erneut
  und gibt ungültige Links nicht aus.
- **Upload:** Geprüft wird der Dateiinhalt anhand der Signatur („Magic Bytes“), nicht nur Endung oder MIME-Typ. Die Dateiendung wird
  an den echten Inhalt angepasst. Größenlimit, bereinigter Dateiname, kein Überschreiben (bei Namenskonflikt wird ein Zeitstempel angehängt).
- **Upload-Ordner:** nur relativ zur aktuellen Website, ohne `..`, `//`, `:` oder Sonderzeichen. Im Eigenschaftenbereich wird zusätzlich geprüft, ob der Ordner existiert.
- **Externe Links** bekommen `rel="noopener noreferrer nofollow"`, Links in neuem Tab mindestens `noopener noreferrer`.
- **CSS-Injection:** Farb- und Zahlenwerte werden vor der Ausgabe gegen eine Positivliste geprüft.
- **Fehlermeldungen** enthalten keine Serverdetails. Technische Details landen nur in der Browser-Konsole.
- **Berechtigungen** prüft SharePoint serverseitig. Wer keine Schreibrechte auf den Ordner hat, kann nicht hochladen.

> Hinweis: Das ist clientseitige Härtung. Bearbeiter mit Seitenrechten können Inhalte grundsätzlich verändern.
> Die Prüfung beim Anzeigen sorgt aber dafür, dass manipulierte Werte nicht ausgegeben werden.

---

## Barrierefreiheit (Ziel: WCAG 2.1/2.2 AA, BITV 2.0)

### Anzeigemodus

| Kriterium | Umsetzung |
|---|---|
| 1.1.1 Nicht-Text-Inhalt | Alternativtext ist Pflicht (Prüfung im Editor und im Eigenschaftenbereich) |
| 2.4.4 Linkzweck | Beschriftung (Linktext) ist Pflicht. Warnung bei Floskeln wie „hier klicken“. Die URL wird nie als Linktext verwendet |
| 3.2.5 / G201 Neues Fenster | „(öffnet in neuem Tab)“ im zugänglichen Namen und im Tooltip, in der Linkliste zusätzlich als Symbol |
| 1.3.1 Struktur | Links stehen in einer `<ul>`-Liste. Die Gruppe wird als „Interaktive Grafik mit N Links“ angesagt |
| 2.4.3 Fokusreihenfolge | Lesereihenfolge per Pfeil-Buttons oder „Lesereihenfolge sortieren“ (oben links → unten rechts) |
| 2.4.7 / 2.4.11 Fokus sichtbar | Zweifarbiger Fokusring (weiß + schwarz), auf jedem Bildhintergrund sichtbar. Fokus zeigt auch den Hover-Stil |
| 1.4.11 Nicht-Text-Kontrast | Warnung im Editor, wenn der Hover-Zustand kaum sichtbar ist |
| 1.4.13 / Touch | Option „Bereiche dauerhaft andeuten“ für Geräte ohne Hover |
| 2.5.8 Zielgröße | Klickbereiche mindestens 24 × 24 px |
| 1.4.10 Reflow | Prozent-Koordinaten, das Bild skaliert ohne horizontales Scrollen |
| Windows-Kontrastmodus | Systemfarben (`Highlight`, `LinkText`) über `forced-colors` und `-ms-high-contrast` |
| 2.3.3 Bewegung | Keine Übergänge bei `prefers-reduced-motion` |
| Textalternative | Option „Links zusätzlich als Liste anzeigen“. Wenn das Bild nicht lädt, erscheint die Liste automatisch |

### Bearbeitungsmodus

- **Vollständig per Tastatur bedienbar (2.1.1):** siehe Tabelle „Tastatur“. Neue Bereiche entstehen auch ohne Ziehen
  (Enter auf der Zeichenfläche oder „…“ → „Bereich einfügen“), damit ist WCAG 2.5.7 erfüllt.
- **Ansagen per Live-Region (4.1.3):** Position, Größe, Anlegen, Löschen, Reihenfolge und Upload-Status.
- **Fokusmanagement:** Nach dem Löschen geht der Fokus zum nächsten Bereich, nach dem Schließen des Panels zurück zum Bereich.
  Das Panel fokussiert beim Öffnen das Link-Feld.
- **Fehlerübersicht** mit Sprunglinks zu jedem fehlerhaften Bereich bzw. zum Alternativtext. Pflichtfelder sind als solche ausgezeichnet.
- Alle Icon-Buttons haben sprechende Namen, z. B. „Bereich 2, Kantine, löschen“. Dekorative Icons sind `aria-hidden`.

### Was trotzdem manuell zu prüfen ist

- Den Farbkontrast von Rahmen und Füllung zum **konkreten Bild** kann der Code nicht messen.
- Die Kontraste der Oberfläche (Fluent-Standardtheme) mit axe oder Accessibility Insights im echten Browser prüfen.
- Test mit NVDA/JAWS und VoiceOver in eurer SharePoint-Umgebung.
- Inhaltliche Qualität von Alternativ- und Linktexten.

---

## Technische Hinweise

- **Icons:** `initializeIcons()` lädt die Icon-Schrift vom Microsoft-CDN. On-Premises ohne Internet: Schrift selbst hosten und `initializeIcons('https://…/fonts/')` aufrufen.
- **`dataVersion`** wird nicht überschrieben. Die 1.4.1-Typings deklarieren es als Property, neuere TypeScript-Versionen melden sonst TS2611.
- **Bundle-Größe:** Fluent wird über Deep-Imports (`@fluentui/react/lib/...`) eingebunden.
- **Strg + Pfeiltasten** wurde statt Alt gewählt, weil Alt + Pfeil links im Browser „Zurück“ auslöst.
- **CommandBar-Pufferung:** Fluents `CommandBar` puffert Items samt `onClick`-Handlern. Der Editor liest deshalb in allen Handlern
  den aktuellen Stand über Refs (`areasRef`, `newShapeRef`, `testModeRef`). Sonst konnte z. B. „Lesereihenfolge sortieren“ einen gerade gelöschten Bereich wiederherstellen.
