import {
  AlertCircle,
  CheckCircle2,
  HeartPulse,
  KeyRound,
  Link2,
  RefreshCw,
  Search,
  Share2 as Facebook,
  Unplug,
  Webhook,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Checkbox, Input, Modal, Select, Stepper, Tabs } from '@/shared/ui';
import { providerErrorMessage } from '@/shared/lib';
import { useIntegrationActions, useIntegrationConnections } from '../hooks/use-integrations';
import type {
  IntegrationConnection,
  IntegrationDisplayState,
  IntegrationProvider,
  IntegrationResource,
  SelectedIntegrationResources,
} from '../types/integration.types';

const setupSteps = [
  'Connect Meta',
  'Facebook Page',
  'Ad Account',
  'Instagram',
  'Lead Forms',
  'Webhooks',
  'Health',
];
const emptySelection: SelectedIntegrationResources = {
  pageIds: [],
  adAccountIds: [],
  instagramAccountIds: [],
  formIds: [],
};
const statusCopy: Record<IntegrationDisplayState, string> = {
  not_connected: 'Not connected',
  connecting: 'Connecting',
  connected: 'Connected',
  needs_attention: 'Needs attention',
  error: 'Error',
  reauthorize: 'Reauthorize',
  disconnected: 'Disconnected',
};

function displayState(
  connection?: IntegrationConnection,
  working = false,
): IntegrationDisplayState {
  if (working) return 'connecting';
  if (!connection) return 'not_connected';
  if (connection.status === 'disabled') return 'disconnected';
  if (connection.lastErrorCode?.toLowerCase().includes('token')) return 'reauthorize';
  if (
    connection.status === 'needs_attention' ||
    connection.publicMetadata.subscription?.status === 'error'
  )
    return 'needs_attention';
  if (connection.status === 'error') return 'error';
  if (connection.status === 'pending') return 'connecting';
  return 'connected';
}
function tone(state: IntegrationDisplayState): 'success' | 'warning' | 'danger' | 'neutral' {
  if (state === 'connected') return 'success';
  if (state === 'error' || state === 'reauthorize') return 'danger';
  if (state === 'needs_attention' || state === 'connecting') return 'warning';
  return 'neutral';
}
function resourceName(connection: IntegrationConnection | undefined, type: string) {
  return connection?.publicMetadata.selectedResources?.find((resource) => resource.type === type)
    ?.name;
}
function formatDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Never';
}

function IntegrationDetails({ connection }: { connection: IntegrationConnection | undefined }) {
  const subscription = connection?.publicMetadata.subscription;
  const rows = [
    [
      'Connected account',
      resourceName(connection, 'identity') ?? connection?.publicMetadata.accountName,
    ],
    ['Selected Page', resourceName(connection, 'page')],
    ['Selected Ad Account', resourceName(connection, 'ad_account')],
    [
      'Lead forms',
      connection?.publicMetadata.selectedResources
        ?.filter(({ type }) => type === 'lead_form')
        .map(({ name }) => name)
        .join(', '),
    ],
    ['Webhook', subscription?.status],
    [
      'Issue',
      connection?.lastErrorCode
        ? providerErrorMessage({
            code: connection.lastErrorCode,
            message: connection.lastFailureMessage ?? connection.lastErrorCode,
          })
        : undefined,
    ],
    ['Last synchronization', formatDate(connection?.lastSyncAt)],
    ['Health checked', formatDate(connection?.lastValidatedAt)],
  ];
  return (
    <dl className="mt-4 grid gap-2 text-sm">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div className="flex justify-between gap-4" key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="truncate text-right font-medium capitalize">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function IntegrationCard({
  connection,
  description,
  icon: Icon,
  name,
  onConfigure,
  onDisconnect,
  onHealth,
  working,
}: {
  connection: IntegrationConnection | undefined;
  description: string;
  icon: LucideIcon;
  name: string;
  onConfigure: () => void;
  onDisconnect: () => void;
  onHealth: () => void;
  working: boolean;
}) {
  const state = displayState(connection, working),
    connected = state === 'connected' || state === 'needs_attention';
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Icon size={20} />
          </span>
          <div>
            <h2 className="font-semibold">{name}</h2>
            <Badge tone={tone(state)}>{statusCopy[state]}</Badge>
          </div>
        </div>
        {connected ? (
          <CheckCircle2 className="text-emerald-500" size={19} />
        ) : state === 'error' ? (
          <AlertCircle className="text-red-500" size={19} />
        ) : null}
      </div>
      <p className="mt-4 min-h-10 text-sm text-slate-500">{description}</p>
      <IntegrationDetails connection={connection} />
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          loading={working}
          onClick={onConfigure}
          size="sm"
          variant={connection ? 'outline' : 'primary'}
        >
          {connection ? (
            <>
              <RefreshCw size={14} />
              Configure
            </>
          ) : (
            <>
              <Link2 size={14} />
              Connect
            </>
          )}
        </Button>
        {connection ? (
          <>
            <Button onClick={onHealth} size="sm" variant="ghost">
              <HeartPulse size={14} />
              Check health
            </Button>
            <Button onClick={onDisconnect} size="sm" variant="ghost">
              <Unplug size={14} />
              Disconnect
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}

export function IntegrationsPage() {
  const connections = useIntegrationConnections(),
    actions = useIntegrationActions();
  const [search, setSearch] = useState(''),
    [flow, setFlow] = useState<'meta' | 'highlevel' | null>(null),
    [connectionId, setConnectionId] = useState<string | null>(null),
    [step, setStep] = useState(0),
    [resources, setResources] = useState<IntegrationResource[]>([]),
    [selection, setSelection] = useState<SelectedIntegrationResources>(emptySelection),
    [message, setMessage] = useState<string | null>(null),
    [keys, setKeys] = useState(['amp_live_••••••••c82f']);
  const meta = connections.data?.find(
      ({ provider }) => provider === 'facebook' || provider === 'instagram',
    ),
    highlevel = connections.data?.find(({ provider }) => provider === 'highlevel');
  const busy =
    actions.create.isPending ||
    actions.beginOAuth.isPending ||
    actions.completeOAuth.isPending ||
    actions.resources.isPending ||
    actions.select.isPending ||
    actions.subscribe.isPending ||
    actions.health.isPending;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search),
      code = params.get('code'),
      state = params.get('state');
    if (!code || !state) return;
    void Promise.resolve().then(() => {
      setFlow(
        (sessionStorage.getItem('integration-oauth-provider') as 'meta' | 'highlevel' | null) ??
          'meta',
      );
      setStep(1);
      return actions.completeOAuth.mutateAsync({ code, state });
    })
      .then(async ({ connectionId: id }) => {
        setConnectionId(id);
        const found = await actions.resources.mutateAsync(id);
        setResources(found);
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch((error: unknown) => setMessage(providerErrorMessage(error)));
  }, []);
  const authorize = async (
    provider: IntegrationProvider,
    name: string,
    kind: 'meta' | 'highlevel',
  ) => {
    const current = kind === 'meta' ? meta : highlevel,
      connection = current ?? (await actions.create.mutateAsync({ provider, name }));
    setConnectionId(connection.id);
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    sessionStorage.setItem('integration-oauth-provider', kind);
    const oauth = await actions.beginOAuth.mutateAsync({ id: connection.id, redirectUri });
    window.location.assign(oauth.authorizationUrl);
  };
  const start = async (provider: IntegrationProvider, name: string, kind: 'meta' | 'highlevel') => {
    setMessage(null);
    setFlow(kind);
    const current = kind === 'meta' ? meta : highlevel;
    try {
      if (!current || step === 0) {
        await authorize(provider, name, kind);
        return;
      }
      setConnectionId(current.id);
      setResources(await actions.resources.mutateAsync(current.id));
      setStep(1);
    } catch (error) {
      setMessage(providerErrorMessage(error));
      setStep(0);
    }
  };
  const saveStep = async () => {
    if (!connectionId) return;
    try {
      if (step >= 1 && step <= 4) {
        await actions.select.mutateAsync({ id: connectionId, selection });
        setStep(step + 1);
        return;
      }
      if (step === 5) {
        await actions.subscribe.mutateAsync(connectionId);
        setStep(6);
        return;
      }
      if (step === 6) {
        const health = await actions.health.mutateAsync(connectionId);
        setMessage(
          health.healthy
            ? 'Connection is healthy.'
            : providerErrorMessage({ message: health.message ?? 'Connection needs attention.' }),
        );
        await connections.refetch();
        return;
      }
      setStep(1);
    } catch (error) {
      setMessage(providerErrorMessage(error));
    }
  };
  const options = (type: string, parentIds?: string[]) =>
    resources
      .filter(
        (resource) =>
          resource.type === type &&
          (!parentIds?.length || !resource.parentId || parentIds.includes(resource.parentId)),
      )
      .map(({ id, name }) => ({ label: name, value: id }));
  const selectionField =
    step === 1
      ? 'pageIds'
      : step === 2
        ? 'adAccountIds'
        : step === 3
          ? 'instagramAccountIds'
          : 'formIds';
  const stepType =
    step === 1
      ? 'page'
      : step === 2
        ? 'ad_account'
        : step === 3
          ? 'instagram_account'
          : 'lead_form';
  const toggle = (field: keyof SelectedIntegrationResources, id: string, checked: boolean) =>
    setSelection((current) => ({
      ...current,
      [field]: checked
        ? [...(current[field] ?? []), id]
        : (current[field] ?? []).filter((value) => value !== id),
    }));
  const configure = (
    <Modal
      description="OAuth credentials stay encrypted on the server and are never displayed here."
      loading={busy}
      onClose={() => setFlow(null)}
      open={Boolean(flow)}
      size="xl"
      title={flow === 'meta' ? 'Configure Facebook & Instagram' : 'Configure GoHighLevel'}
    >
      <div className="grid gap-6">
        {flow === 'meta' ? (
          <Stepper currentStep={step} items={setupSteps.map((label) => ({ label }))} />
        ) : null}
        {message ? (
          <Alert
            title="Connection status"
            variant={message.includes('healthy') ? 'success' : 'warning'}
          >
            {message}
          </Alert>
        ) : null}
        {step === 0 ? (
          <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
            <h3 className="font-semibold">Authorize your account</h3>
            <p className="mt-1 text-sm text-slate-500">
              You will be redirected to {flow === 'meta' ? 'Meta' : 'GoHighLevel'} to grant access.
            </p>
            <Button
              className="mt-4"
              onClick={() =>
                void start(
                  flow === 'meta' ? 'facebook' : 'highlevel',
                  flow === 'meta' ? 'Facebook & Instagram' : 'GoHighLevel',
                  flow!,
                )
              }
            >
              Continue to OAuth
            </Button>
          </div>
        ) : null}
        {flow === 'meta' && step >= 1 && step <= 4 ? (
          <div className="grid gap-3">
            <h3 className="font-semibold">Select {setupSteps[step]}</h3>
            {options(stepType, stepType === 'lead_form' ? selection.pageIds : undefined).length ? (
              options(stepType, stepType === 'lead_form' ? selection.pageIds : undefined).map(
                (option) => (
                  <Checkbox
                    checked={(selection[selectionField] ?? []).includes(option.value)}
                    key={option.value}
                    label={option.label}
                    onChange={(event) => toggle(selectionField, option.value, event.target.checked)}
                  />
                ),
              )
            ) : (
              <p className="text-sm text-slate-500">
                No matching resources are available. You can continue and configure this later.
              </p>
            )}
            <Button className="mt-2 justify-self-end" onClick={() => void saveStep()}>
              Save and continue
            </Button>
          </div>
        ) : null}
        {flow === 'meta' && step === 5 ? (
          <div>
            <h3 className="font-semibold">Enable Lead Ads webhooks</h3>
            <p className="mt-1 text-sm text-slate-500">
              Subscribe the selected Facebook Page to lead generation events.
            </p>
            <Button className="mt-4" onClick={() => void saveStep()}>
              <Webhook size={15} />
              Enable subscription
            </Button>
          </div>
        ) : null}
        {flow === 'meta' && step === 6 ? (
          <div>
            <h3 className="font-semibold">Check connection health</h3>
            <p className="mt-1 text-sm text-slate-500">
              Validate the account, selected resources, and current authorization.
            </p>
            <Button className="mt-4" onClick={() => void saveStep()}>
              <HeartPulse size={15} />
              Run health check
            </Button>
          </div>
        ) : null}
        {flow === 'highlevel' && step === 1 ? (
          <div className="grid gap-4">
            <Select
              label="Location"
              onChange={(event) =>
                setSelection({ locationIds: event.target.value ? [event.target.value] : [] })
              }
              options={options('location')}
              placeholder="Select a location"
              value={selection.locationIds?.[0] ?? ''}
            />
            <Button
              onClick={() => {
                void (async () => {
                  if (!connectionId) return;
                  await actions.select.mutateAsync({ id: connectionId, selection });
                  const health = await actions.health.mutateAsync(connectionId);
                  setMessage(
                    health.healthy
                      ? 'Connection is healthy.'
                      : (health.message ?? 'Connection needs attention.'),
                  );
                })();
              }}
            >
              Save location and check health
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
  const cards = (
    <div className="grid gap-4 md:grid-cols-2">
      {!search || 'facebook instagram meta'.includes(search.toLowerCase()) ? (
        <IntegrationCard
          connection={meta}
          description="Capture Lead Ads, manage Meta resources, and connect Facebook Pages with Instagram business accounts."
          icon={Facebook}
          name="Facebook & Instagram"
          onConfigure={() => void start('facebook', 'Facebook & Instagram', 'meta')}
          onDisconnect={() => meta && void actions.disconnect.mutateAsync(meta.id)}
          onHealth={() => meta && void actions.health.mutateAsync(meta.id)}
          working={busy && flow === 'meta'}
        />
      ) : null}
      {!search || 'gohighlevel highlevel crm'.includes(search.toLowerCase()) ? (
        <IntegrationCard
          connection={highlevel}
          description="Synchronize locations, contacts, opportunities, pipelines, calendars, and appointments."
          icon={Workflow}
          name="GoHighLevel"
          onConfigure={() => void start('highlevel', 'GoHighLevel', 'highlevel')}
          onDisconnect={() => highlevel && void actions.disconnect.mutateAsync(highlevel.id)}
          onHealth={() => highlevel && void actions.health.mutateAsync(highlevel.id)}
          working={busy && flow === 'highlevel'}
        />
      ) : null}
    </div>
  );
  const developer = (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 font-semibold">
          <Webhook size={17} />
          Webhooks
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Manage event delivery through connected providers.
        </p>
        <Button className="mt-4" variant="outline">
          Add endpoint
        </Button>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound size={17} />
          API keys
        </h2>
        {keys.map((key) => (
          <div
            className="mt-3 rounded-lg bg-slate-100 p-3 font-mono text-sm dark:bg-slate-800"
            key={key}
          >
            {key}
          </div>
        ))}
        <Button
          className="mt-4"
          onClick={() => setKeys((current) => [...current, `amp_test_••••${current.length + 1}`])}
          variant="outline"
        >
          Generate mock key
        </Button>
      </section>
    </div>
  );
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-medium text-indigo-600">Connected apps</p>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-sm text-slate-500">
          Connect marketing channels and keep their health and synchronization visible.
        </p>
      </header>
      <Input
        leading={<Search size={16} />}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search integrations…"
        value={search}
      />
      {connections.isError ? (
        <Alert title="Connections unavailable" variant="danger">
          {providerErrorMessage(connections.error)}
        </Alert>
      ) : null}
      <Tabs
        defaultValue="apps"
        items={[
          { label: 'App marketplace', value: 'apps', content: cards },
          { label: 'Webhooks & API keys', value: 'developer', content: developer },
        ]}
      />
      {configure}
    </div>
  );
}
export default IntegrationsPage;
