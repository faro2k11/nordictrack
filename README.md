# T6.5S Workout — PWA & Android-App

Diese Dateien machen aus der T6.5S-Web-App eine installierbare App.

## Inhalt

```
t65s-pwa/
├── index.html              ← Die App selbst (mit PWA-Erweiterungen)
├── manifest.json           ← PWA-Manifest (Name, Icons, Theme)
├── service-worker.js       ← Offline-Cache
├── .well-known/
│   └── assetlinks.json     ← Nur für TWA nötig (Weg B)
└── icons/                  ← App-Icons in verschiedenen Größen
    ├── icon-72.png
    ├── icon-96.png
    ├── ...
    └── icon-512-maskable.png
```

---

## ⚠️ Wichtige Vorabinfo

**Eine normale Android-WebView funktioniert NICHT für diese App.** Web Bluetooth
ist in Android-WebViews nicht implementiert. Wer das ignoriert, baut eine
schöne App, die beim Verbinden scheitert.

Es gibt zwei realistische Wege:

| Weg                     | Aufwand    | Resultat                          |
|-------------------------|------------|-----------------------------------|
| **A) PWA installieren** | 5 Min      | App-Icon, Vollbild, kein Android Studio nötig |
| **B) TWA als APK**      | 1-2 Std    | Echte APK, installierbar/teilbar  |

Empfehlung: **Mit Weg A anfangen.** Wenn alles funktioniert, optional Weg B.

---

## Weg A — PWA direkt aus Chrome installieren (einfach)

### Voraussetzungen

- Die Dateien aus diesem Ordner sind auf einem HTTPS-Server abgelegt
  (z.B. GitHub Pages — wo deine bisherige App schon liegt)
- Chrome auf Android (oder Edge/Chrome auf Desktop)

### Schritte

1. **Dateien hochladen** ins gleiche GitHub-Pages-Repo wie bisher:
   - `index.html`, `manifest.json`, `service-worker.js` und alles aus `icons/`
   - Bei GitHub Pages mit `/docs/`-Ordner: dort reinkopieren
2. **Seite mit Chrome auf Android öffnen**
   - URL aufrufen, kurz warten (Service Worker registriert sich)
3. **Installieren**
   - Chrome-Menü (⋮) → **„App installieren"** oder **„Zum Startbildschirm hinzufügen"**
   - Icon erscheint auf dem Homescreen
4. **App starten**
   - Beim Tippen auf das Icon: App öffnet sich im Vollbild ohne Chrome-Leisten
   - Bluetooth funktioniert wie gewohnt

### Was die PWA-Version besser macht als die Browser-Version

- ✓ Eigenes App-Icon auf dem Homescreen
- ✓ Vollbild ohne Adressleiste — mehr Platz für die App
- ✓ Eigene Aufgabe im Android-Task-Switcher
- ✓ Funktioniert offline (BLE braucht eh kein Internet)

---

## Weg B — Echte Android-APK via Bubblewrap

Hier wird aus der PWA eine TWA (Trusted Web Activity), die als APK gebaut
und installiert werden kann. Im Hintergrund läuft Chrome (nicht WebView), also
funktioniert Web Bluetooth weiterhin.

### Voraussetzungen

- Weg A muss zuvor funktionieren (PWA muss installierbar sein, alle
  „Lighthouse PWA"-Checks grün)
- Node.js installiert (für Bubblewrap-CLI)
- JDK 17 installiert
- Android Studio (für die finale APK-Erstellung)
- Android SDK + Build Tools (kommt mit Android Studio)

### Schritt 1: Bubblewrap installieren

```bash
npm install -g @bubblewrap/cli
```

### Schritt 2: TWA-Projekt initialisieren

```bash
cd ~/Projekte
bubblewrap init --manifest=https://DEINE-URL/manifest.json
```

Bubblewrap fragt interaktiv ab:
- **Package name** (Reverse-Domain-Format) → z.B. `de.fabian.t65s`
  ⚠️ Den Namen unbedingt merken — der wird gleich nochmal gebraucht
- **App name**: `T6.5S Workout`
- **Theme color**: `#000000`
- **Background color**: `#000000`
- **Start URL**: bestätigen
- **Display mode**: `standalone`
- **Orientation**: `any`
- **Signing key**: bei „Generate new" mit `Y` antworten; Passwort merken!

Bubblewrap legt ein Android-Studio-Projekt im aktuellen Ordner an.

### Schritt 3: SHA256-Fingerprint des Signing-Keys ermitteln

```bash
bubblewrap fingerprint
```

Es kommen mehrere Zeilen — der wichtige Wert ist die SHA-256-Zeile, z.B.:
```
SHA256: AB:CD:EF:12:34:56:...
```

### Schritt 4: assetlinks.json auf den Webserver

Die Datei `.well-known/assetlinks.json` aus diesem Ordner anpassen:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "de.fabian.t65s",        ← deinen Package Name eintragen
    "sha256_cert_fingerprints": [
      "AB:CD:EF:12:34:56:..."                 ← SHA256 aus Schritt 3
    ]
  }
}]
```

Diese Datei muss unter folgender URL erreichbar sein:
```
https://DEINE-URL/.well-known/assetlinks.json
```

⚠️ Bei GitHub Pages: der `.well-known`-Ordner wird per Default ignoriert.
Workaround: leere `.nojekyll`-Datei im Repo-Root anlegen.

### Schritt 5: APK bauen

```bash
bubblewrap build
```

Erzeugt eine APK-Datei (`app-release-signed.apk`) im Projekt-Verzeichnis.

### Schritt 6: Auf dem Handy installieren

Zwei Möglichkeiten:

**a) Direkt via USB**
```bash
adb install app-release-signed.apk
```

**b) Datei auf das Handy kopieren** und mit einem Dateimanager öffnen
(„Installation aus unbekannten Quellen" muss in den Android-Einstellungen
erlaubt sein).

### Schritt 7: Anpassungen im Android Studio (optional)

Das Bubblewrap-Projekt lässt sich in Android Studio öffnen, um z.B.:
- Splash-Screen-Design anpassen
- Permissions ändern (falls nötig)
- App-Signing für Play Store vorbereiten
- Mehr Build-Varianten erstellen

### Verifikation

Nach Installation kurz testen:
1. **Bluetooth-Verbindung**: muss funktionieren (sonst stimmt was nicht mit TWA)
2. **Adressleiste**: darf NICHT sichtbar sein (sonst stimmen die assetlinks
   nicht — Chrome fällt dann auf Custom Tab zurück)

Wenn die Adressleiste oben angezeigt wird, ist die TWA-Verifizierung
fehlgeschlagen. Häufigste Ursachen:
- `assetlinks.json` nicht erreichbar (HTTPS, korrekte URL, kein 404)
- SHA256-Fingerprint stimmt nicht überein
- Package-Name in der `assetlinks.json` stimmt nicht mit der APK überein

Test-Tool: https://developers.google.com/digital-asset-links/tools/generator

---

## Häufige Probleme

**„Add to Home Screen" wird nicht angeboten in Chrome**
→ PWA-Kriterien nicht erfüllt. In Chrome DevTools (auf Desktop) →
   Application Tab → Manifest prüfen. Häufig fehlt das 512×512 Icon oder
   der Service Worker hat sich nicht registriert.

**Service Worker wird nicht registriert**
→ Nur über HTTPS oder localhost. GitHub Pages erfüllt das.

**App startet, aber Web Bluetooth scheitert**
→ Chrome-Version zu alt (Android-Chrome aktualisieren) oder Web Bluetooth
   in `chrome://flags` deaktiviert. Auf neueren Chrome-Versionen ist es
   standardmäßig aktiv.

**TWA zeigt Browser-Adressleiste statt Vollbild**
→ Asset Links sind nicht verifiziert. Siehe Schritt 4 + Verifikation oben.

---

## Lizenz / Eigentum

Die App ist deine eigene Entwicklung. Der TWA-Wrapper enthält ausschließlich
Open-Source-Komponenten von Google (TWA-Library) und braucht keine separate
Lizenz für privaten Gebrauch.
