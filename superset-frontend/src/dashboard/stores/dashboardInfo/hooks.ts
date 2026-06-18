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

/**
 * Domain hooks for dashboard "info" client state. Components import these (from
 * `src/dashboard/stores`) rather than reaching into the Zustand store directly,
 * so the state library stays an implementation detail behind this layer. Each
 * hook keeps a precise selector so render granularity matches direct store use.
 */
import { FilterBarOrientation } from 'src/dashboard/types';
import {
  useDashboardInfoStore,
  selectFilterBarOrientation,
  selectCrossFiltersEnabled,
} from './useDashboardInfoStore';

/** The filter bar orientation (vertical / horizontal). */
export const useFilterBarOrientation = (): FilterBarOrientation =>
  useDashboardInfoStore(selectFilterBarOrientation);

/** Whether cross-filtering is enabled for the dashboard. */
export const useCrossFiltersEnabled = (): boolean =>
  useDashboardInfoStore(selectCrossFiltersEnabled);

/** The current dashboard's numeric id. */
export const useDashboardId = (): number =>
  useDashboardInfoStore(s => s.dashboardInfo.id);

/** Whether the current user may edit this dashboard. */
export const useCanEditDashboard = (): boolean =>
  useDashboardInfoStore(s => s.dashboardInfo.dash_edit_perm);
