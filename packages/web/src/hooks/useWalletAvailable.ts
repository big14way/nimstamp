import { useEffect, useState } from 'react';
import { getWallet } from '../wallet';

/**
 * Nimiq Pay injects `window.nimiq` shortly after the page loads. Poll for up to 5 s
 * so the UI never assumes "no wallet" too early. Returns null while still unsure.
 */
export function useWalletAvailable(): boolean | null {
  const [state, setState] = useState<boolean | null>(() => (getWallet().isAvailable() ? true : null));
  useEffect(() => {
    if (state) return;
    const start = Date.now();
    const id = setInterval(() => {
      if (getWallet().isAvailable()) {
        setState(true);
        clearInterval(id);
      } else if (Date.now() - start > 5000) {
        setState(false);
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, [state]);
  return state;
}
