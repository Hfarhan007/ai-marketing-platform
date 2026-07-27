import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function FocusManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector<HTMLElement>('#main-content')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
