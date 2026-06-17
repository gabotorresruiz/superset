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
import {
  Filter,
  FilterConfiguration,
  Filters,
  makeApi,
  Divider,
  ChartCustomization,
  ChartCustomizationDivider,
} from '@superset-ui/core';
import { Dispatch } from 'redux';
import { cloneDeep } from 'lodash';
import { setDataMaskForFilterChangesComplete } from 'src/dataMask/actions';
import {
  useNativeFiltersStore,
  useDashboardInfoStore,
  type FilterEntry,
} from 'src/dashboard/stores';
import { queryClient } from 'src/queries/queryClient';
import { dashboardKeys } from 'src/dashboard/queries';
import { rebaselineHydrationDashboardInfo } from 'src/dashboard/util/rebaselineHydrationDashboardInfo';
import { HYDRATE_DASHBOARD } from './hydrate';
import {
  dashboardInfoChanged,
  nativeFiltersConfigChanged,
} from './dashboardInfo';
import { SaveFilterChangesType } from '../components/nativeFilters/FiltersConfigModal/types';

export const SET_NATIVE_FILTERS_CONFIG_BEGIN =
  'SET_NATIVE_FILTERS_CONFIG_BEGIN';
export interface SetNativeFiltersConfigBegin {
  type: typeof SET_NATIVE_FILTERS_CONFIG_BEGIN;
  filterConfig: FilterConfiguration;
}

export const SET_NATIVE_FILTERS_CONFIG_COMPLETE =
  'SET_NATIVE_FILTERS_CONFIG_COMPLETE';
export interface SetNativeFiltersConfigComplete {
  type: typeof SET_NATIVE_FILTERS_CONFIG_COMPLETE;
  filterChanges: Array<
    Filter | Divider | ChartCustomization | ChartCustomizationDivider
  >;
}

export const SET_NATIVE_FILTERS_CONFIG_FAIL = 'SET_NATIVE_FILTERS_CONFIG_FAIL';
export interface SetNativeFiltersConfigFail {
  type: typeof SET_NATIVE_FILTERS_CONFIG_FAIL;
  filterConfig: FilterConfiguration;
}
export const SET_IN_SCOPE_STATUS_OF_FILTERS = 'SET_IN_SCOPE_STATUS_OF_FILTERS';
export interface SetInScopeStatusOfFilters {
  type: typeof SET_IN_SCOPE_STATUS_OF_FILTERS;
  filterConfig: FilterConfiguration;
}

const isFilterChangesEmpty = (filterChanges: SaveFilterChangesType) =>
  Object.values(filterChanges).every(
    array => Array.isArray(array) && !array.length,
  );

export const setFilterConfiguration =
  (filterChanges: SaveFilterChangesType) => async (dispatch: Dispatch) => {
    if (isFilterChangesEmpty(filterChanges)) {
      return;
    }

    const { id } = useDashboardInfoStore.getState().dashboardInfo;
    const oldFilters = useNativeFiltersStore.getState().filters as Filters;

    dispatch({
      type: SET_NATIVE_FILTERS_CONFIG_BEGIN,
      filterChanges,
    });

    const updateFilters = makeApi<SaveFilterChangesType, { result: Filter[] }>({
      method: 'PUT',
      endpoint: `/api/v1/dashboard/${id}/filters`,
    });
    try {
      const response = await updateFilters(filterChanges);
      useNativeFiltersStore
        .getState()
        .setFiltersConfigComplete(response.result as FilterEntry[]);
      dispatch({
        type: SET_NATIVE_FILTERS_CONFIG_COMPLETE,
        filterChanges: response.result,
      });
      nativeFiltersConfigChanged(response.result);
      dispatch(setDataMaskForFilterChangesComplete(filterChanges, oldFilters));
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(id) });
      // Refresh only dashboardInfo (the new filter config); a filter-config save
      // doesn't persist layout/state, so don't rebaseline those into the snapshot.
      rebaselineHydrationDashboardInfo(id);
    } catch (err) {
      dispatch({
        type: SET_NATIVE_FILTERS_CONFIG_FAIL,
        filterConfig: filterChanges,
      });
    }
  };

export const setInScopeStatusOfFilters =
  (
    filterScopes: {
      filterId: string;
      chartsInScope: number[];
      tabsInScope: string[];
    }[],
  ) =>
  async (dispatch: Dispatch) => {
    const { filters } = useNativeFiltersStore.getState();
    const filtersWithScopes = filterScopes.map(scope => ({
      ...filters[scope.filterId],
      chartsInScope: scope.chartsInScope,
      tabsInScope: scope.tabsInScope,
    }));
    useNativeFiltersStore
      .getState()
      .setInScopeStatus(filtersWithScopes as FilterEntry[]);
    dispatch({
      type: SET_IN_SCOPE_STATUS_OF_FILTERS,
      filterConfig: filtersWithScopes,
    });
    const metadata = cloneDeep(
      useDashboardInfoStore.getState().dashboardInfo.metadata,
    );
    const filterConfig =
      (metadata.native_filter_configuration as FilterConfiguration) || [];
    const mergedFilterConfig = filterConfig.map(filter => {
      const filterWithScope = filtersWithScopes.find(
        scope => scope.id === filter.id,
      );
      if (!filterWithScope) {
        return filter;
      }
      return {
        ...filter,
        chartsInScope: filterWithScope.chartsInScope,
        tabsInScope: filterWithScope.tabsInScope,
      };
    });
    metadata.native_filter_configuration = mergedFilterConfig;
    dispatch(
      dashboardInfoChanged({
        metadata,
      }),
    );
  };

type BootstrapData = {
  nativeFilters: {
    filters: Filters;
    filtersState: object;
  };
};

export interface SetBootstrapData {
  type: typeof HYDRATE_DASHBOARD;
  data: BootstrapData;
}

// Focus/hover/cascade are plain Zustand store mutators — call directly.
export function setFocusedNativeFilter(id: string): void {
  useNativeFiltersStore.getState().setFocusedFilter(id);
}
export function unsetFocusedNativeFilter(): void {
  useNativeFiltersStore.getState().unsetFocusedFilter();
}

export function setHoveredNativeFilter(id: string): void {
  useNativeFiltersStore.getState().setHoveredFilter(id);
}
export function unsetHoveredNativeFilter(): void {
  useNativeFiltersStore.getState().unsetHoveredFilter();
}

export function setHoveredChartCustomization(id: string): void {
  useNativeFiltersStore.getState().setHoveredChartCustomization(id);
}
export function unsetHoveredChartCustomization(): void {
  useNativeFiltersStore.getState().unsetHoveredChartCustomization();
}

export function updateCascadeParentIds(id: string, parentIds: string[]): void {
  useNativeFiltersStore.getState().updateCascadeParentIds(id, parentIds);
}

export type AnyFilterAction =
  | SetNativeFiltersConfigBegin
  | SetNativeFiltersConfigComplete
  | SetNativeFiltersConfigFail
  | SetInScopeStatusOfFilters
  | SetBootstrapData;
