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
 * Reactive domain hooks for dashboard client state. Components read state in
 * render through these (imported from `src/dashboard/stores`) rather than
 * touching the Zustand store directly, keeping the state library an
 * implementation detail. For imperative reads/writes inside callbacks and
 * effects, use the plain functions in `./actions` instead.
 */
import type { JsonObject } from '@superset-ui/core';
import type { DashboardChartStates } from 'src/dashboard/types/chartState';
import { useDashboardStateStore } from './useDashboardStateStore';

/** Whether the dashboard is in edit mode. */
export const useEditMode = (): boolean =>
  useDashboardStateStore(s => s.editMode);

/** Whether there are unsaved changes pending. */
export const useHasUnsavedChanges = (): boolean =>
  useDashboardStateStore(s => s.hasUnsavedChanges);

/** Whether a save is in flight. */
export const useDashboardIsSaving = (): boolean =>
  useDashboardStateStore(s => s.dashboardIsSaving);

/** The id of the chart currently shown full-size, or null. */
export const useFullSizeChartId = (): number | null =>
  useDashboardStateStore(s => s.fullSizeChartId);

/** The dashboard's chart (slice) ids. */
export const useSliceIds = (): number[] =>
  useDashboardStateStore(s => s.sliceIds);

/** The currently active tab ids. */
export const useActiveTabs = (): string[] =>
  useDashboardStateStore(s => s.activeTabs);

/** The drill path to the focused dashboard child. */
export const useDirectPathToChild = (): string[] =>
  useDashboardStateStore(s => s.directPathToChild);

/** Timestamp of the last directPathToChild update. */
export const useDirectPathLastUpdated = (): number =>
  useDashboardStateStore(s => s.directPathLastUpdated);

/** Whether the native filter bar is open. */
export const useNativeFiltersBarOpen = (): boolean =>
  useDashboardStateStore(s => s.nativeFiltersBarOpen);

/** Per-slice expanded state. */
export const useExpandedSlices = (): Record<number, boolean> =>
  useDashboardStateStore(s => s.expandedSlices);

/** AgGrid (and similar) per-chart UI state. */
export const useChartStates = (): DashboardChartStates =>
  useDashboardStateStore(s => s.chartStates);

/** The dashboard's color scheme, if set. */
export const useColorScheme = (): string | undefined =>
  useDashboardStateStore(s => s.colorScheme);

/** The dashboard's color namespace, if set. */
export const useColorNamespace = (): string | undefined =>
  useDashboardStateStore(s => s.colorNamespace);

/** Whether the color scheme was changed since hydration/save. */
export const useUpdatedColorScheme = (): boolean =>
  useDashboardStateStore(s => s.updatedColorScheme);

/** Whether the dashboard is starred (favorited). */
export const useIsStarred = (): boolean =>
  useDashboardStateStore(s => s.isStarred);

/** Whether a full dashboard refresh is in progress. */
export const useIsRefreshing = (): boolean =>
  useDashboardStateStore(s => s.isRefreshing);

/** Whether native filters are refreshing. */
export const useIsFiltersRefreshing = (): boolean =>
  useDashboardStateStore(s => s.isFiltersRefreshing);

/** Auto-refresh frequency, in seconds (0 = off). */
export const useRefreshFrequency = (): number =>
  useDashboardStateStore(s => s.refreshFrequency);

/** Timestamp of the last manual refresh. */
export const useLastRefreshTime = (): number =>
  useDashboardStateStore(s => s.lastRefreshTime);

/** Timestamp of the last dashboard modification. */
export const useLastModifiedTime = (): number =>
  useDashboardStateStore(s => s.lastModifiedTime);

/** Status string for dataset loading, if any. */
export const useDatasetsStatus = (): string | undefined =>
  useDashboardStateStore(s => s.datasetsStatus);

/** Metadata for the overwrite-confirm flow, if a conflict is pending. */
export const useOverwriteConfirmMetadata = (): JsonObject | undefined =>
  useDashboardStateStore(s => s.overwriteConfirmMetadata);
