import { createContext, useContext } from 'react';
export const LiveRegionContext = createContext<(message: string) => void>(() => undefined);
export const useAnnouncement = () => useContext(LiveRegionContext);
