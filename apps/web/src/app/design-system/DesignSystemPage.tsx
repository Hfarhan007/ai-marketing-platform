import { MoreHorizontal, Plus, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import {
  Accordion,
  Alert,
  AlertDialog,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Calendar,
  ChartCard,
  Checkbox,
  CodeEditor,
  ColorPicker,
  Combobox,
  CommandMenu,
  DataGrid,
  DatePicker,
  Drawer,
  Dropzone,
  Dropdown,
  EmptyState,
  ErrorState,
  Input,
  FileUpload,
  HelpTooltip,
  IconPicker,
  InfiniteScroll,
  JsonEditor,
  KeyboardKey,
  LoadingOverlay,
  MetricCard,
  Modal,
  MultiSelect,
  NetworkStatus,
  Pagination,
  Popover,
  Progress,
  Radio,
  Select,
  ScrollArea,
  SearchableSelect,
  ShareDialog,
  Skeleton,
  StatusDot,
  Spinner,
  Stepper,
  Switch,
  Table,
  Tabs,
  Textarea,
  Timeline,
  Toast,
  Tooltip,
  VirtualizedList,
  CurrencyInput,
  PhoneInput,
  MarkdownEditor,
  ResizablePanels,
  CopyButton,
} from '@/shared/ui';

interface Person {
  email: string;
  id: string;
  name: string;
  score: number;
}

const people: readonly Person[] = [
  { email: 'alex@example.com', id: '1', name: 'Alex Morgan', score: 92 },
  { email: 'sam@example.com', id: '2', name: 'Sam Rivera', score: 84 },
  { email: 'lee@example.com', id: '3', name: 'Lee Chen', score: 76 },
];

const columns = [
  { header: 'Name', key: 'name', render: (person: Person) => person.name, sortValue: (person: Person) => person.name },
  { header: 'Email', key: 'email', render: (person: Person) => person.email },
  { align: 'right' as const, header: 'Score', key: 'score', render: (person: Person) => person.score, sortValue: (person: Person) => person.score },
];

const chartData = [
  { name: 'Mon', value: 18 }, { name: 'Tue', value: 26 }, { name: 'Wed', value: 21 },
  { name: 'Thu', value: 34 }, { name: 'Fri', value: 42 }, { name: 'Sat', value: 38 },
];

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-5 text-lg font-semibold">{title}</h2>{children}</section>;
}

export function DesignSystemPage() {
  const [checked, setChecked] = useState(true);
  const [switchOn, setSwitchOn] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(3);
  const [date, setDate] = useState(new Date());
  const [step, setStep] = useState(1);
  const [overlay, setOverlay] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [channels, setChannels] = useState<string[]>(['Email']);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: 'Design system' }]} />
        <header className="my-8"><Badge tone="primary">Internal preview</Badge><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Reusable design system</h1><p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">A responsive inventory of generic interface primitives for the web application.</p></header>

        <div className="grid gap-6">
          <Section title="Buttons and indicators">
            <div className="flex flex-wrap items-center gap-3">
              <Button><Plus size={16} />Primary</Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button loading>Loading</Button><Button disabled>Disabled</Button>
              <Badge>Neutral</Badge><Badge tone="success">Success</Badge><Badge tone="warning">Warning</Badge><Badge tone="danger">Danger</Badge>
              <StatusDot label="Online" pulse status="success" /><StatusDot label="Pending" status="warning" />
            </div>
          </Section>

          <Section title="Form controls">
            <div className="grid gap-5 md:grid-cols-2">
              <Input label="Email address" placeholder="name@example.com" type="email" />
              <Select label="Workspace" options={[{ label: 'North star', value: 'north' }, { label: 'Launchpad', value: 'launch' }]} placeholder="Choose a workspace" />
              <Textarea className="md:col-span-2" label="Description" placeholder="Write a short description…" />
              <div className="grid gap-3"><Checkbox checked={checked} description="Receive relevant product updates." label="Email notifications" onChange={(event) => setChecked(event.target.checked)} /><Checkbox disabled label="Unavailable option" /></div>
              <div className="grid gap-3"><Radio defaultChecked label="Monthly billing" name="billing" /><Radio label="Annual billing" name="billing" /><Switch checked={switchOn} label="Enable notifications" onCheckedChange={setSwitchOn} /></div>
            </div>
          </Section>

          <Section title="Avatars, tooltips, popovers, and menus">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar alt="Alex Morgan" /><Avatar alt="Sam Rivera" fallback="SR" size="lg" />
              <Tooltip content="Helpful supporting information"><Button variant="outline">Hover or focus</Button></Tooltip>
              <Popover content={<p className="text-sm text-slate-600 dark:text-slate-300">Popover content can contain any accessible controls.</p>} label="Information"><Button variant="outline">Open popover</Button></Popover>
              <Dropdown items={[{ label: 'Rename', onSelect: () => undefined }, { label: 'Duplicate', onSelect: () => undefined }, { danger: true, label: 'Delete', onSelect: () => undefined }]} label="Actions" trigger={<Button aria-label="More actions" variant="outline"><MoreHorizontal size={18} /></Button>} />
            </div>
          </Section>

          <Section title="Modal and drawer">
            <div className="flex flex-wrap gap-3"><Button onClick={() => setModalOpen(true)}>Open modal</Button><Button onClick={() => setDrawerOpen(true)} variant="outline">Open drawer</Button></div>
            <Modal description="A generic accessible dialog foundation." onClose={() => setModalOpen(false)} open={modalOpen} title="Example modal"><p className="text-sm text-slate-600 dark:text-slate-300">Modal content stays focused and closes with Escape.</p><div className="mt-5 flex justify-end"><Button onClick={() => setModalOpen(false)}>Done</Button></div></Modal>
            <Drawer onClose={() => setDrawerOpen(false)} open={drawerOpen} title="Example drawer"><p className="text-sm text-slate-600 dark:text-slate-300">Use drawers for supporting tasks and contextual details.</p></Drawer>
          </Section>

          <Section title="Tabs and accordion">
            <Tabs items={[{ content: <p>Overview content</p>, label: 'Overview', value: 'overview' }, { content: <p>Activity content</p>, label: 'Activity', value: 'activity' }, { content: <p>Disabled content</p>, disabled: true, label: 'Disabled', value: 'disabled' }]} />
            <div className="mt-6"><Accordion defaultOpen={['one']} items={[{ content: 'The accordion supports one or multiple open panels.', id: 'one', title: 'How does it work?' }, { content: 'Disabled and keyboard-focus states are included.', id: 'two', title: 'Is it accessible?' }]} /></div>
          </Section>

          <Section title="Tables and data grid">
            <Table caption="People table" columns={columns} getRowKey={(person) => person.id} rows={people} />
            <div className="mt-6"><DataGrid columns={columns} getRowKey={(person) => person.id} rows={people} /></div>
            <div className="mt-5"><Pagination onPageChange={setPage} page={page} totalPages={8} /></div>
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Calendar and date picker"><div className="grid items-start gap-5 sm:grid-cols-2"><Calendar onChange={setDate} value={date} /><DatePicker onChange={setDate} value={date} /></div></Section>
            <Section title="Command menu"><CommandMenu items={[{ id: 'new', label: 'Create new document', onSelect: () => undefined, shortcut: '⌘N' }, { id: 'search', keywords: ['find'], label: 'Search everything', onSelect: () => undefined, shortcut: '⌘K' }, { disabled: true, id: 'locked', label: 'Unavailable command', onSelect: () => undefined }]} /></Section>
          </div>

          <Section title="Progress and timeline">
            <Stepper currentStep={step} items={[{ label: 'Details' }, { label: 'Review' }, { label: 'Complete' }]} onStepChange={setStep} />
            <div className="mt-8"><Timeline items={[{ content: 'The initial draft was created.', date: '09:30', id: '1', title: 'Created' }, { content: 'Changes were reviewed and approved.', date: '11:45', id: '2', title: 'Reviewed' }, { date: '14:10', id: '3', title: 'Published' }]} /></div>
          </Section>

          <Section title="Metrics and charts">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><MetricCard change={12.4} description="from last period" icon={<TrendingUp size={20} />} label="Total value" value="$48,290" /><MetricCard change={-2.1} label="Conversion" value="18.6%" /><MetricCard label="Loading metric" loading value="—" /></div>
            <div className="mt-6"><ChartCard description="Responsive example using Recharts." title="Weekly trend"><ResponsiveContainer height={240} width="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><RechartsTooltip /><Line dataKey="value" stroke="#6366f1" strokeWidth={2} type="monotone" /></LineChart></ResponsiveContainer></ChartCard></div>
          </Section>

          <Section title="Loading, empty, and error states">
            <div className="grid gap-5 lg:grid-cols-3"><div className="space-y-3 rounded-xl border border-slate-200 p-5 dark:border-slate-700"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div><EmptyState action={<Button size="sm">Create item</Button>} description="Create the first item to get started." title="Nothing here yet" /><ErrorState onRetry={() => undefined} /></div>
            <div className="mt-5"><LoadingOverlay label="Saving changes" loading={overlay}><div className="rounded-xl border border-slate-200 p-6 dark:border-slate-700"><p className="mb-4">Overlay content remains in place while work is in progress.</p><Button onClick={() => { setOverlay(true); window.setTimeout(() => setOverlay(false), 1000); }} variant="outline">Preview loading overlay</Button></div></LoadingOverlay></div>
          </Section>

          <Section title="Feedback and progress states">
            <div className="grid gap-4 md:grid-cols-2"><Alert title="Information">Use alerts for durable, contextual guidance.</Alert><Alert title="Action required" variant="warning">Review this configuration before publishing.</Alert><Toast onDismiss={() => undefined} variant="success">Changes saved successfully.</Toast><div className="space-y-4"><Progress label="Import progress" value={68} /><Progress indeterminate label="Processing" /><div className="flex items-center gap-3"><Spinner /><NetworkStatus /><KeyboardKey>Ctrl K</KeyboardKey><HelpTooltip>Keyboard accessible controls</HelpTooltip></div></div></div>
            <div className="mt-5 flex gap-3"><Button onClick={() => setAlertOpen(true)} variant="danger">Open alert dialog</Button><Button onClick={() => setShareOpen(true)} variant="outline">Share</Button><CopyButton text="https://example.com" /></div>
            <AlertDialog description="This action demonstrates a focused confirmation flow." onClose={() => setAlertOpen(false)} onConfirm={() => setAlertOpen(false)} open={alertOpen} title="Confirm action" />
            <ShareDialog onClose={() => setShareOpen(false)} open={shareOpen} url="https://example.com/design-system" />
          </Section>

          <Section title="Advanced form and upload controls">
            <div className="grid gap-5 md:grid-cols-2"><PhoneInput label="Phone number" placeholder="+92 300 0000000" /><CurrencyInput currency="USD" placeholder="0.00" /><Combobox label="Country" options={['Pakistan', 'United Kingdom', 'United States']} placeholder="Choose a country" /><SearchableSelect label="Search workspace" options={['Northstar', 'Launchpad']} /><ColorPicker defaultValue="#4f46e5" /><IconPicker icons={['★', '●', '◆']} onChange={() => undefined} value="★" /><MultiSelect label="Channels" onChange={setChannels} options={['Email', 'SMS', 'WhatsApp']} value={channels} /><FileUpload allowedMimeTypes={['image/*']} onFiles={() => undefined} /></div>
            <div className="mt-5"><Dropzone allowedMimeTypes={['image/*', 'application/pdf']} maxBytes={5_000_000} onFiles={() => undefined} /></div>
          </Section>

          <Section title="Editors and resizable content">
            <div className="grid gap-5 lg:grid-cols-3"><CodeEditor defaultValue="const ready = true;" /><JsonEditor defaultValue='{"status":"ready"}' /><MarkdownEditor defaultValue="## Accessible content" /></div>
            <div className="mt-6 h-56 rounded-xl border border-slate-200 dark:border-slate-700"><ResizablePanels primary={<ScrollArea className="h-full p-4"><p>Resizable primary panel</p></ScrollArea>} secondary={<ScrollArea className="h-full p-4"><p>Resizable secondary panel</p></ScrollArea>} /></div>
          </Section>

          <Section title="Virtualized, infinite, and responsive examples">
            <div className="grid gap-6 lg:grid-cols-2"><VirtualizedList estimateSize={40} height={200} items={Array.from({ length: 100 }, (_, index) => `Virtual item ${index + 1}`)} renderItem={(item) => <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">{item}</div>} /><InfiniteScroll hasMore loading={false} onLoadMore={() => undefined}><div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">Accessible load-more fallback</div></InfiniteScroll></div>
            <div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-xl border p-4 dark:border-slate-700"><p className="text-sm font-semibold">Mobile</p><p className="mt-2 text-sm text-slate-500">Controls retain touch-sized targets and horizontal overflow safety.</p></div><div className="rounded-xl border p-4 dark:border-slate-700 dark:bg-slate-950"><p className="text-sm font-semibold">Dark mode</p><p className="mt-2 text-sm text-slate-400">Every primitive uses shared dark color states.</p></div><div className="rounded-xl border p-4 text-right dark:border-slate-700" dir="rtl"><p className="text-sm font-semibold">مثال من اليمين إلى اليسار</p><div className="mt-3"><Input label="الاسم" placeholder="أدخل الاسم" /></div></div></div>
          </Section>
        </div>
      </div>
    </main>
  );
}
