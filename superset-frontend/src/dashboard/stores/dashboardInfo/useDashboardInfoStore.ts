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

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  ChartCustomization,
  ChartCustomizationDivider,
  ColumnOption,
} from '@superset-ui/core';
import type {
  DashboardInfo,
  FilterBarOrientation,
  FilterConfigItem,
} from 'src/dashboard/types';

/**
 * Loose shape for hydration input: the payload attaches permission flags
 * (superset_can_explore, superset_can_share, …) that are not part of the
 * DashboardInfo type, and may be partial.
 */
export type DashboardInfoData = Partial<DashboardInfo> & {
  last_modified_time?: number;
  [key: string]: unknown;
};

type DashboardMetadata = DashboardInfo['metadata'];

/** Base shape for items that can have scopes preserved. */
interface ScopedConfigItem {
  id: string;
  chartsInScope?: number[];
  tabsInScope?: string[];
}

/**
 * Carries forward client-only scope data (chartsInScope, tabsInScope) when a
 * config is refreshed from the server, which omits those fields.
 */
function preserveScopes<T extends ScopedConfigItem>(
  existingConfig: T[] | undefined,
  incomingConfig: T[] | undefined,
): T[] {
  const truthyExistingConfig = (existingConfig || []).filter(Boolean);
  const truthyIncomingConfig = (incomingConfig || []).filter(Boolean);

  const existingScopesMap = truthyExistingConfig.reduce<
    Record<string, { chartsInScope?: number[]; tabsInScope?: string[] }>
  >((acc, item) => {
    if (item.chartsInScope != null || item.tabsInScope != null) {
      acc[item.id] = {
        chartsInScope: item.chartsInScope,
        tabsInScope: item.tabsInScope,
      };
    }
    return acc;
  }, {});

  return truthyIncomingConfig.map(item => {
    const existingScopes = existingScopesMap[item.id];
    if (item.chartsInScope == null && existingScopes) {
      return {
        ...item,
        chartsInScope: existingScopes.chartsInScope,
        tabsInScope: existingScopes.tabsInScope,
      };
    }
    return item;
  });
}

const nowInSeconds = () => Math.round(Date.now() / 1000);

export interface DashboardInfoStore {
  /**
   * Typed as the full DashboardInfo for consumer ergonomics; the store holds
   * an empty object until hydration, matching the former Redux RootState.
   */
  dashboardInfo: DashboardInfo;
  /** Partially merges changed dashboard info, preserving refreshed scopes. */
  setDashboardInfo: (newInfo: Partial<DashboardInfo>) => void;
  /** Replaces native_filter_configuration, preserving existing scopes. */
  setNativeFiltersConfig: (newConfig: FilterConfigItem[]) => void;
  /** Seeds the store from the dashboard hydration payload. */
  hydrateDashboardInfo: (incoming: DashboardInfoData) => void;
  setFilterBarOrientation: (orientation: FilterBarOrientation) => void;
  setCrossFiltersEnabled: (crossFiltersEnabled: boolean) => void;
  setChartCustomizationComplete: (
    chartCustomization: (ChartCustomization | ChartCustomizationDivider)[],
  ) => void;
  setChartCustomizationDataLoading: (
    itemId: string,
    isLoading: boolean,
  ) => void;
  setChartCustomizationData: (itemId: string, data: ColumnOption[]) => void;
  setPendingChartCustomization: (pending: ChartCustomization) => void;
  clearPendingChartCustomization: (itemId: string) => void;
  clearAllPendingChartCustomizations: () => void;
  clearAllChartCustomizations: () => void;
}

export const useDashboardInfoStore = create<DashboardInfoStore>()(
  devtools(
    subscribeWithSelector(set => ({
      dashboardInfo: {} as DashboardInfo,

      setDashboardInfo: newInfo =>
        set(
          state => {
            // undefined = "no change"; null still clears.
            const cleanedInfo = Object.fromEntries(
              Object.entries(newInfo).filter(([, v]) => v !== undefined),
            ) as Partial<DashboardInfo>;
            const incomingMeta = cleanedInfo.metadata;
            return {
              dashboardInfo: {
                ...state.dashboardInfo,
                ...cleanedInfo,
                ...(incomingMeta && {
                  metadata: {
                    ...incomingMeta,
                    ...(incomingMeta.native_filter_configuration && {
                      native_filter_configuration: preserveScopes(
                        state.dashboardInfo.metadata
                          ?.native_filter_configuration,
                        incomingMeta.native_filter_configuration,
                      ),
                    }),
                    ...(incomingMeta.chart_customization_config && {
                      chart_customization_config: preserveScopes(
                        state.dashboardInfo.metadata
                          ?.chart_customization_config,
                        incomingMeta.chart_customization_config,
                      ),
                    }),
                  },
                }),
                last_modified_time: nowInSeconds(),
              },
            };
          },
          false,
          'dashboardInfo/setDashboardInfo',
        ),

      setNativeFiltersConfig: newConfig =>
        set(
          state => {
            const existingConfig =
              state.dashboardInfo.metadata?.native_filter_configuration || [];
            const existingScopesMap = existingConfig.reduce<
              Record<
                string,
                { chartsInScope?: number[]; tabsInScope?: string[] }
              >
            >((acc, filter) => {
              if (filter.chartsInScope != null || filter.tabsInScope != null) {
                acc[filter.id] = {
                  chartsInScope: filter.chartsInScope,
                  tabsInScope: filter.tabsInScope,
                };
              }
              return acc;
            }, {});

            const newConfigWithScopes = (newConfig || []).map(filter => {
              const existingScopes = existingScopesMap[filter.id];
              if (filter.chartsInScope == null && existingScopes) {
                return {
                  ...filter,
                  chartsInScope: existingScopes.chartsInScope,
                  tabsInScope: existingScopes.tabsInScope,
                };
              }
              return filter;
            });

            return {
              dashboardInfo: {
                ...state.dashboardInfo,
                metadata: {
                  ...state.dashboardInfo.metadata,
                  native_filter_configuration: newConfigWithScopes,
                } as DashboardMetadata,
                last_modified_time: nowInSeconds(),
              },
            };
          },
          false,
          'dashboardInfo/setNativeFiltersConfig',
        ),

      hydrateDashboardInfo: incoming =>
        set(
          state => {
            const incomingMetadata = incoming.metadata;
            const mergedFilterConfig = preserveScopes(
              state.dashboardInfo.metadata?.native_filter_configuration,
              incomingMetadata?.native_filter_configuration,
            );
            const mergedCustomizationConfig = preserveScopes(
              state.dashboardInfo.metadata?.chart_customization_config,
              incomingMetadata?.chart_customization_config,
            );

            return {
              dashboardInfo: {
                ...state.dashboardInfo,
                ...incoming,
                metadata: {
                  ...incomingMetadata,
                  native_filter_configuration: mergedFilterConfig,
                  chart_customization_config: mergedCustomizationConfig,
                } as DashboardMetadata,
                pendingChartCustomizations: {},
              },
            };
          },
          false,
          'dashboardInfo/hydrateDashboardInfo',
        ),

      setFilterBarOrientation: orientation =>
        set(
          state => ({
            dashboardInfo: {
              ...state.dashboardInfo,
              filterBarOrientation: orientation,
            },
          }),
          false,
          'dashboardInfo/setFilterBarOrientation',
        ),

      setCrossFiltersEnabled: crossFiltersEnabled =>
        set(
          state => ({
            dashboardInfo: { ...state.dashboardInfo, crossFiltersEnabled },
          }),
          false,
          'dashboardInfo/setCrossFiltersEnabled',
        ),

      setChartCustomizationComplete: chartCustomization =>
        set(
          state => ({
            dashboardInfo: {
              ...state.dashboardInfo,
              metadata: {
                ...state.dashboardInfo.metadata,
                native_filter_configuration: (
                  state.dashboardInfo.metadata?.native_filter_configuration ||
                  []
                ).filter(
                  item =>
                    !(
                      item.type === 'CHART_CUSTOMIZATION' &&
                      item.id === 'chart_customization_groupby'
                    ),
                ),
                chart_customization_config: chartCustomization,
              } as DashboardMetadata,
              last_modified_time: nowInSeconds(),
            },
          }),
          false,
          'dashboardInfo/setChartCustomizationComplete',
        ),

      setChartCustomizationDataLoading: (itemId, isLoading) =>
        set(
          state => ({
            dashboardInfo: {
              ...state.dashboardInfo,
              chartCustomizationLoading: {
                ...state.dashboardInfo.chartCustomizationLoading,
                [itemId]: isLoading,
              },
            },
          }),
          false,
          'dashboardInfo/setChartCustomizationDataLoading',
        ),

      setChartCustomizationData: (itemId, data) =>
        set(
          state => ({
            dashboardInfo: {
              ...state.dashboardInfo,
              chartCustomizationData: {
                ...state.dashboardInfo.chartCustomizationData,
                [itemId]: data,
              },
            },
          }),
          false,
          'dashboardInfo/setChartCustomizationData',
        ),

      setPendingChartCustomization: pending =>
        set(
          state => ({
            dashboardInfo: {
              ...state.dashboardInfo,
              pendingChartCustomizations: {
                ...state.dashboardInfo.pendingChartCustomizations,
                [pending.id]: pending,
              },
            },
          }),
          false,
          'dashboardInfo/setPendingChartCustomization',
        ),

      clearPendingChartCustomization: itemId =>
        set(
          state => {
            const pendingChartCustomizations = {
              ...state.dashboardInfo.pendingChartCustomizations,
            };
            delete pendingChartCustomizations[itemId];
            return {
              dashboardInfo: {
                ...state.dashboardInfo,
                pendingChartCustomizations,
              },
            };
          },
          false,
          'dashboardInfo/clearPendingChartCustomization',
        ),

      clearAllPendingChartCustomizations: () =>
        set(
          state => ({
            dashboardInfo: {
              ...state.dashboardInfo,
              pendingChartCustomizations: {},
            },
          }),
          false,
          'dashboardInfo/clearAllPendingChartCustomizations',
        ),

      clearAllChartCustomizations: () =>
        set(
          state => {
            const customizationConfig = (
              state.dashboardInfo.metadata?.chart_customization_config || []
            ).filter(Boolean);
            return {
              dashboardInfo: {
                ...state.dashboardInfo,
                metadata: {
                  ...state.dashboardInfo.metadata,
                  chart_customization_config: customizationConfig.map(
                    customization => ({
                      ...customization,
                      targets: customization.targets?.map(target => ({
                        datasetId: target.datasetId,
                      })),
                    }),
                  ),
                } as DashboardMetadata,
                last_modified_time: nowInSeconds(),
              },
            };
          },
          false,
          'dashboardInfo/clearAllChartCustomizations',
        ),
    })),
    {
      name: 'DashboardInfoStore',
      enabled: process.env.WEBPACK_MODE === 'development',
    },
  ),
);
