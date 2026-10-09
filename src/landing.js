const BOT_USERNAME = "tgMdFormatter_bot";
const GITHUB_URL = "https://github.com/l3chat/telegram-md-bot";

const LANDING = {
  en: {
    title: "Markdown → Rich Message",
    subtitle: "Turn Markdown + media into polished Telegram Rich Messages.",
    open: "Open in Telegram",
    test: "Try /test",
    how: "How it works",
    steps: [
      "Send Markdown text or a .md/.txt file.",
      "Optionally send photos, audio, video or files.",
      "Get a structured Telegram Rich Message. Long documents split automatically."
    ],
    features: ["Markdown formatting", "Media in the text", "Long documents", "5 UI languages", "Open-source"],
    source: "View source on GitHub"
  },
  ru: {
    title: "Markdown → Rich Message",
    subtitle: "Превращает Markdown + медиа в красиво оформленные Telegram Rich Messages.",
    open: "Открыть в Telegram",
    test: "Попробовать /test",
    how: "Как это работает",
    steps: [
      "Пришлите Markdown-текст или файл .md/.txt.",
      "При необходимости добавьте фото, аудио, видео или файлы.",
      "Получите структурированный Rich Message. Длинный текст разбивается автоматически."
    ],
    features: ["Markdown-разметка", "Медиа внутри текста", "Длинные документы", "5 языков интерфейса", "Открытый исходный код"],
    source: "Исходный код на GitHub"
  },
  de: {
    title: "Markdown → Rich Message",
    subtitle: "Markdown + Medien werden zu formatierten Telegram Rich Messages.",
    open: "In Telegram öffnen",
    test: "/test ausprobieren",
    how: "So funktioniert es",
    steps: [
      "Markdown-Text oder eine .md/.txt-Datei senden.",
      "Optional Fotos, Audio, Video oder Dateien hinzufügen.",
      "Eine strukturierte Rich Message erhalten. Lange Dokumente werden automatisch geteilt."
    ],
    features: ["Markdown", "Medien im Text", "Lange Dokumente", "5 UI-Sprachen", "Open Source"],
    source: "Quellcode auf GitHub"
  },
  fr: {
    title: "Markdown → Rich Message",
    subtitle: "Transformez Markdown + médias en Rich Messages Telegram soignés.",
    open: "Ouvrir dans Telegram",
    test: "Essayer /test",
    how: "Comment ça marche",
    steps: [
      "Envoyez du Markdown ou un fichier .md/.txt.",
      "Ajoutez si besoin photos, audio, vidéo ou fichiers.",
      "Recevez un Rich Message structuré. Les longs documents sont découpés automatiquement."
    ],
    features: ["Markdown", "Médias dans le texte", "Longs documents", "5 langues", "Open source"],
    source: "Code source sur GitHub"
  },
  uk: {
    title: "Markdown → Rich Message",
    subtitle: "Перетворює Markdown + медіа на оформлені Telegram Rich Messages.",
    open: "Відкрити в Telegram",
    test: "Спробувати /test",
    how: "Як це працює",
    steps: [
      "Надішліть Markdown-текст або файл .md/.txt.",
      "За потреби додайте фото, аудіо, відео або файли.",
      "Отримайте структурований Rich Message. Довгі документи діляться автоматично."
    ],
    features: ["Markdown", "Медіа в тексті", "Довгі документи", "5 мов інтерфейсу", "Відкритий код"],
    source: "Код на GitHub"
  }
};

function landingLocale(value) {
  const code = String(value || "").toLowerCase().split(/[-_]/)[0];
  return LANDING[code] ? code : "en";
}

function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function landingHtml(locale) {
  const lang = landingLocale(locale);
  const p = LANDING[lang];
  const telegramUrl = "https://t.me/" + BOT_USERNAME + "?start=website";
  const langs = ["en","ru","de","fr","uk"]
    .map((x) => '<a href="/?lang=' + x + '">' + x.toUpperCase() + '</a>')
    .join(" · ");

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(p.subtitle)}">
<title>${esc(p.title)} — Telegram Markdown & Media Converter</title>
<style>
:root{color-scheme:light dark;--bg:#0b1220;--card:#121b2f;--text:#eef4ff;--muted:#a9b8d0;--accent:#5aa7ff}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(180deg,#08101d,#101b30);color:var(--text)}
main{max-width:920px;margin:auto;padding:28px 20px 60px}.langs{text-align:right;color:var(--muted)}a{color:var(--accent)}
.hero{padding:64px 0 38px}.hero h1{font-size:clamp(2.5rem,8vw,5.5rem);line-height:.95;margin:.2em 0}.hero p{font-size:1.2rem;color:var(--muted);max-width:700px}
.buttons{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}.btn{display:inline-block;padding:13px 18px;border-radius:12px;text-decoration:none;font-weight:700;background:var(--accent);color:#07101d}.btn.secondary{background:var(--card);color:var(--text);border:1px solid #32405a}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.card{background:rgba(18,27,47,.88);border:1px solid #2b3953;border-radius:18px;padding:20px}
h2{margin-top:42px}.step{font-size:2rem;font-weight:800;color:var(--accent)}footer{margin-top:48px;color:var(--muted)}
code{background:#0a1324;padding:.15em .35em;border-radius:5px}
</style>
</head>
<body><main>
<div class="langs">${langs}</div>
<section class="hero">
<p>Telegram Markdown & Media Converter</p>
<h1>${esc(p.title)}</h1>
<p>${esc(p.subtitle)}</p>
<div class="buttons">
<a class="btn" href="${telegramUrl}">${esc(p.open)}</a>
<a class="btn secondary" href="https://t.me/${BOT_USERNAME}?start=website_test">${esc(p.test)}</a>
</div>
</section>
<h2>${esc(p.how)}</h2>
<div class="grid">
${p.steps.map((x,i)=>'<div class="card"><div class="step">'+(i+1)+'</div><p>'+esc(x)+'</p></div>').join("")}
</div>
<h2>Features</h2>
<div class="grid">${p.features.map(x=>'<div class="card">'+esc(x)+'</div>').join("")}</div>
<footer>
<p>Built with GPT-6.1 · <a href="${GITHUB_URL}">${esc(p.source)}</a></p>
<p>@${BOT_USERNAME}</p>
</footer>
</main></body></html>`;
}

export { BOT_USERNAME, GITHUB_URL, LANDING, landingLocale, landingHtml };
