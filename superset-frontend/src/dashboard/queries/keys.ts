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

export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (idOrSlug: string | number) =>
    [...dashboardKeys.all, 'detail', String(idOrSlug)] as const,
  // Shared prefix for every dashboard's hydration payload, so the gcTime
  // default can be set once instead of one entry per dashboard id.
  hydrationPayloadAll: ['dashboard', 'hydration-payload'] as const,
  // Cached hydration payload from the initial HYDRATE_DASHBOARD dispatch.
  // Used by useDiscardChanges to re-seed dashboard state without a page reload.
  hydrationPayload: (idOrSlug: string | number) =>
    [...dashboardKeys.hydrationPayloadAll, String(idOrSlug)] as const,
  // The current user's favorite status for a dashboard.
  favoriteStatus: (idOrSlug: string | number) =>
    [...dashboardKeys.all, 'favorite-status', String(idOrSlug)] as const,
} as const;

export interface SlicesListParams {
  userId?: number;
  filterValue?: string;
  sortColumn?: string;
}

/** Query keys for the user's saved charts, used by the "add chart" panel. */
export const sliceKeys = {
  all: ['slices'] as const,
  list: (params: SlicesListParams) =>
    [...sliceKeys.all, 'list', params] as const,
} as const;
