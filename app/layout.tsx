import './global.css';
import { Providers } from '@/components/providers';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Orama остаётся статическим; точные синонимы ведут к рабочим инструментам. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
