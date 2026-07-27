import { Outlet } from 'react-router-dom';
import { FocusManager } from './FocusManager';
import { SkipToContent } from './SkipToContent';

export function AccessibilityShell() {
  return (
    <>
      <SkipToContent />
      <FocusManager />
      <Outlet />
    </>
  );
}
