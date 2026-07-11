import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

// Единственная коллекция документов: нарратив в content/.
// ssot/ (канонические факты) — НЕ страницы Fumadocs; страницы
// «Команда»/«Миссия» генерируются из ssot/ на билде (задача BBMP-99+).
export const docs = defineDocs({
  dir: 'content',
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
