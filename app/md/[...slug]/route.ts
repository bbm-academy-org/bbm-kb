import { source } from '@/lib/source';
import { getMeetingMarkdown, isMeetingPage } from '@/lib/meeting-markdown';
import { notFound } from 'next/navigation';

// Статический экспорт (output: 'export'): как и в app/api/search/route.ts,
// маршрут не пересчитывается рантаймом — только на билде.
export const dynamic = 'force-static';
export const revalidate = false;

export async function generateStaticParams() {
  return source
    .getPages()
    .filter(isMeetingPage)
    .map((page) => {
      const slugs = page.slugs.slice();
      slugs[slugs.length - 1] = `${slugs[slugs.length - 1]}.md`;
      return { slug: slugs };
    });
}

export async function GET(
  _req: Request,
  props: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await props.params;
  if (slug.length === 0) notFound();

  // Последний сегмент пути пришёл с `.md` (см. generateStaticParams) —
  // отрезаем его, чтобы получить исходный slug страницы для source.getPage.
  const last = slug[slug.length - 1];
  if (!last.endsWith('.md')) notFound();

  const pageSlug = [...slug.slice(0, -1), last.slice(0, -'.md'.length)];
  const page = source.getPage(pageSlug);
  if (!page || !isMeetingPage(page)) notFound();

  const text = await getMeetingMarkdown(page);

  return new Response(text, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
