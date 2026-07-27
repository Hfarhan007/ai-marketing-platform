import { Alert, Button } from '@/shared/ui';
import { PrivacyRequestList } from '../components/PrivacyRequestList';
const requests = [{ id: 'r1', requestedAt: 'Jul 20, 2026', requester: 'nora@example.com', status: 'processing', type: 'export' }, { id: 'r2', requestedAt: 'Jul 18, 2026', requester: 'samir@example.com', status: 'received', type: 'deletion' }] as const;
export function CompliancePage() { return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Compliance operations</h1><p className="text-slate-500">Privacy requests, retention settings, cookies, and audit history.</p></div><Button variant="danger">Review deletion requests</Button></header><Alert title="Human review required">Destructive requests require explicit confirmation and an authorized backend workflow.</Alert><PrivacyRequestList requests={requests} /></div>; }
export default CompliancePage;
