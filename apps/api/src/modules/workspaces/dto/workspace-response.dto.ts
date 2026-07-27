export interface WorkspaceResponseDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  locale: string;
  currency: string;
  plan: string;
  ownerId: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  domainSettings: {
    customDomain?: string;
    verified: boolean;
  };
  featureFlags: Record<string, boolean>;
  usageLimits: {
    seats: number;
    contacts: number;
    monthlyAiCredits: number;
    storageBytes: number;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}
