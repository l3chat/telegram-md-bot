# Datenschutz — Telegram Markdown Formatter

**Bot:** @tgMdFormatter_bot

Erstellt mit **GPT-6.1** · GitHub: https://github.com/l3chat/telegram-md-bot

Der Bot verarbeitet nur Inhalte, die Benutzer zur Erstellung von Telegram Rich Messages senden.

## Temporär gespeicherte Daten

- Markdown-Text;
- Telegram-`file_id`-Werte;
- Dateinamen oder temporäre Aliase;
- Medienreihenfolge;
- Album-/Entwurfsstatus.

Entwürfe sind nach Chat und Benutzer getrennt.

## Speicherdauer

Entwürfe werden gelöscht:

- nach erfolgreicher Erstellung der Rich Message; oder
- automatisch spätestens 24 Stunden nach der letzten Aktivität.

Mediendateien selbst werden **nicht in Durable Objects kopiert**. Verwendet werden Telegram-Dateireferenzen.

## Usage statistics

Für aggregierte Nutzungsstatistiken (`/stats`) speichert der Bot nur einen gesalzenen SHA-256-Hash der Benutzerkennung und den letzten Aktivitätszeitpunkt für höchstens 30 Tage. Nachrichteninhalte werden dabei nicht gespeichert. Aggregierte Zähler umfassen eingehende Updates, Rich Messages, Medienereignisse und Fehler.

## Nutzung der Daten

Eingesandte Inhalte werden nicht für Werbung, Profiling oder Modelltraining verwendet.

Benutzerdaten werden nicht verkauft.

Telegram und Cloudflare können technische Anfrage-, Zustell- und Infrastrukturmetadaten gemäß ihren eigenen Diensten und Richtlinien verarbeiten.

## Öffentliche Datenschutzseite

https://tg-md-bot.lechat-reg.workers.dev/privacy?lang=de
