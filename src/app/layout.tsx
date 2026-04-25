import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-mail Guru - AI-Powered Email Management',
  description: 'Intelligent email classification, smart replies, and automated inbox management using AI',
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
