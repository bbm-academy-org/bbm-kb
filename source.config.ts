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
