import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AppProvider } from '@/lib/context';

export const metadata: Metadata = {
  title: 'Wibox Recipe Automation',
  description: 'Recipe automation and cost calculation dashboard',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
