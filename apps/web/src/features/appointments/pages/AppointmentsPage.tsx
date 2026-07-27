import { Button } from '@/shared/ui';
import { AppointmentList } from '../components/AppointmentList';
import type { Appointment } from '../types/appointment.types';
const appointments: Appointment[] = [{ id: 'a1', location: 'Google Meet', notes: 'Discovery', service: 'Strategy call', staff: 'Amina Yusuf', startsAt: 'Jul 25, 10:00 AM', status: 'scheduled' }, { id: 'a2', location: 'Karachi office', notes: 'Quarterly review', service: 'Account review', staff: 'Omar Ali', startsAt: 'Jul 26, 2:30 PM', status: 'scheduled' }];
export function AppointmentsPage() { return <div className="space-y-6"><header className="flex justify-between gap-3"><div><h1 className="text-2xl font-semibold">Appointments</h1><p className="text-slate-500">Manage appointment records separately from calendar scheduling.</p></div><Button>New appointment</Button></header><AppointmentList appointments={appointments} /></div>; }
export default AppointmentsPage;
