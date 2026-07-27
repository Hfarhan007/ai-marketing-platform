import { useState } from 'react';
import { Switch } from '@/shared/ui';
export function NotificationPreferences() { const [checked, setChecked] = useState(true); return <section className="rounded-xl border p-4 dark:border-slate-700"><h2 className="font-semibold">Preferences</h2><div className="mt-3"><Switch checked={checked} label="Email digests" onCheckedChange={setChecked} /></div></section>; }
