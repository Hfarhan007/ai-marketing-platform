export interface WorkspaceSettingsResponseDto {
  id: string;
  weekStartsOn: number;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultPipelineId?: string;
  dataRetentionDays: number;
  version: number;
}
