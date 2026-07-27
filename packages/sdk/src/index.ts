import type { ApiResponse, Campaign } from '@repo/types';

export interface MarketingClient {
  listCampaigns(): Promise<ApiResponse<Campaign[]>>;
}

export function createClient(baseUrl: string): MarketingClient {
  return {
    async listCampaigns() {
      const response = await fetch(`${baseUrl}/campaigns`);
      if (!response.ok) return { error: `Request failed with status ${response.status}` };
      return { data: (await response.json()) as Campaign[] };
    },
  };
}
