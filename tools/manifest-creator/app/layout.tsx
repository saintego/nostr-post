import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manifest Creator - nostr-post',
  description: 'Visual tool for creating and testing Nostr post manifests',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://unpkg.com/nostr-login@latest/dist/unpkg.js" />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f9fafb',
          color: '#111827',
        }}
      >
        {children}
      </body>
    </html>
  );
}
