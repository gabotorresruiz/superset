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
import { queryClient } from 'src/queries/queryClient';
import { useDashboardInfoStore } from 'src/dashboard/stores';
import { dashboardKeys } from 'src/dashboard/queries/keys';
import type { HydrationPayload } from 'src/dashboard/actions/hydrate';

/** Refresh the cached discard-snapshot's `dashboardInfo` after a backend persist. */
export function rebaselineHydrationDashboardInfo(id: number) {
  queryClient.setQueryData<HydrationPayload>(
    dashboardKeys.hydrationPayload(id),
    old =>
      old
        ? {
            ...old,
            dashboardInfo: useDashboardInfoStore.getState().dashboardInfo,
          }
        : old,
  );
}

/**
 * Drop the cached discard-snapshot after a backend persist the snapshot can't
 * faithfully represent, so the next discard falls back to a full reload instead
 * of reverting an already-saved change.
 */
export function dropHydrationSnapshot(id: number) {
  queryClient.removeQueries({ queryKey: dashboardKeys.hydrationPayload(id) });
}
