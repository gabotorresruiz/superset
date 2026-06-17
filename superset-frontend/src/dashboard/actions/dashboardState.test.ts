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
  JsonResponse,
  SupersetClient,
  isFeatureEnabled,
} from '@superset-ui/core';
import { waitFor } from 'spec/helpers/testing-library';

import {
  SAVE_DASHBOARD_STARTED,
  saveDashboardRequest,
  SET_OVERRIDE_CONFIRM,
  fetchCharts,
  onRefresh,
  ON_FILTERS_REFRESH,
  ON_REFRESH,
  ON_REFRESH_SUCCESS,
  TOGGLE_FAVE_STAR,
  TOGGLE_PUBLISHED,
  fetchFaveStar,
  saveFaveStar,
  savePublished,
  setActiveTab,
  SET_ACTIVE_TAB,
} from 'src/dashboard/actions/dashboardState';
import { refreshChart } from 'src/components/Chart/chartAction';
import { ADD_TOAST } from 'src/components/MessageToasts/actions';
import { ToastType } from 'src/components/MessageToasts/types';
import {
  useDashboardLayoutStore,
  useDashboardStateStore,
  useDashboardInfoStore,
} from 'src/dashboard/stores';
import type { DashboardInfo, DashboardLayout } from 'src/dashboard/types';
import {
  SAVE_TYPE_OVERWRITE,
  SAVE_TYPE_OVERWRITE_CONFIRMED,
  SAVE_TYPE_NEWDASHBOARD,
} from 'src/dashboard/util/constants';
import {
  filterId,
  sliceEntitiesForDashboard as sliceEntities,
} from 'spec/fixtures/mockSliceEntities';
import { emptyFilters } from 'spec/fixtures/mockDashboardFilters';
import mockDashboardData from 'spec/fixtures/mockDashboardData';
import { queryClient } from 'src/queries/queryClient';
import { dashboardKeys } from 'src/dashboard/queries/keys';
import { navigateTo } from 'src/utils/navigationUtils';

jest.mock('@superset-ui/core', () => ({
  ...jest.requireActual('@superset-ui/core'),
  isFeatureEnabled: jest.fn(),
}));

jest.mock('src/components/Chart/chartAction', () => ({
  refreshChart: jest.fn(() => () => Promise.resolve()),
}));

jest.mock('src/utils/navigationUtils', () => ({
  navigateTo: jest.fn(),
  navigateWithState: jest.fn(),
}));

const mockIsFeatureEnabled = isFeatureEnabled as jest.Mock;
const mockNavigateTo = navigateTo as jest.Mock;

// eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
describe('dashboardState actions', () => {
  const mockState = {
    dashboardState: {
      sliceIds: [filterId],
      hasUnsavedChanges: true,
    },
    dashboardInfo: {
      metadata: {
        color_scheme: 'supersetColors',
      },
    },
    sliceEntities,
    dashboardFilters: emptyFilters,
    dashboardLayout: {
      past: [],
      present: mockDashboardData.positions,
      future: {},
    },
    charts: {},
  };
  const newDashboardData = mockDashboardData;

  let postStub: jest.SpyInstance;
  let getStub: jest.SpyInstance;
  let putStub: jest.SpyInstance;
  const updatedCss = '.updated_css_value {\n  color: black;\n}';

  beforeEach(() => {
    postStub = jest
      .spyOn(SupersetClient, 'post')
      .mockResolvedValue('the value you want to return' as any);
    getStub = jest.spyOn(SupersetClient, 'get').mockResolvedValue({
      json: {
        result: {
          ...mockDashboardData,
          css: updatedCss,
        },
      },
    } as any);
    putStub = jest.spyOn(SupersetClient, 'put').mockResolvedValue({
      json: {
        result: mockDashboardData,
      },
    } as any);
  });
  afterEach(() => {
    postStub.mockRestore();
    getStub.mockRestore();
    putStub.mockRestore();
  });

  function setup(stateOverrides: Record<string, unknown> = {}) {
    const state = { ...mockState, ...stateOverrides };
    useDashboardInfoStore.setState({
      dashboardInfo: (state.dashboardInfo || {}) as DashboardInfo,
    });
    const getState = jest.fn(() => state) as unknown as () => any;
    const dispatch = jest.fn();
    return { getState, dispatch, state };
  }

  // eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
  describe('saveDashboardRequest', () => {
    test('starts the save by dispatching SAVE_DASHBOARD_STARTED', () => {
      const { getState, dispatch } = setup({
        dashboardState: { hasUnsavedChanges: false },
      });
      const thunk = saveDashboardRequest(newDashboardData, 1, 'save_dash');
      thunk(dispatch, getState);
      expect(dispatch.mock.calls[0][0].type).toBe(SAVE_DASHBOARD_STARTED);
    });

    test('posts dashboard data with serialized positions on save', () => {
      const { getState, dispatch } = setup({
        dashboardState: { hasUnsavedChanges: false },
      });
      useDashboardLayoutStore
        .getState()
        .setLayout(newDashboardData.positions as any);

      const thunk = saveDashboardRequest(newDashboardData, 1, 'save_dash');
      thunk(dispatch, getState);
      expect(postStub.mock.calls.length).toBe(1);
      const { jsonPayload } = postStub.mock.calls[0][0];
      const parsedJsonMetadata = JSON.parse(jsonPayload.json_metadata);
      // The whole positions tree must round-trip through save: every component
      // (incl. its parents, children, and meta) lands in json_metadata.positions.
      expect(parsedJsonMetadata.positions).toEqual(newDashboardData.positions);
    });

    // eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
    describe('FeatureFlag.CONFIRM_DASHBOARD_DIFF', () => {
      beforeEach(() => {
        mockIsFeatureEnabled.mockImplementation(
          (feature: string) => feature === 'CONFIRM_DASHBOARD_DIFF',
        );
      });

      afterEach(() => {
        mockIsFeatureEnabled.mockRestore();
      });

      test('dispatches SET_OVERRIDE_CONFIRM when an inspect value has diff', async () => {
        const id = 192;
        const { getState, dispatch } = setup();
        const thunk = saveDashboardRequest(
          newDashboardData,
          id,
          SAVE_TYPE_OVERWRITE,
        );
        thunk(dispatch, getState);
        expect(getStub.mock.calls.length).toBe(1);
        expect(postStub.mock.calls.length).toBe(0);
        await waitFor(() =>
          expect(
            dispatch.mock.calls.some(
              call => call[0]?.type === SET_OVERRIDE_CONFIRM,
            ),
          ).toBe(true),
        );
        const overrideConfirmCall = dispatch.mock.calls.find(
          call => call[0]?.type === SET_OVERRIDE_CONFIRM,
        );
        expect(
          overrideConfirmCall?.[0].overwriteConfirmMetadata.dashboardId,
        ).toBe(id);
      });

      test('should post dashboard data with after confirm the overwrite values', async () => {
        const id = 192;
        const { getState, dispatch } = setup();
        const confirmedDashboardData = {
          ...newDashboardData,
          css: updatedCss,
        };
        const thunk = saveDashboardRequest(
          confirmedDashboardData,
          id,
          SAVE_TYPE_OVERWRITE_CONFIRMED,
        );
        thunk(dispatch, getState);
        expect(getStub.mock.calls.length).toBe(0);
        expect(postStub.mock.calls.length).toBe(0);
        await waitFor(() => expect(putStub.mock.calls.length).toBe(1));
        const { body } = putStub.mock.calls[0][0];
        expect(body).toBe(JSON.stringify(confirmedDashboardData));
      });
    });

    test('rejects when the PUT fails so callers can detect save failure', async () => {
      const { getState, dispatch } = setup({
        dashboardState: { hasUnsavedChanges: true },
      });
      putStub.mockRestore();
      putStub = jest
        .spyOn(SupersetClient, 'put')
        .mockRejectedValue(
          new Response('500', { status: 500 }) as unknown as Response,
        );

      const thunk = saveDashboardRequest(
        newDashboardData,
        1,
        SAVE_TYPE_OVERWRITE_CONFIRMED,
      );
      await expect(thunk(dispatch, getState)).rejects.toBeDefined();
      expect(putStub.mock.calls.length).toBe(1);
    });

    test('invalidates the detail cache on a successful in-place save', async () => {
      // In-place saves run through this thunk, so detail invalidation lives here
      // rather than in useSaveDashboard — that keeps OverwriteConfirmModal's
      // direct dispatch consistent with the mutation wrapper.
      const id = 192;
      const { getState, dispatch } = setup({
        dashboardState: { hasUnsavedChanges: true },
      });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      await saveDashboardRequest(
        newDashboardData,
        id,
        SAVE_TYPE_OVERWRITE_CONFIRMED,
      )(dispatch, getState);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: dashboardKeys.detail(id),
      });
      invalidateSpy.mockRestore();
    });

    test('rebaselines the discard snapshot to the saved state on an in-place save', async () => {
      // After a save the live stores hold the saved state, so the snapshot is
      // rebaselined to it (not dropped) and a later discard stays in-place.
      const id = 192;
      const { getState, dispatch } = setup({
        dashboardState: { hasUnsavedChanges: true },
      });
      queryClient.setQueryData(dashboardKeys.hydrationPayload(id), {
        dashboardLayout: { present: { OLD: { id: 'OLD' } } },
        sliceEntities: { slices: {} },
        zustandStateSeed: { hasUnsavedChanges: true },
      });
      // The live (saved) layout the rebaseline should capture.
      useDashboardLayoutStore.setState({
        layout: { NEW: { id: 'NEW' } },
      } as never);

      await saveDashboardRequest(
        newDashboardData,
        id,
        SAVE_TYPE_OVERWRITE_CONFIRMED,
      )(dispatch, getState);

      const snapshot = queryClient.getQueryData(
        dashboardKeys.hydrationPayload(id),
      ) as { dashboardLayout: { present: Record<string, unknown> } };
      // Snapshot is rebaselined in place, not dropped, and reflects the saved layout.
      expect(snapshot).toBeDefined();
      expect(snapshot.dashboardLayout.present).toEqual({ NEW: { id: 'NEW' } });
    });

    test('should navigate to the new dashboard after Save As', async () => {
      const newDashboardId = 999;
      const { getState, dispatch } = setup({
        dashboardState: { hasUnsavedChanges: true },
      });

      postStub.mockRestore();
      postStub = jest.spyOn(SupersetClient, 'post').mockResolvedValue({
        json: {
          result: {
            ...mockDashboardData,
            id: newDashboardId,
          },
        },
      } as any);

      const thunk = saveDashboardRequest(
        newDashboardData,
        null as unknown as number,
        SAVE_TYPE_NEWDASHBOARD,
      );
      await thunk(dispatch, getState);

      await waitFor(() => expect(postStub.mock.calls.length).toBe(1));
      expect(mockNavigateTo).toHaveBeenCalledWith(
        `/superset/dashboard/${newDashboardId}/`,
      );
    });
  });

  test('fetchCharts returns a Promise that resolves after all refreshes', async () => {
    (refreshChart as jest.Mock).mockClear();
    const { getState } = setup({
      dashboardInfo: {
        metadata: {},
        common: { conf: { SUPERSET_WEBSERVER_TIMEOUT: 60 } },
      },
    });
    const dispatch = (action: unknown): unknown => {
      if (typeof action === 'function') {
        return (action as Function)(dispatch, getState);
      }
      return action;
    };
    const chartIds = [1, 2];
    const promise = fetchCharts(chartIds, false, 0, 10)(dispatch);
    await promise;

    expect(refreshChart).toHaveBeenCalledTimes(chartIds.length);
  });

  test('fetchCharts resolves for staggered refreshes', async () => {
    jest.useFakeTimers();
    (refreshChart as jest.Mock).mockClear();
    const { getState } = setup({
      dashboardInfo: {
        metadata: { stagger_time: 1000, stagger_refresh: true },
        common: { conf: { SUPERSET_WEBSERVER_TIMEOUT: 60 } },
      },
    });
    const dispatch = (action: unknown): unknown => {
      if (typeof action === 'function') {
        return (action as Function)(dispatch, getState);
      }
      return action;
    };
    const chartIds = [1, 2, 3];
    const promise = fetchCharts(chartIds, false, 1000, 10)(dispatch);

    jest.runAllTimers();
    await promise;
    jest.useRealTimers();

    expect(refreshChart).toHaveBeenCalledTimes(chartIds.length);
  });

  test('fetchCharts rejects for staggered refreshes when any chart refresh fails', async () => {
    jest.useFakeTimers();
    (refreshChart as jest.Mock).mockClear();
    (refreshChart as jest.Mock).mockImplementation(
      (chartKey: number) => () =>
        chartKey === 2
          ? Promise.reject(new Error('refresh failed'))
          : Promise.resolve(),
    );
    const { getState } = setup({
      dashboardInfo: {
        metadata: { stagger_time: 1000, stagger_refresh: true },
        common: { conf: { SUPERSET_WEBSERVER_TIMEOUT: 60 } },
      },
    });
    const dispatch = (action: unknown): unknown => {
      if (typeof action === 'function') {
        return (action as Function)(dispatch, getState);
      }
      return action;
    };
    const chartIds = [1, 2, 3];
    const promise = fetchCharts(chartIds, false, 1000, 10)(dispatch);

    jest.runAllTimers();
    await expect(promise).rejects.toThrow('refresh failed');
    jest.useRealTimers();
    (refreshChart as jest.Mock).mockImplementation(
      () => () => Promise.resolve(),
    );
  });

  test('onRefresh dispatches success and filters refresh by default', async () => {
    const { getState } = setup({
      dashboardInfo: {
        metadata: {},
        common: { conf: { SUPERSET_WEBSERVER_TIMEOUT: 60 } },
      },
    });
    const dispatched: { type: string }[] = [];
    const dispatch = (action: unknown): unknown => {
      if (typeof action === 'function') {
        return (action as Function)(dispatch, getState);
      }
      dispatched.push(action as { type: string });
      return action;
    };

    await onRefresh([1], true, 0, 10)(dispatch as never);

    expect(dispatched.map(action => action.type)).toEqual(
      expect.arrayContaining([
        ON_REFRESH,
        ON_REFRESH_SUCCESS,
        ON_FILTERS_REFRESH,
      ]),
    );
  });

  test('onRefresh skips filter refresh when requested', async () => {
    const { getState } = setup({
      dashboardInfo: {
        metadata: {},
        common: { conf: { SUPERSET_WEBSERVER_TIMEOUT: 60 } },
      },
    });
    const dispatched: { type: string }[] = [];
    const dispatch = (action: unknown): unknown => {
      if (typeof action === 'function') {
        return (action as Function)(dispatch, getState);
      }
      dispatched.push(action as { type: string });
      return action;
    };

    await onRefresh([1], true, 0, 10, true)(dispatch as never);

    const dispatchedTypes = dispatched.map(action => action.type);
    expect(dispatchedTypes).toEqual(
      expect.arrayContaining([ON_REFRESH, ON_REFRESH_SUCCESS]),
    );
    expect(dispatchedTypes).not.toContain(ON_FILTERS_REFRESH);
  });

  test('onRefresh skips ON_REFRESH and filters refresh for lazy-loaded tabs', async () => {
    const { getState } = setup({
      dashboardInfo: {
        metadata: {},
        common: { conf: { SUPERSET_WEBSERVER_TIMEOUT: 60 } },
      },
    });
    const dispatched: { type: string }[] = [];
    const dispatch = (action: unknown): unknown => {
      if (typeof action === 'function') {
        return (action as Function)(dispatch, getState);
      }
      dispatched.push(action as { type: string });
      return action;
    };

    await onRefresh([1], true, 0, 10, false, true)(dispatch as never);

    const dispatchedTypes = dispatched.map(action => action.type);
    expect(dispatchedTypes).toContain(ON_REFRESH_SUCCESS);
    expect(dispatchedTypes).not.toContain(ON_REFRESH);
    expect(dispatchedTypes).not.toContain(ON_FILTERS_REFRESH);
  });

  test('setActiveTab restores multi-depth nested inactive tabs', () => {
    const { getState, dispatch } = setup();
    useDashboardStateStore.setState({
      activeTabs: [],
      inactiveTabs: ['TAB-B', 'TAB-C'],
    });
    useDashboardLayoutStore.getState().setLayout({
      'TAB-A': { id: 'TAB-A', type: 'TAB', parents: ['ROOT_ID', 'TABS-1'] },
      'TAB-B': {
        id: 'TAB-B',
        type: 'TAB',
        parents: ['ROOT_ID', 'TABS-1', 'TAB-A', 'TABS-2'],
      },
      'TAB-C': {
        id: 'TAB-C',
        type: 'TAB',
        parents: ['ROOT_ID', 'TABS-1', 'TAB-A', 'TABS-2', 'TAB-B', 'TABS-3'],
      },
    } as unknown as DashboardLayout);

    setActiveTab('TAB-A')(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SET_ACTIVE_TAB,
        activeTabs: ['TAB-A', 'TAB-B', 'TAB-C'],
      }),
    );
  });

  // eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
  describe('fetchFaveStar race condition', () => {
    test('dispatches TOGGLE_FAVE_STAR when the dashboard ID still matches', async () => {
      const id = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      getStub.mockRestore();
      getStub = jest.spyOn(SupersetClient, 'get').mockResolvedValue({
        json: { result: [{ value: true }] },
      } as unknown as JsonResponse);

      await fetchFaveStar(id)(dispatch, getState);

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({
        type: TOGGLE_FAVE_STAR,
        isStarred: true,
      });
    });

    test('does NOT dispatch when the dashboard ID changed before the response resolved', async () => {
      const requestedId = 123;
      // User navigated to a different dashboard by the time the response comes back
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id: 456,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      getStub.mockRestore();
      getStub = jest.spyOn(SupersetClient, 'get').mockResolvedValue({
        json: { result: [{ value: true }] },
      } as unknown as JsonResponse);

      await fetchFaveStar(requestedId)(dispatch, getState);

      expect(dispatch).not.toHaveBeenCalled();
    });

    test('dispatches a danger toast on error when the dashboard ID still matches', async () => {
      const id = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      getStub.mockRestore();
      getStub = jest
        .spyOn(SupersetClient, 'get')
        .mockRejectedValue(new Error('network'));

      await fetchFaveStar(id)(dispatch, getState);

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          type: ADD_TOAST,
          payload: expect.objectContaining({
            toastType: ToastType.Danger,
          }),
        }),
      );
    });

    test('does NOT dispatch a danger toast on error when the dashboard ID changed', async () => {
      const requestedId = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id: 456,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      getStub.mockRestore();
      getStub = jest
        .spyOn(SupersetClient, 'get')
        .mockRejectedValue(new Error('network'));

      await fetchFaveStar(requestedId)(dispatch, getState);

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  // eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
  describe('saveFaveStar race condition', () => {
    let deleteStub: jest.SpyInstance;

    beforeEach(() => {
      deleteStub = jest
        .spyOn(SupersetClient, 'delete')
        .mockResolvedValue({} as unknown as JsonResponse);
    });

    afterEach(() => {
      deleteStub.mockRestore();
    });

    test('dispatches TOGGLE_FAVE_STAR when the dashboard ID still matches (starring)', async () => {
      const id = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      postStub.mockRestore();
      postStub = jest
        .spyOn(SupersetClient, 'post')
        .mockResolvedValue({} as unknown as JsonResponse);

      await saveFaveStar(id, false)(dispatch, getState);

      expect(postStub).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({
        type: TOGGLE_FAVE_STAR,
        isStarred: true,
      });
    });

    test('dispatches TOGGLE_FAVE_STAR when the dashboard ID still matches (unstarring)', async () => {
      const id = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      await saveFaveStar(id, true)(dispatch, getState);

      expect(deleteStub).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({
        type: TOGGLE_FAVE_STAR,
        isStarred: false,
      });
    });

    test('does NOT dispatch when the dashboard ID changed before the response resolved', async () => {
      const requestedId = 123;
      // User navigated to a different dashboard by the time the response comes back
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id: 456,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      postStub.mockRestore();
      postStub = jest
        .spyOn(SupersetClient, 'post')
        .mockResolvedValue({} as unknown as JsonResponse);

      await saveFaveStar(requestedId, false)(dispatch, getState);

      expect(postStub).toHaveBeenCalledTimes(1);
      expect(dispatch).not.toHaveBeenCalled();
    });

    test('dispatches a danger toast on error when the dashboard ID still matches', async () => {
      const id = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      postStub.mockRestore();
      postStub = jest
        .spyOn(SupersetClient, 'post')
        .mockRejectedValue(new Error('network'));

      await saveFaveStar(id, false)(dispatch, getState);

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          type: ADD_TOAST,
          payload: expect.objectContaining({
            toastType: ToastType.Danger,
          }),
        }),
      );
    });

    test('does NOT dispatch a danger toast on error when the dashboard ID changed', async () => {
      const requestedId = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id: 456,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      postStub.mockRestore();
      postStub = jest
        .spyOn(SupersetClient, 'post')
        .mockRejectedValue(new Error('network'));

      await saveFaveStar(requestedId, false)(dispatch, getState);

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  // eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
  describe('savePublished race condition', () => {
    test('dispatches success toast and TOGGLE_PUBLISHED when the dashboard ID still matches', async () => {
      const id = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      putStub.mockRestore();
      putStub = jest
        .spyOn(SupersetClient, 'put')
        .mockResolvedValue({} as unknown as JsonResponse);

      await savePublished(id, true)(dispatch, getState);

      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(dispatch.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          type: ADD_TOAST,
          payload: expect.objectContaining({
            toastType: ToastType.Success,
          }),
        }),
      );
      expect(dispatch).toHaveBeenCalledWith({
        type: TOGGLE_PUBLISHED,
        isPublished: true,
      });
    });

    test('rebaselines the discard snapshot on publish so a later discard stays in-place', async () => {
      const id = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: { id, metadata: {} },
      });
      queryClient.setQueryData(dashboardKeys.hydrationPayload(id), {
        dashboardInfo: { id },
        dashboardLayout: { present: {} },
        sliceEntities: { slices: {} },
        zustandStateSeed: { isPublished: false },
      });
      putStub.mockRestore();
      putStub = jest
        .spyOn(SupersetClient, 'put')
        .mockResolvedValue({} as unknown as JsonResponse);

      await savePublished(id, true)(dispatch, getState);

      const snapshot = queryClient.getQueryData(
        dashboardKeys.hydrationPayload(id),
      ) as { zustandStateSeed: { isPublished: boolean } };
      // Rebaselined in place (not dropped); the persisted publish state survives discard.
      expect(snapshot).toBeDefined();
      expect(snapshot.zustandStateSeed.isPublished).toBe(true);
    });

    test('does NOT dispatch when the dashboard ID changed before the response resolved', async () => {
      const requestedId = 123;
      // User navigated to a different dashboard by the time the response comes back
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id: 456,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      putStub.mockRestore();
      putStub = jest
        .spyOn(SupersetClient, 'put')
        .mockResolvedValue({} as unknown as JsonResponse);

      await savePublished(requestedId, true)(dispatch, getState);

      expect(putStub).toHaveBeenCalledTimes(1);
      expect(dispatch).not.toHaveBeenCalled();
    });

    test('dispatches a danger toast on error when the dashboard ID still matches', async () => {
      const id = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      putStub.mockRestore();
      putStub = jest
        .spyOn(SupersetClient, 'put')
        .mockRejectedValue(new Error('forbidden'));

      await savePublished(id, true)(dispatch, getState);

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          type: ADD_TOAST,
          payload: expect.objectContaining({
            toastType: ToastType.Danger,
          }),
        }),
      );
    });

    test('does NOT dispatch a danger toast on error when the dashboard ID changed', async () => {
      const requestedId = 123;
      const { getState, dispatch } = setup({
        dashboardInfo: {
          id: 456,
          metadata: { color_scheme: 'supersetColors' },
        },
      });

      putStub.mockRestore();
      putStub = jest
        .spyOn(SupersetClient, 'put')
        .mockRejectedValue(new Error('forbidden'));

      await savePublished(requestedId, true)(dispatch, getState);

      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
