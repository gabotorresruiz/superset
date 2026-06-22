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

import type { LayoutItem, LayoutItemMeta } from 'src/dashboard/types';
import type { DropResult } from 'src/dashboard/components/dnd/dragDroppableConfig';
import {
  DASHBOARD_ROOT_ID,
  DASHBOARD_GRID_ID,
} from 'src/dashboard/util/constants';
import { TABS_TYPE, TAB_TYPE } from 'src/dashboard/util/componentTypes';
import {
  deleteComponentFromLayout,
  deleteTopLevelTabsFromLayout,
  resizeComponentInLayout,
  moveComponentInLayout,
  createTopLevelTabsInLayout,
} from './operations';

// operations import ./helpers, which pulls in the dashboardState store; load the
// real zustand so that module graph initializes (the operations themselves are pure).
jest.unmock('zustand');

const item = (
  partial: Partial<LayoutItem> & Pick<LayoutItem, 'id'>,
): LayoutItem => ({
  type: 'CHART',
  children: [],
  meta: {} as LayoutItemMeta,
  ...partial,
});

describe('deleteComponentFromLayout', () => {
  test('removes the component and detaches it from its parent', () => {
    const layout = {
      ROW: item({ id: 'ROW', type: 'ROW', children: ['CHART'] }),
      CHART: item({ id: 'CHART', type: 'CHART' }),
    };
    const next = deleteComponentFromLayout(layout, 'CHART', 'ROW');
    expect(next).not.toBeNull();
    expect(next!.CHART).toBeUndefined();
    expect(next!.ROW.children).toEqual([]);
  });

  test('recursively removes descendants', () => {
    const layout = {
      GRID: item({ id: 'GRID', type: 'GRID', children: ['ROW'] }),
      ROW: item({ id: 'ROW', type: 'ROW', children: ['CHART'] }),
      CHART: item({ id: 'CHART', type: 'CHART' }),
    };
    // Deleting the ROW should also drop its CHART descendant.
    const next = deleteComponentFromLayout(layout, 'ROW', 'GRID');
    expect(next!.ROW).toBeUndefined();
    expect(next!.CHART).toBeUndefined();
    expect(next!.GRID.children).toEqual([]);
  });

  test('removes an emptied Row parent from its grandparent', () => {
    const layout = {
      GRID: item({ id: 'GRID', type: 'GRID', children: ['ROW'] }),
      ROW: item({ id: 'ROW', type: 'ROW', children: ['CHART'] }),
      CHART: item({ id: 'CHART', type: 'CHART' }),
    };
    // Deleting the only child collapses the now-empty ROW too.
    const next = deleteComponentFromLayout(layout, 'CHART', 'ROW');
    expect(next!.CHART).toBeUndefined();
    expect(next!.ROW).toBeUndefined();
    expect(next!.GRID.children).toEqual([]);
  });

  test.each([
    ['null parentId', 'CHART', null],
    ['empty id', '', 'ROW'],
    ['id not in layout', 'MISSING', 'ROW'],
    ['parent not in layout', 'CHART', 'MISSING'],
  ])('returns null for a no-op (%s)', (_label, id, parentId) => {
    const layout = {
      ROW: item({ id: 'ROW', type: 'ROW', children: ['CHART'] }),
      CHART: item({ id: 'CHART', type: 'CHART' }),
    };
    expect(deleteComponentFromLayout(layout, id, parentId)).toBeNull();
  });

  test('does not mutate the input layout', () => {
    const layout = {
      ROW: item({ id: 'ROW', type: 'ROW', children: ['CHART'] }),
      CHART: item({ id: 'CHART', type: 'CHART' }),
    };
    deleteComponentFromLayout(layout, 'CHART', 'ROW');
    expect(layout.CHART).toBeDefined();
    expect(layout.ROW.children).toEqual(['CHART']);
  });
});

describe('deleteTopLevelTabsFromLayout', () => {
  test('returns null when the top-level component is not TABS', () => {
    const layout = {
      [DASHBOARD_ROOT_ID]: item({
        id: DASHBOARD_ROOT_ID,
        type: 'ROOT',
        children: [DASHBOARD_GRID_ID],
      }),
      [DASHBOARD_GRID_ID]: item({ id: DASHBOARD_GRID_ID, type: 'GRID' }),
    };
    expect(deleteTopLevelTabsFromLayout(layout)).toBeNull();
  });

  test('migrates tab children into the grid and repoints root', () => {
    const layout = {
      [DASHBOARD_ROOT_ID]: item({
        id: DASHBOARD_ROOT_ID,
        type: 'ROOT',
        children: ['TABS'],
      }),
      TABS: item({ id: 'TABS', type: TABS_TYPE, children: ['TAB1', 'TAB2'] }),
      TAB1: item({ id: 'TAB1', type: TAB_TYPE, children: ['CHART_A'] }),
      TAB2: item({ id: 'TAB2', type: TAB_TYPE, children: ['CHART_B'] }),
      CHART_A: item({ id: 'CHART_A' }),
      CHART_B: item({ id: 'CHART_B' }),
      [DASHBOARD_GRID_ID]: item({ id: DASHBOARD_GRID_ID, type: 'GRID' }),
    };
    const next = deleteTopLevelTabsFromLayout(layout)!;
    expect(next.TABS).toBeUndefined();
    expect(next.TAB1).toBeUndefined();
    expect(next.TAB2).toBeUndefined();
    expect(next[DASHBOARD_ROOT_ID].children).toEqual([DASHBOARD_GRID_ID]);
    expect(next[DASHBOARD_GRID_ID].children).toEqual(['CHART_A', 'CHART_B']);
  });
});

describe('resizeComponentInLayout', () => {
  const base = {
    CHART: item({
      id: 'CHART',
      meta: { width: 4, height: 20 } as LayoutItemMeta,
    }),
  };

  test('updates width and height', () => {
    const next = resizeComponentInLayout(base, {
      id: 'CHART',
      width: 6,
      height: 30,
    })!;
    expect(next.CHART.meta.width).toBe(6);
    expect(next.CHART.meta.height).toBe(30);
  });

  test('updates only the width when height is omitted', () => {
    const next = resizeComponentInLayout(base, { id: 'CHART', width: 8 })!;
    expect(next.CHART.meta.width).toBe(8);
    expect(next.CHART.meta.height).toBe(20);
  });

  test('returns null when the component is missing', () => {
    expect(
      resizeComponentInLayout(base, { id: 'MISSING', width: 6 }),
    ).toBeNull();
  });

  test('returns null when nothing changes', () => {
    expect(
      resizeComponentInLayout(base, { id: 'CHART', width: 4, height: 20 }),
    ).toBeNull();
  });
});

describe('moveComponentInLayout', () => {
  test.each([
    ['no source', { destination: { id: 'D' }, dragging: { id: 'X' } }],
    ['no destination', { source: { id: 'S' }, dragging: { id: 'X' } }],
    ['no dragging', { source: { id: 'S' }, destination: { id: 'D' } }],
  ])('returns null when %s', (_label, dropResult) => {
    expect(
      moveComponentInLayout({}, dropResult as unknown as DropResult),
    ).toBeNull();
  });
});

describe('createTopLevelTabsInLayout', () => {
  test('folds an existing tabs drag into the new top-level tabs', () => {
    const layout = {
      [DASHBOARD_ROOT_ID]: item({
        id: DASHBOARD_ROOT_ID,
        type: 'ROOT',
        children: [DASHBOARD_GRID_ID],
      }),
      [DASHBOARD_GRID_ID]: item({
        id: DASHBOARD_GRID_ID,
        type: 'GRID',
        children: ['CHART_A'],
      }),
      CHART_A: item({ id: 'CHART_A' }),
      'TABS-DRAG': item({
        id: 'TABS-DRAG',
        type: TABS_TYPE,
        children: ['TAB-DRAG'],
      }),
      'TAB-DRAG': item({ id: 'TAB-DRAG', type: TAB_TYPE, children: [] }),
    };
    const dropResult = {
      source: { id: 'some-existing-source' },
      dragging: { id: 'TABS-DRAG' },
    } as unknown as DropResult;

    const next = createTopLevelTabsInLayout(layout, dropResult);
    // Root now points at the dragged tabs; the old grid is emptied; the
    // dragged tab absorbs the grid's former children.
    expect(next[DASHBOARD_ROOT_ID].children).toEqual(['TABS-DRAG']);
    expect(next[DASHBOARD_GRID_ID].children).toEqual([]);
    expect(next['TAB-DRAG'].children).toEqual(['CHART_A']);
  });

  test('does not mutate the input layout', () => {
    const layout = {
      [DASHBOARD_ROOT_ID]: item({
        id: DASHBOARD_ROOT_ID,
        type: 'ROOT',
        children: [DASHBOARD_GRID_ID],
      }),
      [DASHBOARD_GRID_ID]: item({
        id: DASHBOARD_GRID_ID,
        type: 'GRID',
        children: ['CHART_A'],
      }),
      CHART_A: item({ id: 'CHART_A' }),
      'TABS-DRAG': item({
        id: 'TABS-DRAG',
        type: TABS_TYPE,
        children: ['TAB-DRAG'],
      }),
      'TAB-DRAG': item({ id: 'TAB-DRAG', type: TAB_TYPE, children: [] }),
    };
    createTopLevelTabsInLayout(layout, {
      source: { id: 'some-existing-source' },
      dragging: { id: 'TABS-DRAG' },
    } as unknown as DropResult);
    expect(layout[DASHBOARD_GRID_ID].children).toEqual(['CHART_A']);
    expect(layout[DASHBOARD_ROOT_ID].children).toEqual([DASHBOARD_GRID_ID]);
  });
});
