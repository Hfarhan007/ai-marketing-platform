import type {
  ApiResponse,
  Campaign,
  Contact,
  ContactInput,
  ContactListQuery,
  ContactPage,
  ContactUpdateInput,
} from '@repo/types';

export interface MarketingClient {
  listCampaigns(): Promise<ApiResponse<Campaign[]>>;
  contacts: {
    list(query?: ContactListQuery): Promise<ContactPage>;
    get(id: string): Promise<Contact>;
    create(input: ContactInput): Promise<Contact>;
    update(id: string, input: ContactUpdateInput): Promise<Contact>;
    remove(id: string, version: number): Promise<Contact>;
    restore(id: string, version: number): Promise<Contact>;
  };
}

export interface ClientOptions {
  fetch?: typeof globalThis.fetch;
  headers?: () => Record<string, string>;
}

export function createClient(baseUrl: string, options: ClientOptions = {}): MarketingClient {
  const request = options.fetch ?? globalThis.fetch;
  const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await request(`${baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...options.headers?.(), ...init.headers },
    });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return (await response.json()) as T;
  };
  const body = (value: unknown): Pick<RequestInit, 'body' | 'headers'> => ({
    body: JSON.stringify(value),
    headers: { 'content-type': 'application/json' },
  });
  return {
    async listCampaigns() {
      const response = await fetch(`${baseUrl}/campaigns`);
      if (!response.ok) return { error: `Request failed with status ${response.status}` };
      return { data: (await response.json()) as Campaign[] };
    },
    contacts: {
      list(query = {}) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
          if (value === undefined || value === '') continue;
          if (Array.isArray(value))
            for (const item of value as readonly string[]) params.append(key, item);
          else params.set(key, String(value));
        }
        const suffix = params.size ? `?${params.toString()}` : '';
        return call<ContactPage>(`/contacts${suffix}`);
      },
      get: (id) => call<Contact>(`/contacts/${encodeURIComponent(id)}`),
      create: (input) => call<Contact>('/contacts', { method: 'POST', ...body(input) }),
      update: (id, input) =>
        call<Contact>(`/contacts/${encodeURIComponent(id)}`, { method: 'PATCH', ...body(input) }),
      remove: (id, version) =>
        call<Contact>(`/contacts/${encodeURIComponent(id)}?version=${version}`, { method: 'DELETE' }),
      restore: (id, version) =>
        call<Contact>(`/contacts/${encodeURIComponent(id)}/restore`, {
          method: 'POST',
          ...body({ version }),
        }),
    },
  };
}
