import { Input, Select } from '@/shared/ui';
export function TaskFilters({ onSearch, onStatus }: { onSearch: (value: string) => void; onStatus: (value: string) => void }) {
  return <div className="grid gap-3 sm:grid-cols-[1fr_12rem]"><Input aria-label="Search tasks" placeholder="Search tasks" onChange={(event) => onSearch(event.target.value)} /><Select aria-label="Filter task status" placeholder="All statuses" options={[{ label: 'To do', value: 'todo' }, { label: 'In progress', value: 'in-progress' }, { label: 'Done', value: 'done' }]} onChange={(event) => onStatus(event.target.value)} /></div>;
}
