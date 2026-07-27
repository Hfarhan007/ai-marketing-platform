import { NotificationItem } from './NotificationItem';
import type { NotificationRecord } from '../types/notification.types';
export function NotificationCenter({ items, onRead }: { items: readonly NotificationRecord[]; onRead: (id: string) => void }) { return <div className="space-y-2">{items.map((item) => <NotificationItem item={item} key={item.id} onRead={() => onRead(item.id)} />)}</div>; }
