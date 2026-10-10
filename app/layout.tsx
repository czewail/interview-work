import type { Metadata } from 'next';
import { Suspense } from 'react';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './globals.css';
import { Provider } from '@/components/store';
import { Shell } from '@/components/shell';
export const metadata: Metadata = {
  title: 'Form — Technology, considered.',
  description:
    'Explore considered electronics for your everyday. An English / USD demo store. No real payments or shipments.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Provider>
          <Suspense fallback={<div className="loading">Loading store…</div>}>
            <Shell>{children}</Shell>
          </Suspense>
        </Provider>
      </body>
    </html>
  );
}
