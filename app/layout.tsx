import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ClerkProvider } from '@clerk/nextjs';
import { AppProvider } from '@/lib/context';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Wibox Recipe Automation',
  description: 'Recipe automation and cost calculation dashboard',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body suppressHydrationWarning>
          <I18nProvider>
            <AppProvider>
              {children}
            </AppProvider>
          </I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
