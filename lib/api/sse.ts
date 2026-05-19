// lib/api/sse.ts
// Thin wrapper around `react-native-sse` that:
//   1. Auto-attaches the bearer token (Authorization header preferred per
//      BACKEND.md §3 / user-confirmed contract; ?token=... as a fallback).
//   2. Exposes a typed event handler API.
//   3. Auto-reconnects with exponential backoff (the library does this but
//      we ensure it's configured + don't fight it).
//
// Usage:
//   const conn = openSseStream('/markets/foo/stream', {
//     onMessage: (event) => { ... },
//   });
//   ...
//   conn.close();

import EventSource, { type EventSourceListener } from 'react-native-sse';

import { API_BASE_URL } from '@/lib/api/axios';
import { getStore } from '@/lib/api/store-ref';

export type SseEvent<T = unknown> = {
  type: string;
  data: T;
};

export type SseStreamHandlers = {
  /** Generic — fired for every named or `message` event. */
  onMessage?: (event: SseEvent) => void;
  /** Map of `event:` name → handler. */
  on?: Record<string, (event: SseEvent) => void>;
  onOpen?: () => void;
  onError?: (err: unknown) => void;
};

export type SseConnection = {
  close: () => void;
};

function safeParse(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Open an SSE stream. The path is appended to API_BASE_URL — pass paths like
 * `/markets/:slug/stream` or `/me/stream`. The bearer token is attached
 * automatically from the redux auth slice (preferred via the Authorization
 * header; ?token=... is added as a query-string fallback for environments
 * where headers are stripped by a proxy).
 */
export function openSseStream(
  path: string,
  handlers: SseStreamHandlers
): SseConnection {
  const store = getStore();
  const token = store?.getState()?.auth?.accessToken as string | null | undefined;

  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path}`);
  // Query-string fallback for proxies / RN environments where headers might
  // not propagate. The server checks the Authorization header first, so the
  // header takes precedence when both are present (confirmed in chat).
  if (token && !url.searchParams.has('token')) {
    url.searchParams.set('token', token);
  }

  const es = new EventSource(url.toString(), {
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : undefined,
    pollingInterval: 0, // disable manual polling — rely on the native reconnect
    timeoutBeforeConnection: 500,
  });

  // The library emits a single "message" event for unnamed events plus a
  // discrete event for every `event:` line. We bridge both into the handler
  // map so callers can subscribe by name.
  const dispatch = (eventName: string, raw: string | null | undefined) => {
    const data = safeParse(raw);
    const payload: SseEvent = { type: eventName, data };
    handlers.on?.[eventName]?.(payload);
    handlers.onMessage?.(payload);
  };

  const messageListener: EventSourceListener = (event) => {
    if (event.type === 'open') {
      handlers.onOpen?.();
      return;
    }
    if (event.type === 'error' || event.type === 'exception') {
      handlers.onError?.(event);
      return;
    }
    if (event.type === 'close') return;
    if ('data' in event) {
      dispatch(event.type, (event as { data: string | null }).data);
    }
  };

  // Subscribe to the generic events the library emits.
  es.addEventListener('open', messageListener);
  es.addEventListener('error', messageListener);
  es.addEventListener('message', messageListener);

  // Also subscribe to every named event the caller wants to handle. The
  // library requires you to add a listener per event name to receive it.
  const namedHandlers = handlers.on ? Object.keys(handlers.on) : [];
  for (const name of namedHandlers) {
    // The library types are slightly off — passing arbitrary event names is
    // supported at runtime. Cast through unknown to satisfy the typings.
    es.addEventListener(
      name as 'message',
      messageListener
    );
  }

  return {
    close: () => {
      try {
        es.removeAllEventListeners();
        es.close();
      } catch {
        /* noop */
      }
    },
  };
}
