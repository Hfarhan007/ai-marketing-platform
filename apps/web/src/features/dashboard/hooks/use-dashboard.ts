import { useQuery } from '@tanstack/react-query';
import { getMockDashboard } from '../api/dashboard.mock';
import type { DashboardRange } from '../types/dashboard.types';

export function useDashboard(workspaceId: string, range: DashboardRange) {
  return useQuery({
    queryKey: ['dashboard', workspaceId, range],
    queryFn: () => getMockDashboard(workspaceId, range),
  });
}
