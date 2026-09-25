// Кнопки действий над Markdown-версией страницы встречи (шаг 2, BBMP-260).
// Рендерятся только для страниц встреч — см. isMeetingPage в lib/meeting-markdown.ts.
// ViewOptionsPopover из fumadocs-ui сюда намеренно не идёт: он умеет отправлять
// URL страницы во внешние сервисы (ChatGPT и т.п.), что для базы знаний BBM лишнее.
import { Download } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { MarkdownCopyButton } from 'fumadocs-ui/layouts/docs/page';

export function MeetingActions({
  markdownUrl,
  fileName,
}: {
  markdownUrl: string;
  fileName: string;
}) {
  return (
    <div className="flex flex-row items-center gap-2 mb-4">
      <a
        href={markdownUrl}
        download={fileName}
        className={buttonVariants({
          color: 'secondary',
          size: 'sm',
          className: 'gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground',
        })}
      >
        <Download />
        Скачать .md
      </a>
      {/* Стили кнопки (buttonVariants secondary/sm) MarkdownCopyButton задаёт сама. */}
      <MarkdownCopyButton markdownUrl={markdownUrl}>
        Копировать текст
      </MarkdownCopyButton>
    </div>
  );
}
