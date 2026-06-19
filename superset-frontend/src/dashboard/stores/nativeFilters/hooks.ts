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
 * Reactive domain hooks for the native filters client state. Components read
 * through these (imported from `src/dashboard/stores`) rather than touching the
 * Zustand store directly. Imperative reads/writes live in `./actions`.
 */
import type { FilterEntry } from './useNativeFiltersStore';
import { useNativeFiltersStore } from './useNativeFiltersStore';

/** The map of native filter entries keyed by filter id. */
export const useFilterEntries = (): Record<string, FilterEntry> =>
  useNativeFiltersStore(s => s.filters);

/** The id of the currently focused filter, if any. */
export const useFocusedFilterId = (): string | undefined =>
  useNativeFiltersStore(s => s.focusedFilterId);

/** The id of the currently hovered filter, if any. */
export const useHoveredFilterId = (): string | undefined =>
  useNativeFiltersStore(s => s.hoveredFilterId);
