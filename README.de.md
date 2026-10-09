[English](README.md) · [Русский](README.ru.md) · **Deutsch** · [Français](README.fr.md) · [Українська](README.uk.md)

# Markdown → Rich Message

**Telegram Markdown & Media Converter**

Öffentlicher Telegram-Bot, der Markdown in **Telegram Rich Messages** umwandelt.

Live-Bot: **@tgMdFormatter_bot**

Erstellt mit **GPT-6.1** · Quellcode: https://github.com/l3chat/telegram-md-bot

## Funktionen

- Markdown → Telegram Rich Message
- automatische Aufteilung zu langer Dokumente in mehrere Rich Messages
- Überschriften, Listen, Task Lists, Zitate, Tabellen, Codeblöcke, Links und Formeln
- Fotos, Audio, Sprachnachrichten, Video und Dateien innerhalb einer Rich Message
- automatische Medienverknüpfung ohne manuelle `tg://...`-Links
- Markdown als Text oder als `.md`-, `.markdown`- und `.txt`-Datei
- temporäre Entwürfe in Cloudflare Durable Objects
- automatische Löschung nach 24 Stunden
- Benutzeroberfläche auf Englisch, Russisch, Deutsch, Französisch und Ukrainisch

## Schnelle Verwendung

### Nur Text

Markdown direkt an den Bot senden:

```md
# Überschrift

Das ist **fett** und das ist *kursiv*.

- eins
- zwei
```

Der Bot erzeugt eine Rich Message. Zu lange Dokumente werden automatisch an sicheren Markdown-Grenzen aufgeteilt.

### Text mit Medien

1. Zuerst Fotos, Audio, Video, Sprachnachrichten oder Dateien senden.
2. Danach Markdown-Text oder eine `.md/.txt`-Datei senden.
3. Der Bot erzeugt die internen Telegram-Links automatisch.

Beispiel:

```md
![](photo.jpg "Beschriftung")
```

Wenn `photo.jpg` vorher gesendet wurde, wird es genau an dieser Stelle eingefügt. Nicht referenzierte Medien werden automatisch angehängt.

## Befehle

- `/help` — Hilfe
- `/test` — lokalisierte Testseite anzeigen
- `/media` — Medien im aktuellen Entwurf anzeigen
- `/send` — aktuellen Entwurf erstellen und senden
- `/clear` — Entwurf löschen
- `/privacy` — Datenschutz

Die Sprache wird automatisch aus Telegram `language_code` gewählt.

## Öffentlicher Telegram-Auftritt

Der Worker synchronisiert über die Bot API automatisch:

- lokalisierte Befehlsmenüs;
- Bot-Namen;
- Kurzbeschreibung;
- vollständige Beschreibung.

Unterstützt: **EN / RU / DE / FR / UK**.

## Datenschutz

`/privacy` zeigt die lokalisierte Datenschutzerklärung.

```text
https://tg-md-bot.lechat-reg.workers.dev/privacy?lang=de
```

Separate Datei: [PRIVACY.de.md](PRIVACY.de.md).

## Architektur

```text
Telegram
   ↓ webhook
Cloudflare Worker
   ↓
DraftSession Durable Object
   ↓
Telegram Bot API / sendRichMessage
```

Für jedes Chat-/Benutzerpaar gibt es ein eigenes Durable Object. Gespeichert werden nur temporärer Markdown-Text, Telegram-`file_id`-Werte, Dateinamen/Aliase, Medienreihenfolge und Albumstatus. Die Mediendateien selbst bleiben bei Telegram.

## Grenzen

Der Bot verwendet ungefähr **30.000 Zeichen** als sichere Zielgröße pro Rich Message und teilt längere Dokumente automatisch. Medien werden nur an den Teil angehängt, der sie referenziert. Pro vorbereitetem Dokument sind derzeit höchstens **50 Medienelemente** vorgesehen.

## Demo

Vollständiges manuelles Beispiel:

- [RICH_MESSAGE_DEMO.md](RICH_MESSAGE_DEMO.md)

Im Bot:

```text
/test
```

## Entwicklung und Deployment

```bash
npm ci
npm test
npx wrangler deploy
```

Cloudflare-Secrets:

- `BOT_TOKEN`
- `WEBHOOK_SECRET`

Health Check:

```text
tg-md-bot: OK test-page-v1
```

## Status

Aktive Entwicklung.

**Rich Messages + Durable Objects + automatische Medienverknüpfung + 5 Sprachen.**
