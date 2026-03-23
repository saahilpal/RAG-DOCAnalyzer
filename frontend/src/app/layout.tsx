import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Document Analyzer | Chat with your documents using AI',
  description:
    'Upload a document, let AI process it, and ask focused questions in a polished chat-first workspace.',
  applicationName: 'Document Analyzer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
