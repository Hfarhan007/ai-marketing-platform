import { Badge, Table } from '@/shared/ui';
import { ConsentNotice } from '../components/ConsentNotice';
const records = [{ channel: 'Email', contact: 'Nora Reed', id: 'c1', status: 'granted', updatedAt: 'Jul 21, 2026' }, { channel: 'SMS', contact: 'Samir Khan', id: 'c2', status: 'withdrawn', updatedAt: 'Jul 20, 2026' }] as const;
export function ConsentPage() { return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Consent management</h1><p className="text-slate-500">Track communication preferences and consent history.</p></div><ConsentNotice /><Table columns={[{ key: 'contact', header: 'Contact', render: (record) => record.contact }, { key: 'channel', header: 'Channel', render: (record) => record.channel }, { key: 'status', header: 'Status', render: (record) => <Badge>{record.status}</Badge> }, { key: 'updated', header: 'Updated', render: (record) => record.updatedAt }]} getRowKey={(record) => record.id} rows={records} /></div>; }
export default ConsentPage;
