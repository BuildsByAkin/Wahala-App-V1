// lib/api/store-ref.ts
// Late-binding store reference + logout action to break the circular dependency
// between the axios instance (which needs to dispatch logout on 401)
// and the Redux store (which imports axios via thunks/services).
import type { Action, Store } from '@reduxjs/toolkit';

let storeRef: Store | null = null;
let logoutActionRef: (() => Action) | null = null;

export function injectStore(store: Store): void {
  storeRef = store;
}

export function getStore(): Store | null {
  return storeRef;
}

export function injectLogoutAction(creator: () => Action): void {
  logoutActionRef = creator;
}

export function dispatchLogout(): void {
  if (storeRef && logoutActionRef) {
    storeRef.dispatch(logoutActionRef());
  }
}
