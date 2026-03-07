import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-mail Guru',
  description: 'Created with MASTER Project Hub',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
