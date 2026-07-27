export const featureFlags = {
  aiAgents: false,
  campaignBuilder: true,
  realtimePresence: false,
  workflowAutomation: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag) {
  return featureFlags[flag];
}
