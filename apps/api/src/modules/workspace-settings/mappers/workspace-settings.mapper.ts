import type { WorkspaceSettingsResponseDto } from '../dto/workspace-settings-response.dto.js';
import type { WorkspaceSettings } from '../schemas/workspace-settings.schema.js';

export function mapWorkspaceSettingsResponse(
  settings: WorkspaceSettings,
): WorkspaceSettingsResponseDto {
  return {
    id: settings._id.toString(),
    weekStartsOn: settings.weekStartsOn,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    ...(settings.defaultPipelineId
      ? { defaultPipelineId: settings.defaultPipelineId.toString() }
      : {}),
    dataRetentionDays: settings.dataRetentionDays,
    version: settings.version,
  };
}
