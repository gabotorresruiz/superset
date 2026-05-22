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
import { useMemo } from 'react';
import { bindActionCreators } from 'redux';
import { useDispatch } from 'react-redux';
import DashboardGrid from '../components/DashboardGrid';
import type { DashboardGridProps } from '../components/DashboardGrid';
import { setDirectPathToChild } from '../actions/dashboardState';
import {
  useDashboardStateStore,
  useDashboardLayoutStore,
  useDashboardInfoStore,
  useHandleComponentDrop,
} from 'src/dashboard/stores';

type DashboardGridContainerProps = Omit<
  DashboardGridProps,
  | 'editMode'
  | 'setEditMode'
  | 'canEdit'
  | 'dashboardId'
  | 'handleComponentDrop'
  | 'resizeComponent'
  | 'setDirectPathToChild'
  | 'theme'
>;

export default function DashboardGridContainer(
  props: DashboardGridContainerProps,
) {
  const dispatch = useDispatch();
  const editMode = useDashboardStateStore(s => s.editMode);
  const { setEditMode } = useDashboardStateStore.getState();
  const canEdit = useDashboardInfoStore(s => s.dashboardInfo.dash_edit_perm);
  const dashboardId = useDashboardInfoStore(s => s.dashboardInfo.id);

  const handleComponentDrop = useHandleComponentDrop();
  const resizeComponent = useDashboardLayoutStore(s => s.resizeComponent);

  const boundActions = useMemo(
    () =>
      bindActionCreators(
        {
          setDirectPathToChild,
        },
        dispatch,
      ),
    [dispatch],
  );

  return (
    <DashboardGrid
      {...props}
      {...boundActions}
      handleComponentDrop={handleComponentDrop}
      resizeComponent={resizeComponent}
      editMode={editMode}
      setEditMode={setEditMode}
      canEdit={canEdit}
      dashboardId={dashboardId}
    />
  );
}
