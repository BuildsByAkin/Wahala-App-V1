// lib/api/store-ref.ts
// Late-binding store reference to break the circular dependency
// between the axios instance (which needs to dispatch logout on 401)
// and the Redux store (which imports axios via thunks/services).
import type { Store } from '@reduxjs/toolkit';

let storeRef: Store | null = null;

export function injectStore(store: Store): void {
  storeRef = store;
}

export function getStore(): Store | null {
  return storeRef;
}
