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
import { debounce } from 'lodash';
import { useNativeFiltersStore } from 'src/dashboard/stores';
import { Constants } from '@superset-ui/core/components';

export const dispatchHoverAction = debounce((id?: string) => {
  if (id) {
    useNativeFiltersStore.getState().setHoveredFilter(id);
  } else {
    useNativeFiltersStore.getState().unsetHoveredFilter();
  }
}, Constants.FAST_DEBOUNCE);

export const dispatchFocusAction = debounce((id?: string) => {
  if (id) {
    useNativeFiltersStore.getState().setFocusedFilter(id);
  } else {
    useNativeFiltersStore.getState().unsetFocusedFilter();
  }
}, Constants.FAST_DEBOUNCE);

export const dispatchChartCustomizationHoverAction = debounce((id?: string) => {
  if (id) {
    useNativeFiltersStore.getState().setHoveredChartCustomization(id);
  } else {
    useNativeFiltersStore.getState().unsetHoveredChartCustomization();
  }
}, Constants.FAST_DEBOUNCE);
