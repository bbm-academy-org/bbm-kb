import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

// Единственная коллекция документов: нарратив в content/.
// ssot/ (канонические факты) — НЕ страницы Fumadocs; страницы
// «Команда»/«Миссия» генерируются из ssot/ на билде (задача BBMP-99+).
export const docs = defineDocs({
  dir: 'content',
  docs: {
    postprocess: {
      // Markdown-версия страниц встреч (BBMP-260): page.data.getText('processed').
      // Опции — LLMsOptions из fumadocs-core/mdx-plugins.
      includeProcessedMarkdown: {
        // Без [#id] после заголовков — они нужны для якорей в самом сайте,
        // а в скачиваемом .md только шумят.
        headingIds: false,
        // filterElement сюда сознательно НЕ передаём: в fumadocs-core 16.10.7
        // remarkLLMs строит опции для своего stringifier как
        // `{...rest, filterElement(node) {...}}` — свой filterElement (только
        // mdxjsEsm → false) объявлен ПОСЛЕ спреда и молча перекрывает любой
        // переданный нами (проверено раннер-скриптом: колбэк ни разу не
        // вызывается). MDX-комментарий `{/* Сгенерировано… */}` и `<Callout>`
        // поэтому вырезаем текстовым постпроцессингом — lib/meeting-markdown.ts.
      },
    },
  },
  // Мета-файлы навигации — только meta.json / meta.yaml. По умолчанию fumadocs-mdx
  // валидирует как мета любой *.json / *.yaml в content/, а там лежат данные:
  // реестры встреч meetings.json (читаются через fs, lib/meeting-video.ts) и YAML
  // IDEF0-модели и калькулятора content/processes/ds-content-production/ (их поле
  // `root` — строка, а у меты `root` — boolean). Навигацию fumadocs и так берёт
  // только из файлов с именем meta.
  meta: {
    files: ['**/meta.{json,yaml}'],
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      // Неизвестные языки в code-блоках не роняют билд.
      defaultLanguage: 'plaintext',
      fallbackLanguage: 'plaintext',
    },
  },
});
