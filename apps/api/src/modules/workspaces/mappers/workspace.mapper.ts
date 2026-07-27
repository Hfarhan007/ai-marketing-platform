import type { WorkspaceResponseDto } from '../dto/workspace-response.dto.js';
import type { Workspace } from '../schemas/workspace.schema.js';

export function mapWorkspaceResponse(workspace: Workspace): WorkspaceResponseDto {
  return {
    id: workspace._id.toString(),
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
    timezone: workspace.timezone,
    locale: workspace.locale,
    currency: workspace.currency,
    plan: workspace.plan,
    ownerId: workspace.ownerId.toString(),
    branding: {
      ...(workspace.branding.logoUrl ? { logoUrl: workspace.branding.logoUrl } : {}),
      ...(workspace.branding.primaryColor ? { primaryColor: workspace.branding.primaryColor } : {}),
      ...(workspace.branding.accentColor ? { accentColor: workspace.branding.accentColor } : {}),
    },
    domainSettings: {
      ...(workspace.domainSettings.customDomain
        ? { customDomain: workspace.domainSettings.customDomain }
        : {}),
      verified: workspace.domainSettings.verified,
    },
    featureFlags: Object.fromEntries(workspace.featureFlags),
    usageLimits: { ...workspace.usageLimits },
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
    version: workspace.version,
  };
}
