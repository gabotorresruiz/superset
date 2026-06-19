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
 * Reactive domain hooks for the dashboard slices (chart metadata) client state.
 * Components read through these (imported from `src/dashboard/stores`) rather
 * than touching the Zustand store directly.
 */
import type { Slice } from 'src/dashboard/types';
import { useDashboardSlicesStore } from './useDashboardSlicesStore';

/** The full map of dashboard slices (chart metadata) keyed by slice id. */
export const useSlices = (): Record<number, Slice> =>
  useDashboardSlicesStore(s => s.slices);

/** A single dashboard slice (chart metadata) by id. */
export const useSlice = (sliceId: number): Slice =>
  useDashboardSlicesStore(s => s.slices[sliceId]);
