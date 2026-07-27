export type NotificationCategory = 'lead' | 'inbox' | 'workflow' | 'appointment' | 'billing' | 'system' | 'team-mention';
export interface NotificationRecord { category: NotificationCategory; createdAt: string; id: string; message: string; read: boolean; title: string }
