[English](README.md) · **Русский** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Українська](README.uk.md)

# Markdown → Rich Message

**Telegram Markdown & Media Converter**

Публичный Telegram-бот, который превращает Markdown в **Telegram Rich Messages**.

Рабочий бот: **@tgMdFormatter_bot**

Создан с помощью **GPT-6.1** · Исходный код: https://github.com/l3chat/telegram-md-bot

## Возможности

- Markdown → Telegram Rich Message
- автоматическое разбиение слишком длинных документов на несколько Rich Messages
- заголовки, списки, task lists, цитаты, таблицы, code blocks, ссылки и формулы
- фотографии, аудио, голосовые сообщения, видео и файлы внутри Rich Message
- автоматическая привязка медиа без ручных `tg://...` ссылок
- приём Markdown как текста или файлов `.md`, `.markdown`, `.txt`
- временные черновики в Cloudflare Durable Objects
- автоматическое удаление черновика через 24 часа
- интерфейс на английском, русском, немецком, французском и украинском языках

## Быстрое использование

### Только текст

Отправьте Markdown прямо боту:

```md
# Заголовок

Это **жирный текст**, а это *курсив*.

- один
- два
```

Бот вернёт Rich Message. Если документ слишком длинный для одного Rich Message, он будет автоматически разбит по безопасным границам Markdown.

### Текст с медиа

1. Сначала отправьте фотографии, аудио, видео, голосовые сообщения или файлы.
2. Затем отправьте Markdown-текст или `.md/.txt`.
3. Бот сам создаст внутренние Telegram-ссылки и соберёт Rich Message.

Если в Markdown есть:

```md
![](photo.jpg "Подпись")
```

и файл `photo.jpg` был заранее отправлен боту, он будет вставлен именно в это место. Неиспользованные медиа добавляются в конец автоматически.

## Команды

- `/help` — помощь
- `/test` — показать локализованную Test Page
- `/media` — показать медиа текущего черновика
- `/send` — собрать и отправить черновик
- `/clear` — удалить черновик
- `/privacy` — политика конфиденциальности

Язык выбирается автоматически по Telegram `language_code`.

## Публичный профиль Telegram

Worker автоматически синхронизирует через Bot API:

- локализованное меню команд;
- имя бота;
- short description;
- полное description.

Поддерживаются **EN / RU / DE / FR / UK**.

## Конфиденциальность

Команда `/privacy` показывает локализованную политику. Публичная страница:

```text
https://tg-md-bot.lechat-reg.workers.dev/privacy?lang=ru
```

Отдельный файл: [PRIVACY.ru.md](PRIVACY.ru.md).

## Архитектура

```text
Telegram
   ↓ webhook
Cloudflare Worker
   ↓
DraftSession Durable Object
   ↓
Telegram Bot API / sendRichMessage
```

Для пары chat/user используется отдельный Durable Object. В нём временно хранятся Markdown, Telegram `file_id`, имена/алиасы файлов, порядок медиа и состояние альбома. Сами медиа остаются в Telegram.

## Ограничения

Бот использует безопасный целевой размер около **30 000 символов** на одну часть и автоматически делит более длинные документы. Медиа прикрепляются к той части, где находится соответствующая ссылка. Максимум подготовленного документа — **50 медиаэлементов**.

## Демонстрация

Полный ручной пример:

- [RICH_MESSAGE_DEMO.md](RICH_MESSAGE_DEMO.md)

В самом боте ту же идею можно проверить командой:

```text
/test
```

## Разработка и деплой

```bash
npm ci
npm test
npx wrangler deploy
```

Секреты Cloudflare:

- `BOT_TOKEN`
- `WEBHOOK_SECRET`

Health check текущей версии:

```text
tg-md-bot: OK test-page-v1
```

## Лицензия и статус

Проект находится в активной разработке.

**Rich Messages + Durable Objects + automatic media linking + 5 языков.**
