import { useCallback, useState } from 'react';
export function useDisclosure(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  return { close: useCallback(() => setOpen(false), []), open, openDisclosure: useCallback(() => setOpen(true), []), setOpen, toggle: useCallback(() => setOpen((value) => !value), []) };
}
