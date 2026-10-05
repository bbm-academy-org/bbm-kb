'use client';

// Плеер записи встречи (BBMP-226): «фасад» — до клика только превью-картинка,
// сам iframe YouTube (и его трекеры) грузится после нажатия. Домен
// youtube-nocookie.com — режим без cookie до начала воспроизведения.
// Рендерится на страницах встреч под MeetingActions, если в реестре месяца
// у встречи есть видео — см. lib/meeting-video.ts.
import { useState } from 'react';
import { Play } from 'lucide-react';

export function MeetingVideo({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="mb-6">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-fd-card">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Смотреть запись встречи"
            className="group absolute inset-0 size-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-fd-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- статический экспорт, превью с CDN YouTube */}
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
              <span className="flex size-16 items-center justify-center rounded-full bg-fd-primary text-fd-primary-foreground shadow-lg transition-transform group-hover:scale-105">
                <Play className="ml-1 size-7 fill-current" />
              </span>
            </span>
          </button>
        )}
      </div>
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener"
        className="mt-2 inline-block text-xs text-fd-muted-foreground hover:text-fd-foreground"
      >
        Открыть на YouTube
      </a>
    </div>
  );
}
