/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useMutation } from '@tanstack/react-query';
import { makeApi } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import { DashboardInfo } from 'src/dashboard/types';
import { useDashboardInfoStore } from 'src/dashboard/stores';
import { rebaselineHydrationDashboardInfo } from 'src/dashboard/util/rebaselineHydrationDashboardInfo';
import { queryClient } from 'src/queries/queryClient';
import { onSave } from 'src/dashboard/actions/dashboardState';
import { dashboardKeys } from '../keys';

const createUpdateDashboardApi = (id: number) =>
  makeApi<
    Partial<DashboardInfo>,
    { result: Partial<DashboardInfo>; last_modified_time: number }
  >({
    method: 'PUT',
    endpoint: `/api/v1/dashboard/${id}`,
  });

/** Persists the dashboard's cross-filtering enabled setting. */
export function useSaveCrossFiltersSetting() {
  const { addDangerToast } = useToasts();
  return useMutation({
    mutationFn: async (crossFiltersEnabled: boolean) => {
      const {
        id,
        metadata,
        crossFiltersEnabled: previousCrossFiltersEnabled,
      } = useDashboardInfoStore.getState().dashboardInfo;

      // Optimistic update; reverted in onError.
      useDashboardInfoStore
        .getState()
        .setCrossFiltersEnabled(crossFiltersEnabled);
      const updateDashboard = createUpdateDashboardApi(id);
      try {
        const response = await updateDashboard({
          json_metadata: JSON.stringify({
            ...metadata,
            cross_filters_enabled: crossFiltersEnabled,
          }),
        });
        return { id, response };
      } catch (err) {
        useDashboardInfoStore
          .getState()
          .setCrossFiltersEnabled(previousCrossFiltersEnabled);
        throw err;
      }
    },
    onSuccess: ({ id, response }) => {
      const updatedDashboard = response.result;
      const lastModifiedTime = response.last_modified_time;

      if (updatedDashboard.json_metadata) {
        const metadata = JSON.parse(updatedDashboard.json_metadata);
        useDashboardInfoStore
          .getState()
          .setCrossFiltersEnabled(metadata.cross_filters_enabled);
      }

      if (lastModifiedTime) {
        onSave(lastModifiedTime);
      }

      useDashboardInfoStore.getState().setDashboardInfo({
        metadata: JSON.parse(response.result.json_metadata || '{}'),
      });
      rebaselineHydrationDashboardInfo(id);
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(id) });
    },
    onError: () => {
      addDangerToast(t('Failed to save cross-filters setting'));
    },
  });
}
