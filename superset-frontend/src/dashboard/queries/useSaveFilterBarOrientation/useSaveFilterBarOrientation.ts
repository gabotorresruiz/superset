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
import { makeApi, getClientErrorObject } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import { DashboardInfo, FilterBarOrientation } from 'src/dashboard/types';
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

/** Persists the filter bar orientation (vertical / horizontal). */
export function useSaveFilterBarOrientation() {
  const { addDangerToast } = useToasts();
  return useMutation({
    mutationFn: async (orientation: FilterBarOrientation) => {
      const { id, metadata } = useDashboardInfoStore.getState().dashboardInfo;
      const updateDashboard = createUpdateDashboardApi(id);
      const response = await updateDashboard({
        json_metadata: JSON.stringify({
          ...metadata,
          filter_bar_orientation: orientation,
        }),
      });
      return { id, response };
    },
    onSuccess: ({ id, response }) => {
      const updatedDashboard = response.result;
      const lastModifiedTime = response.last_modified_time;
      if (updatedDashboard.json_metadata) {
        const metadata = JSON.parse(updatedDashboard.json_metadata);
        if (metadata.filter_bar_orientation) {
          useDashboardInfoStore
            .getState()
            .setFilterBarOrientation(metadata.filter_bar_orientation);
        }
      }
      if (lastModifiedTime) {
        onSave(lastModifiedTime);
      }
      rebaselineHydrationDashboardInfo(id);
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(id) });
    },
    onError: async (errorObject: unknown) => {
      const { error } = await getClientErrorObject(
        errorObject as Parameters<typeof getClientErrorObject>[0],
      );
      addDangerToast(
        t(
          'Sorry, there was an error saving this dashboard: %s',
          error || 'Bad Request',
        ),
      );
    },
  });
}
