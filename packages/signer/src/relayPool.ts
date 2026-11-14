/**
 * Shared relay connections: one WebSocket per relay, reused by every query as its own
 * subscription (`subscribe`), instead of a new connection per query. A connection opens on its
 * first subscription and closes after being idle for a while; one that fails or closes is
 * dropped, its subscriptions told (`onError`), and the next subscription opens a new one.
 */

/** What a subscription hears from its relay */
export interface SubscriptionHandlers {
  onEvent: (event: unknown) => void;
  /** The stored events were sent (NIP-01 EOSE) */
  onEose: () => void;
  /** The relay ended the subscription (NIP-01 CLOSED), with its reason */
  onClosed: (reason: string) => void;
  /** The connection failed or closed */
  onError: () => void;
}

interface Connection {
  url: string;
  ws: WebSocket;
  open: boolean;
  /** Messages sent before the connection opened */
  queue: string[];
  subs: Map<string, SubscriptionHandlers>;
  idleTimer?: ReturnType<typeof setTimeout>;
}

/** How long a connection without subscriptions stays open (ms) */
const IDLE_MS = 30_000;

// Module state: the open connections, by relay URL
const connections = new Map<string, Connection>();

const drop = (conn: Connection): void => {
  if (connections.get(conn.url) === conn) connections.delete(conn.url);
  clearTimeout(conn.idleTimer);
  const subs = [...conn.subs.values()];
  conn.subs.clear();
  for (const sub of subs) sub.onError();
  try {
    conn.ws.close();
  } catch {
    // already closed
  }
};

const send = (conn: Connection, message: string): void => {
  if (conn.open) conn.ws.send(message);
  else conn.queue.push(message);
};

const route = (conn: Connection, raw: unknown): void => {
  let data: unknown;
  try {
    data = JSON.parse(String(raw));
  } catch {
    return;
  }
  if (!Array.isArray(data) || typeof data[1] !== 'string') return;
  const sub = conn.subs.get(data[1]);
  if (!sub) return;
  if (data[0] === 'EVENT') sub.onEvent(data[2]);
  else if (data[0] === 'EOSE') sub.onEose();
  else if (data[0] === 'CLOSED') sub.onClosed(String(data[2] ?? ''));
};

const connect = (url: string): Connection => {
  const ws = new WebSocket(url);
  const conn: Connection = { url, ws, open: false, queue: [], subs: new Map() };
  ws.onopen = () => {
    conn.open = true;
    for (const message of conn.queue) ws.send(message);
    conn.queue = [];
  };
  ws.onmessage = (message) => route(conn, message.data);
  ws.onerror = () => drop(conn);
  ws.onclose = () => drop(conn);
  connections.set(url, conn);
  return conn;
};

/** Closes the connection once it has had no subscriptions for IDLE_MS */
const closeWhenIdle = (conn: Connection): void => {
  clearTimeout(conn.idleTimer);
  if (conn.subs.size > 0) return;
  conn.idleTimer = setTimeout(() => {
    if (conn.subs.size === 0) drop(conn);
  }, IDLE_MS);
  // Node: an idle connection's timer doesn't keep the process alive
  (conn.idleTimer as { unref?: () => void }).unref?.();
};

/**
 * Subscribes to `filters` on a relay over its shared connection; returns the unsubscribe, which
 * closes the subscription (NIP-01 CLOSE) and lets an idle connection close later
 */
export function subscribe(
  url: string,
  filters: unknown[],
  handlers: SubscriptionHandlers
): () => void {
  const conn = connections.get(url) ?? connect(url);
  clearTimeout(conn.idleTimer);
  const subId = Math.random().toString(36).slice(2, 12);
  conn.subs.set(subId, handlers);
  send(conn, JSON.stringify(['REQ', subId, ...filters]));
  return () => {
    if (!conn.subs.delete(subId)) return;
    if (connections.get(url) === conn) send(conn, JSON.stringify(['CLOSE', subId]));
    closeWhenIdle(conn);
  };
}

/** The relays with an open or opening connection (for tests and diagnostics) */
export const pooledRelays = (): string[] => [...connections.keys()];
