import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Статический экспорт: сайт = набор файлов в out/, раздаётся
  // reverse-proxy на tools-prod-tw (спека bbm-kb-design §6).
  output: 'export',
};

export default withMDX(config);
