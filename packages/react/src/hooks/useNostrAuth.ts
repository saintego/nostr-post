/**
 * @nostr-post/react - useNostrAuth hook
 *
 * Manages authentication state with nostr-login or NIP-07 extensions
 */

import { useCallback, useEffect, useState } from 'react';
import { getPublicKey, hasNostrSigner } from '../signer';

export interface NostrAuthState {
  pubkey: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseNostrAuthReturn extends NostrAuthState {
  login: () => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

/**
 * Hook for managing Nostr authentication
 *
 * @example
 * ```tsx
 * function App() {
 *   const { pubkey, isLoggedIn, login, logout } = useNostrAuth();
 *
 *   if (!isLoggedIn) {
 *     return <button onClick={login}>Login with Nostr</button>;
 *   }
 *
 *   return <div>Logged in as {pubkey}</div>;
 * }
 * ```
 */
export function useNostrAuth(): UseNostrAuthReturn {
  const [state, setState] = useState<NostrAuthState>({
    pubkey: null,
    isLoggedIn: false,
    isLoading: true,
    error: null,
  });

  const checkAuth = useCallback(async () => {
    if (!hasNostrSigner()) {
      setState({
        pubkey: null,
        isLoggedIn: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const pubkey = await getPublicKey();
      setState({
        pubkey,
        isLoggedIn: true,
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        pubkey: null,
        isLoggedIn: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const login = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!hasNostrSigner()) {
        throw new Error(
          'No Nostr signer available. Please install a browser extension or use nostr-login.'
        );
      }

      const pubkey = await getPublicKey();
      setState({
        pubkey,
        isLoggedIn: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      }));
    }
  }, []);

  const logout = useCallback(() => {
    setState({
      pubkey: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
    });
  }, []);

  // Listen for nostr-login events
  useEffect(() => {
    const handleAuth = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type === 'login' || detail?.type === 'signup') {
        checkAuth();
      } else if (detail?.type === 'logout') {
        logout();
      }
    };

    document.addEventListener('nlAuth', handleAuth);

    // Check initial auth state, retrying briefly for NIP-07 extension injection
    let retries = 0;
    const maxRetries = 10;
    const retryInterval = 200; // ms

    const tryCheckAuth = () => {
      if (hasNostrSigner()) {
        checkAuth();
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(tryCheckAuth, retryInterval);
      } else {
        // Give up waiting - mark as not loading
        checkAuth();
      }
    };

    tryCheckAuth();

    return () => {
      document.removeEventListener('nlAuth', handleAuth);
    };
  }, [checkAuth, logout]);

  return {
    ...state,
    login,
    logout,
    checkAuth,
  };
}
