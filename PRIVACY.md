# Privacy Notice — Telegram Markdown Formatter

**Bot:** @tgMdFormatter_bot

This notice describes how the bot handles data when converting Markdown and media into Telegram Rich Messages.

## English

### What is processed

The bot processes only content that users send to it for formatting, including Markdown text or text files and Telegram media references.

A temporary draft may contain:

- Markdown text;
- Telegram `file_id` values;
- file names or temporary aliases;
- media ordering;
- album/draft state.

### Storage and deletion

Temporary draft state is stored in a Cloudflare Durable Object isolated by chat and user.

The draft is deleted:

- immediately after successful Rich Message assembly; or
- automatically no later than 24 hours after the latest draft activity.

Media binaries are **not copied into Durable Object storage**. The bot stores Telegram `file_id` references to media already hosted by Telegram.

### Use of data

The bot does not use submitted content for advertising, profiling, or model training.

The bot does not sell user data.

Telegram and Cloudflare may process technical request, delivery, and infrastructure metadata according to their own services and policies.

### Source code

The implementation is public:

https://github.com/l3chat/telegram-md-bot

---

## Русский

Бот обрабатывает только содержимое, которое пользователь отправляет для создания Rich Message.

Во временном черновике могут храниться Markdown-текст, Telegram `file_id`, имена/псевдонимы файлов, порядок медиа и состояние альбома.

Черновик изолирован по чату и пользователю и удаляется после успешной сборки либо автоматически не позднее чем через 24 часа после последней активности.

Сами медиафайлы в Durable Object не копируются — используются Telegram `file_id`.

Контент не используется для рекламы, профилирования или обучения моделей. Пользовательские данные не продаются.

---

## Deutsch

Der Bot verarbeitet nur Inhalte, die Benutzer zur Erstellung von Rich Messages senden.

Temporäre Entwürfe können Markdown-Text, Telegram-`file_id`-Werte, Dateinamen/Aliase, Medienreihenfolge und Albumstatus enthalten.

Entwürfe sind nach Chat und Benutzer getrennt und werden nach erfolgreicher Erstellung oder spätestens 24 Stunden nach der letzten Aktivität automatisch gelöscht.

Mediendateien selbst werden nicht in Durable Objects kopiert; es werden Telegram-`file_id`-Referenzen verwendet.

Eingesandte Inhalte werden nicht für Werbung, Profiling oder Modelltraining verwendet. Benutzerdaten werden nicht verkauft.

---

## Français

Le bot traite uniquement le contenu envoyé par l’utilisateur afin de créer des Rich Messages.

Les brouillons temporaires peuvent contenir du texte Markdown, des `file_id` Telegram, des noms/alias de fichiers, l’ordre des médias et l’état d’un album.

Les brouillons sont isolés par discussion et utilisateur et sont supprimés après l’assemblage réussi ou automatiquement au plus tard 24 heures après la dernière activité.

Les fichiers médias eux-mêmes ne sont pas copiés dans Durable Objects ; le bot utilise les références `file_id` de Telegram.

Le contenu envoyé n’est pas utilisé pour la publicité, le profilage ou l’entraînement de modèles. Les données utilisateur ne sont pas vendues.

---

## Українська

Бот обробляє лише вміст, який користувач надсилає для створення Rich Message.

У тимчасовій чернетці можуть зберігатися Markdown-текст, Telegram `file_id`, назви/псевдоніми файлів, порядок медіа та стан альбому.

Чернетки ізольовані за чатом і користувачем та видаляються після успішного складання або автоматично не пізніше ніж через 24 години після останньої активності.

Самі медіафайли до Durable Object не копіюються — використовуються Telegram `file_id`.

Вміст не використовується для реклами, профілювання чи навчання моделей. Дані користувачів не продаються.
