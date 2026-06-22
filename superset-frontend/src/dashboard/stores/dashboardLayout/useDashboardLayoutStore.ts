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
import { temporal } from 'zundo';
import type { DashboardLayout, LayoutItem } from 'src/dashboard/types';
import type { DropResult } from 'src/dashboard/components/dnd/dragDroppableConfig';
import {
  DASHBOARD_ROOT_ID,
  DASHBOARD_GRID_ID,
  NEW_COMPONENTS_SOURCE_ID,
  DASHBOARD_HEADER_ID,
} from 'src/dashboard/util/constants';
import {
  ROW_TYPE,
  TAB_TYPE,
  TABS_TYPE,
} from 'src/dashboard/util/componentTypes';
import componentIsResizable from 'src/dashboard/util/componentIsResizable';
import findParentId from 'src/dashboard/util/findParentId';
import getComponentWidthFromDrop from 'src/dashboard/util/getComponentWidthFromDrop';
import newComponentFactory from 'src/dashboard/util/newComponentFactory';
import newEntitiesFromDrop from 'src/dashboard/util/newEntitiesFromDrop';
import reorderItem from 'src/dashboard/util/dnd-reorder';
import shouldWrapChildInRow from 'src/dashboard/util/shouldWrapChildInRow';
import {
  withParentsUpdate,
  recursivelyDeleteChildren,
  flagUnsavedChanges,
} from './helpers';

interface DashboardLayoutState {
  layout: DashboardLayout;
}

interface DashboardLayoutActions {
  // setLayout seeds the layout (hydration); it does not flag unsaved changes.
  setLayout: (layout: DashboardLayout) => void;
  updateComponents: (nextComponents: DashboardLayout) => void;
  deleteComponent: (id: string, parentId: string | null) => void;
  createComponent: (dropResult: DropResult) => void;
  moveComponent: (dropResult: DropResult) => void;
  createTopLevelTabs: (dropResult: DropResult) => void;
  deleteTopLevelTabs: () => void;
  resizeComponent: (params: {
    id: string;
    width?: number;
    height?: number;
  }) => void;
  updateDashboardTitle: (text: string) => void;
}

type DashboardLayoutStore = DashboardLayoutState & DashboardLayoutActions;

export const useDashboardLayoutStore = create<DashboardLayoutStore>()(
  devtools(
    subscribeWithSelector(
      temporal(
        (set, get) => ({
          layout: {},

          setLayout: (layout: DashboardLayout) =>
            set(
              { layout: withParentsUpdate({ ...layout }) },
              false,
              'dashboardLayout/setLayout',
            ),

          updateComponents: (nextComponents: DashboardLayout) => {
            set(
              state => ({
                layout: withParentsUpdate({
                  ...state.layout,
                  ...nextComponents,
                }),
              }),
              false,
              'dashboardLayout/updateComponents',
            );
            flagUnsavedChanges();
          },

          deleteComponent: (id: string, parentId: string | null) => {
            const state = get().layout;
            if (!parentId || !id || !state[id] || !state[parentId]) return;

            const nextComponents: DashboardLayout = { ...state };
            recursivelyDeleteChildren(id, parentId, nextComponents);
            const nextParent = nextComponents[parentId];
            if (
              nextParent?.type === ROW_TYPE &&
              nextParent?.children?.length === 0
            ) {
              const grandparentId = findParentId({
                childId: parentId,
                layout: nextComponents,
              });
              if (grandparentId) {
                recursivelyDeleteChildren(
                  parentId,
                  grandparentId,
                  nextComponents,
                );
              }
            }
            set(
              { layout: withParentsUpdate(nextComponents) },
              false,
              'dashboardLayout/deleteComponent',
            );
            flagUnsavedChanges();
          },

          createComponent: (dropResult: DropResult) => {
            const state = get().layout;
            const newEntities = newEntitiesFromDrop({
              dropResult,
              layout: state,
            }) as DashboardLayout;
            set(
              {
                layout: withParentsUpdate({ ...state, ...newEntities }),
              },
              false,
              'dashboardLayout/createComponent',
            );
            flagUnsavedChanges();
          },

          moveComponent: (dropResult: DropResult) => {
            const state = get().layout;
            const { source, destination, dragging, position } = dropResult;
            if (!source || !destination || !dragging) return;

            const nextEntities = reorderItem({
              entitiesMap: state,
              source,
              destination,
              position,
            }) as DashboardLayout;

            if (componentIsResizable(nextEntities[dragging.id])) {
              const nextWidth =
                getComponentWidthFromDrop({ dropResult, layout: state }) ||
                undefined;
              const currentMeta = (nextEntities[dragging.id].meta ||
                {}) as Record<string, unknown>;
              if (currentMeta.width !== nextWidth) {
                nextEntities[dragging.id] = {
                  ...nextEntities[dragging.id],
                  meta: {
                    ...nextEntities[dragging.id].meta,
                    width: nextWidth as number,
                  },
                };
              }
            }

            const wrapInRow = shouldWrapChildInRow({
              parentType: destination.type,
              childType: dragging.type,
            });
            if (wrapInRow) {
              const destinationEntity = nextEntities[destination.id];
              const destinationChildren = destinationEntity.children;
              const newRow = newComponentFactory(ROW_TYPE);
              newRow.children = [destinationChildren[destination.index]];
              newRow.parents = (destinationEntity.parents || []).concat(
                destination.id,
              );
              destinationChildren[destination.index] = newRow.id;
              nextEntities[newRow.id] =
                newRow as unknown as DashboardLayout[string];
            }

            set(
              {
                layout: withParentsUpdate({ ...state, ...nextEntities }),
              },
              false,
              'dashboardLayout/moveComponent',
            );
            flagUnsavedChanges();
          },

          createTopLevelTabs: (dropResult: DropResult) => {
            const state = get().layout;
            const { source, dragging } = dropResult;

            const rootComponent = state[DASHBOARD_ROOT_ID];
            const topLevelId = rootComponent.children[0];
            const topLevelComponent = state[topLevelId];

            let nextLayout: DashboardLayout;
            if (source.id !== NEW_COMPONENTS_SOURCE_ID) {
              // component already exists
              const draggingTabs = state[dragging.id];
              const draggingTabId = draggingTabs.children[0];
              const draggingTab = state[draggingTabId];
              const childrenToMove = [...topLevelComponent.children].filter(
                id => id !== dragging.id,
              );
              nextLayout = {
                ...state,
                [DASHBOARD_ROOT_ID]: {
                  ...rootComponent,
                  children: [dragging.id],
                },
                [topLevelId]: { ...topLevelComponent, children: [] },
                [draggingTabId]: {
                  ...draggingTab,
                  children: [...draggingTab.children, ...childrenToMove],
                },
              };
            } else {
              const newEntities = newEntitiesFromDrop({
                dropResult,
                layout: state,
              }) as DashboardLayout;
              const newEntitiesArray = Object.values(newEntities);
              const tabComponent = newEntitiesArray.find(
                component => component.type === TAB_TYPE,
              );
              const tabsComponent = newEntitiesArray.find(
                component => component.type === TABS_TYPE,
              );
              if (tabComponent && tabsComponent) {
                tabComponent.children = [...topLevelComponent.children];
                newEntities[topLevelId] = {
                  ...topLevelComponent,
                  children: [],
                };
                newEntities[DASHBOARD_ROOT_ID] = {
                  ...rootComponent,
                  children: [tabsComponent.id],
                };
              }
              nextLayout = { ...state, ...newEntities };
            }

            set(
              { layout: withParentsUpdate(nextLayout) },
              false,
              'dashboardLayout/createTopLevelTabs',
            );
            flagUnsavedChanges();
          },

          deleteTopLevelTabs: () => {
            const state = get().layout;
            const rootComponent = state[DASHBOARD_ROOT_ID];
            const topLevelId = rootComponent.children[0];
            const topLevelTabs = state[topLevelId];
            if (topLevelTabs.type !== TABS_TYPE) return;

            let childrenToMove: string[] = [];
            const nextEntities: DashboardLayout = { ...state };
            topLevelTabs.children.forEach((tabId: string) => {
              const tabComponent = state[tabId];
              childrenToMove = [...childrenToMove, ...tabComponent.children];
              delete nextEntities[tabId];
            });
            delete nextEntities[topLevelId];
            nextEntities[DASHBOARD_ROOT_ID] = {
              ...rootComponent,
              children: [DASHBOARD_GRID_ID],
            };
            nextEntities[DASHBOARD_GRID_ID] = {
              ...state[DASHBOARD_GRID_ID],
              children: childrenToMove,
            };

            set(
              { layout: withParentsUpdate(nextEntities) },
              false,
              'dashboardLayout/deleteTopLevelTabs',
            );
            flagUnsavedChanges();
          },

          resizeComponent: ({
            id,
            width,
            height,
          }: {
            id: string;
            width?: number;
            height?: number;
          }) => {
            const state = get().layout;
            const component = state[id];
            if (!component) return;
            const widthChanged = width && component.meta.width !== width;
            const heightChanged = height && component.meta.height !== height;
            if (!widthChanged && !heightChanged) return;

            set(
              {
                layout: withParentsUpdate({
                  ...state,
                  [id]: {
                    ...component,
                    meta: {
                      ...component.meta,
                      width: width || component.meta.width,
                      height: height || component.meta.height,
                    },
                  },
                }),
              },
              false,
              'dashboardLayout/resizeComponent',
            );
            flagUnsavedChanges();
          },

          updateDashboardTitle: (text: string) => {
            const state = get().layout;
            const header = state[DASHBOARD_HEADER_ID];
            set(
              {
                layout: withParentsUpdate({
                  ...state,
                  [DASHBOARD_HEADER_ID]: {
                    ...header,
                    meta: { ...header?.meta, text },
                  } as LayoutItem,
                }),
              },
              false,
              'dashboardLayout/updateDashboardTitle',
            );
            flagUnsavedChanges();
          },
        }),
        {
          limit: 52, // UNDO_LIMIT (50) + 2 to match redux-undo behavior
          equality: (pastState, currentState) =>
            pastState.layout === currentState.layout,
        },
      ),
    ),
    {
      name: 'DashboardLayoutStore',
      enabled: process.env.WEBPACK_MODE === 'development',
    },
  ),
);
