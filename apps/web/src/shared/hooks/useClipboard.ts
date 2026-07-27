import { useCallback, useState } from 'react';
import { useTimeout } from './useTimeout';
export function useClipboard(resetAfter = 1_500) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error>();
  useTimeout(() => setCopied(false), copied ? resetAfter : null);
  const copy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setError(undefined); return true; }
    catch (reason) { setError(reason instanceof Error ? reason : new Error('Clipboard access failed.')); return false; }
  }, []);
  return { copied, copy, error };
}
