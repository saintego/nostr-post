'use client';

import { useNostrAuth } from '@nostr-post/react';
import '@nostr-post/web'; // Import web components

// TypeScript declarations for web components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-post-composer': any;
      'nostr-post-feed': any;
    }
  }
}

const styles = {
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 24,
  },
  loginBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#6366f1',
    color: 'white',
    cursor: 'pointer',
    fontSize: 14,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  pubkey: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'monospace',
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
};

export default function Home() {
  const { pubkey, isLoggedIn, isLoading, login, logout } = useNostrAuth();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚀 NostrPost Web Components (in Next.js)</h1>
        {isLoading ? (
          <span>Loading...</span>
        ) : isLoggedIn ? (
          <div style={styles.userInfo}>
            <span style={styles.pubkey}>{pubkey?.slice(0, 12)}...</span>
            <button style={styles.loginBtn} onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <button style={styles.loginBtn} onClick={login}>
            Login with Nostr
          </button>
        )}
      </header>

      {/* Composer - works without manifest for simple Kind 1 notes */}
      <div style={{ marginBottom: '40px' }}>
        <nostr-post-composer
          auto-publish
          onPublished={(e: any) => {
            console.log('Published events:', e.detail);
            alert(`Published ${e.detail.length} event(s)!`);
          }}
          onError={(e: any) => {
            console.error('Error:', e.detail);
            alert(`Error: ${e.detail.message}`);
          }}
        />
      </div>

      {/* Feed - shows user's posts */}
      {pubkey && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Posts</h2>
          <nostr-post-feed authors={`["${pubkey}"]`} kinds="[1]" limit="10" />
        </div>
      )}
    </div>
  );
}
