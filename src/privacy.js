const PRIVACY = {
  en: {
    title: "Privacy",
    intro: "Markdown Formatter processes only the content you send to the bot in order to build Telegram Rich Messages.",
    bullets: [
      "Temporary drafts may contain Markdown text, Telegram file_id values, file names or aliases, media order and album state.",
      "Draft state is isolated by chat and user and is automatically removed after successful assembly or after at most 24 hours.",
      "Media binaries are not copied into Durable Object storage; Telegram-hosted file references are used instead.",
      "The bot does not use submitted content for advertising, profiling or model training.",
      "The bot does not sell user data.",
      "Telegram and Cloudflare may process request and delivery metadata according to their own services and policies.",
    ],
    source: "Source code and implementation details are available in the public GitHub repository.",
  },
  ru: {
    title: "Конфиденциальность",
    intro: "Markdown Formatter обрабатывает только тот контент, который вы отправляете боту для создания Telegram Rich Messages.",
    bullets: [
      "Временный черновик может содержать Markdown-текст, Telegram file_id, имена или псевдонимы файлов, порядок медиа и состояние альбома.",
      "Черновик изолирован по чату и пользователю и удаляется после успешной сборки либо автоматически не позднее чем через 24 часа.",
      "Сами медиафайлы не копируются в хранилище Durable Object — используются ссылки file_id, уже хранящиеся в Telegram.",
      "Бот не использует присланный контент для рекламы, профилирования или обучения моделей.",
      "Бот не продаёт пользовательские данные.",
      "Telegram и Cloudflare могут обрабатывать технические данные доставки и запросов в рамках собственных сервисов и политик.",
    ],
    source: "Исходный код и детали реализации доступны в публичном GitHub-репозитории.",
  },
  de: {
    title: "Datenschutz",
    intro: "Markdown Formatter verarbeitet nur Inhalte, die du dem Bot sendest, um Telegram Rich Messages zu erstellen.",
    bullets: [
      "Temporäre Entwürfe können Markdown-Text, Telegram-file_id-Werte, Dateinamen oder Aliase, Medienreihenfolge und Albumstatus enthalten.",
      "Entwürfe sind pro Chat und Benutzer getrennt und werden nach erfolgreicher Erstellung oder spätestens nach 24 Stunden automatisch gelöscht.",
      "Mediendateien selbst werden nicht in Durable Objects kopiert; verwendet werden Telegram-Dateireferenzen.",
      "Eingesandte Inhalte werden nicht für Werbung, Profiling oder Modelltraining verwendet.",
      "Benutzerdaten werden nicht verkauft.",
      "Telegram und Cloudflare können technische Anfrage- und Zustelldaten im Rahmen ihrer eigenen Dienste und Richtlinien verarbeiten.",
    ],
    source: "Quellcode und Implementierungsdetails sind im öffentlichen GitHub-Repository verfügbar.",
  },
  fr: {
    title: "Confidentialité",
    intro: "Markdown Formatter traite uniquement le contenu que vous envoyez au bot afin de créer des Rich Messages Telegram.",
    bullets: [
      "Les brouillons temporaires peuvent contenir le texte Markdown, des file_id Telegram, des noms ou alias de fichiers, l’ordre des médias et l’état d’un album.",
      "Les brouillons sont isolés par discussion et utilisateur et sont supprimés après l’assemblage réussi ou automatiquement au plus tard après 24 heures.",
      "Les fichiers médias eux-mêmes ne sont pas copiés dans Durable Objects ; le bot utilise les références déjà hébergées par Telegram.",
      "Le contenu envoyé n’est pas utilisé pour la publicité, le profilage ou l’entraînement de modèles.",
      "Les données utilisateur ne sont pas vendues.",
      "Telegram et Cloudflare peuvent traiter des métadonnées techniques de requête et de livraison selon leurs propres services et politiques.",
    ],
    source: "Le code source et les détails d’implémentation sont disponibles dans le dépôt GitHub public.",
  },
  uk: {
    title: "Конфіденційність",
    intro: "Markdown Formatter обробляє лише той вміст, який ви надсилаєте боту для створення Telegram Rich Messages.",
    bullets: [
      "Тимчасова чернетка може містити Markdown-текст, Telegram file_id, назви або псевдоніми файлів, порядок медіа та стан альбому.",
      "Чернетки ізольовані за чатом і користувачем та видаляються після успішного складання або автоматично не пізніше ніж через 24 години.",
      "Самі медіафайли не копіюються до Durable Object — використовуються посилання file_id, що вже зберігаються в Telegram.",
      "Надісланий вміст не використовується для реклами, профілювання чи навчання моделей.",
      "Дані користувачів не продаються.",
      "Telegram і Cloudflare можуть обробляти технічні дані запитів і доставки відповідно до власних сервісів і політик.",
    ],
    source: "Вихідний код і деталі реалізації доступні у публічному GitHub-репозиторії.",
  },
};

function privacyLocale(value) {
  const raw = String(value || "").toLowerCase().split(/[-_]/)[0];
  return PRIVACY[raw] ? raw : "en";
}

function privacyMarkdown(locale, publicUrl) {
  const lang = privacyLocale(locale);
  const p = PRIVACY[lang];
  const lines = [
    "# " + p.title,
    "",
    p.intro,
    "",
    ...p.bullets.map((item) => "- " + item),
    "",
    p.source,
    "",
    "Built with GPT-6.1.",
    "GitHub: https://github.com/l3chat/telegram-md-bot",
  ];
  if (publicUrl) {
    lines.push("", "Privacy page: " + publicUrl);
  }
  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function privacyHtml(locale) {
  const lang = privacyLocale(locale);
  const p = PRIVACY[lang];
  const links = ["en", "ru", "de", "fr", "uk"]
    .map((code) => '<a href="/privacy?lang=' + code + '">' + code.toUpperCase() + "</a>")
    .join(" · ");

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(p.title)} — Markdown Formatter</title>
<style>
body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.55}
h1{margin-bottom:.3em} .langs{margin-bottom:2em} li{margin:.7em 0}
footer{margin-top:2em;color:#666;font-size:.95em}
</style>
</head>
<body>
<div class="langs">${links}</div>
<h1>${escapeHtml(p.title)}</h1>
<p>${escapeHtml(p.intro)}</p>
<ul>${p.bullets.map((x) => "<li>" + escapeHtml(x) + "</li>").join("")}</ul>
<footer>${escapeHtml(p.source)}<br>
Built with GPT-6.1 · <a href="https://github.com/l3chat/telegram-md-bot">github.com/l3chat/telegram-md-bot</a>
</footer>
</body>
</html>`;
}

export {
  PRIVACY,
  privacyLocale,
  privacyMarkdown,
  privacyHtml,
};
