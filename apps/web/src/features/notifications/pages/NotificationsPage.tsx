import { useState } from 'react';
import { Button } from '@/shared/ui';
import { NotificationCenter } from '../components/NotificationCenter';
import type { NotificationRecord } from '../types/notification.types';
const initial: NotificationRecord[] = [{ category: 'lead', createdAt: 'Just now', id: 'n1', message: 'A lead reached a score of 85.', read: false, title: 'High-intent lead' }, { category: 'appointment', createdAt: '10 min ago', id: 'n2', message: 'A discovery call was booked for tomorrow.', read: false, title: 'Appointment booked' }];
export function NotificationsPage() { const [items, setItems] = useState(initial); const read = (id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item)); return <div className="space-y-6"><header className="flex justify-between gap-4"><div><h1 className="text-2xl font-semibold">Notifications</h1><p className="text-slate-500">{items.filter((item) => !item.read).length} unread updates</p></div><Button variant="outline" onClick={() => setItems((current) => current.map((item) => ({ ...item, read: true })))}>Mark all read</Button></header><NotificationCenter items={items} onRead={read} /></div>; }
export default NotificationsPage;
