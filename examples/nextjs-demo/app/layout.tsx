import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NostrPost Next.js Demo',
  description: 'Demo of nostr-post React components with Next.js App Router',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://unpkg.com/nostr-login@latest/dist/unpkg.js"></script>
      </head>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>{children}</body>
    </html>
  );
}
