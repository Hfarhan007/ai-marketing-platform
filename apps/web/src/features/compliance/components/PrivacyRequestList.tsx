import { Badge } from '@/shared/ui';
import type { PrivacyRequest } from '../types/compliance.types';
export function PrivacyRequestList({ requests }: { requests: readonly PrivacyRequest[] }) { return <div className="space-y-3">{requests.map((request) => <article className="flex flex-wrap justify-between gap-3 rounded-xl border p-4 dark:border-slate-700" key={request.id}><div><h2 className="font-medium capitalize">{request.type} request</h2><p className="text-sm text-slate-500">{request.requester} · {request.requestedAt}</p></div><Badge>{request.status}</Badge></article>)}</div>; }
