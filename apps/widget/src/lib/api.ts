import type { PublicWidgetConfig } from '../types';

class PublicApiClient {
  private readonly calls: number[] = [];
  constructor(private readonly baseUrl: string, private readonly workspace: string, private readonly visitorId: string, private readonly limit = 12, private readonly windowMs = 60_000) {}
  config(signal?: AbortSignal) { return this.request<PublicWidgetConfig>('config', signal ? { signal } : {}); }
  chat(message: string, consent: boolean) { return this.request<{ reply: string }>('chat', { method: 'POST', body: JSON.stringify({ message, consent }) }); }
  lead(value: Record<string, string | boolean>) { return this.request<{ accepted: boolean }>('leads', { method: 'POST', body: JSON.stringify(value) }); }
  slots() { return this.request<{ slots: string[] }>('booking/slots'); }
  book(value: Record<string, string>) { return this.request<{ booked: boolean; reference: string }>('booking', { method: 'POST', body: JSON.stringify(value) }); }
  private async request<T>(path: string, init: RequestInit = {}) {
    const now = Date.now();
    while (this.calls[0] !== undefined && this.calls[0] <= now - this.windowMs) this.calls.shift();
    if (this.calls.length >= this.limit) throw new Error('Too many requests. Please wait a moment.');
    this.calls.push(now);
    const response = await fetch(`${this.baseUrl}/public/widget/${encodeURIComponent(this.workspace)}/${path}`, {
      ...init,
      credentials: 'omit',
      headers: { 'content-type': 'application/json', 'x-widget-visitor': this.visitorId, ...init.headers },
    });
    if (response.status === 429) throw new Error('Too many requests. Please wait a moment.');
    if (!response.ok) throw new Error('The service is temporarily unavailable.');
    return response.json() as Promise<T>;
  }
}
export { PublicApiClient };
