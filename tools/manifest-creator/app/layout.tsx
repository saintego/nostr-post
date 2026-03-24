import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Manifest Creator - nostr-post',
  description: 'Visual tool for creating and testing Nostr post manifests',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="wnj-config" strategy="afterInteractive">
          {`
            window.wnjParams = {
              accent: 'purple',
              compactMode: false,
              startHidden: false,
              nostrConnectRelays: [
                'wss://bucket.coracle.social',
                'wss://relay.nsec.app',
                'wss://nos.lol',
                'wss://relay.primal.net'
              ],
              appMetadata: {
                name: 'nostr-post Manifest Creator',
                url: 'https://nostr-post.dev',
              }
            };
          `}
        </Script>
        <Script
          id="window-nostr-js"
          src="https://cdn.jsdelivr.net/npm/window.nostr.js/dist/window.nostr.min.js"
          strategy="afterInteractive"
        />
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
