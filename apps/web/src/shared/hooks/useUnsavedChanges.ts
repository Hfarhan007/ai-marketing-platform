import { useEventListener } from './useEventListener';
export function useUnsavedChanges(dirty: boolean, message = 'You have unsaved changes.') {
  useEventListener<BeforeUnloadEvent>('beforeunload', (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = message;
  });
}
