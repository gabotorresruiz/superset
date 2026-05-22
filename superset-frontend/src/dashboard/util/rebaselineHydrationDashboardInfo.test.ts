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
import type { DashboardInfo } from 'src/dashboard/types';
import { rebaselineHydrationDashboardInfo } from './rebaselineHydrationDashboardInfo';

const DASHBOARD_ID = 6;

beforeEach(() => {
  queryClient.clear();
  useDashboardInfoStore.setState({ dashboardInfo: {} as DashboardInfo });
});

test('refreshes the cached payload dashboardInfo from the store, leaving other fields intact', () => {
  queryClient.setQueryData(dashboardKeys.hydrationPayload(DASHBOARD_ID), {
    dashboardInfo: { id: DASHBOARD_ID, css: 'stale' },
    dashboardLayout: { present: { ROOT: {} } },
  });
  useDashboardInfoStore.setState({
    dashboardInfo: {
      id: DASHBOARD_ID,
      css: 'saved',
    } as unknown as DashboardInfo,
  });

  rebaselineHydrationDashboardInfo(DASHBOARD_ID);

  const cached = queryClient.getQueryData(
    dashboardKeys.hydrationPayload(DASHBOARD_ID),
  ) as { dashboardInfo: DashboardInfo; dashboardLayout: unknown };
  // dashboardInfo is replaced with the live (just-saved) store value
  expect(cached.dashboardInfo).toEqual({ id: DASHBOARD_ID, css: 'saved' });
  // unrelated payload fields are preserved
  expect(cached.dashboardLayout).toEqual({ present: { ROOT: {} } });
});

test('is a no-op when no hydration payload is cached', () => {
  useDashboardInfoStore.setState({
    dashboardInfo: { id: DASHBOARD_ID } as unknown as DashboardInfo,
  });

  rebaselineHydrationDashboardInfo(DASHBOARD_ID);

  expect(
    queryClient.getQueryData(dashboardKeys.hydrationPayload(DASHBOARD_ID)),
  ).toBeUndefined();
});
