import {
  PAGES,
  testPageLocale,
  testPageMarkdown,
} from "./test-page.js";

const LABELS = {
  en: {
    photo: "Live image test — 184273",
    audio: "Live audio test — ding-dong",
    video: "Live video test — number transition",
  },
  ru: {
    photo: "Живой тест изображения — 184273",
    audio: "Живой тест аудио — динь-дон",
    video: "Живой тест видео — смена чисел",
  },
  de: {
    photo: "Live-Bildtest — 184273",
    audio: "Live-Audiotest — Ding-Dong",
    video: "Live-Videotest — Zahlenwechsel",
  },
  fr: {
    photo: "Test réel d’image — 184273",
    audio: "Test audio réel — ding-dong",
    video: "Test vidéo réel — transition de nombres",
  },
  uk: {
    photo: "Живий тест зображення — 184273",
    audio: "Живий тест аудіо — дінь-дон",
    video: "Живий тест відео — зміна чисел",
  },
};

function mediaLink(kind, id, caption) {
  const scheme = "tg" + "://" + kind + "?id=" + id;
  return '![](' + scheme + ' "' + caption + '")';
}

function insertBefore(markdown, marker, block) {
  const index = markdown.indexOf(marker);
  if (index < 0) return markdown + "\n\n" + block;
  return markdown.slice(0, index) + block + "\n\n" + markdown.slice(index);
}

function testPageWithMedia(locale) {
  const lang = testPageLocale(locale);
  const p = PAGES[lang];
  const labels = LABELS[lang];
  let page = testPageMarkdown(lang);

  page = insertBefore(
    page,
    "## 3. " + p.quote,
    [
      "### " + labels.photo,
      "",
      mediaLink("photo", "test_photo", labels.photo),
    ].join("\n")
  );

  page = insertBefore(
    page,
    "## 6. " + p.math,
    [
      "### " + labels.audio,
      "",
      mediaLink("audio", "test_audio", labels.audio),
    ].join("\n")
  );

  page = insertBefore(
    page,
    "## 8. " + p.media,
    [
      "### " + labels.video,
      "",
      mediaLink("video", "test_video", labels.video),
    ].join("\n")
  );

  return page;
}

export { LABELS, testPageWithMedia };
