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
import { SupersetClient } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import {
  useDashboardStateStore,
  useDashboardInfoStore,
} from 'src/dashboard/stores';

/** Favorites / unfavorites a dashboard for the current user. */
export function useToggleFavorite(id: number) {
  const { addDangerToast } = useToasts();
  return useMutation({
    mutationFn: (isStarred: boolean) => {
      const endpoint = `/api/v1/dashboard/${id}/favorites/`;
      const apiCall = isStarred
        ? SupersetClient.delete({ endpoint })
        : SupersetClient.post({ endpoint });
      return apiCall.then(() => isStarred);
    },
    onSuccess: isStarred => {
      // Only update state if this is still the current dashboard.
      if (useDashboardInfoStore.getState().dashboardInfo?.id !== id) return;
      useDashboardStateStore.getState().setIsStarred(!isStarred);
    },
    onError: () => {
      // Only show error if this is still the current dashboard.
      if (useDashboardInfoStore.getState().dashboardInfo?.id !== id) return;
      addDangerToast(t('There was an issue favoriting this dashboard.'));
    },
  });
}
