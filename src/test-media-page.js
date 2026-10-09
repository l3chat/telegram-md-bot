import { testPageMarkdown } from "./test-page.js";

const LABELS = {
  en: ["Live media test", "Test image 184273", "Test chime", "Test number video"],
  ru: ["Живой тест медиа", "Тестовая картинка 184273", "Тестовый звонок", "Тестовое видео с числами"],
  de: ["Live-Medientest", "Testbild 184273", "Test-Glockenton", "Testvideo mit Zahlen"],
  fr: ["Test média réel", "Image de test 184273", "Carillon de test", "Vidéo de test avec nombres"],
  uk: ["Живий тест медіа", "Тестове зображення 184273", "Тестовий дзвін", "Тестове відео з числами"],
};

function lang(value) {
  const code = String(value || "").toLowerCase().split(/[-_]/)[0];
  return LABELS[code] ? code : "en";
}

function mediaLink(kind, id, caption) {
  const scheme = "tg" + "://" + kind + "?id=" + id;
  return '![](' + scheme + ' "' + caption + '")';
}

function testPageWithMedia(locale) {
  const labels = LABELS[lang(locale)];
  return [
    testPageMarkdown(locale),
    "",
    "---",
    "",
    "## " + labels[0],
    "",
    mediaLink("photo", "test_photo", labels[1]),
    "",
    mediaLink("audio", "test_audio", labels[2]),
    "",
    mediaLink("video", "test_video", labels[3]),
  ].join("\n");
}

export { LABELS, testPageWithMedia };
