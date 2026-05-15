import { useEffect, useMemo } from 'react';
import {
  clearWorkspaceAllFilterSets,
  clearWorkspaceFilterSet,
  createWorkspaceFilterSet,
  duplicateWorkspaceFilterSet,
  removeWorkspaceFilterSet,
  useWorkspaceFilterSet,
} from '../../redux/explorer/slice';
import { workspacesSessionStorageKey } from '../../redux/explorer/utils';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';

/** @typedef {import("../types").ExplorerFilter} ExplorerFilter */
/** @typedef {import("../types").ExplorerFilterSet} ExplorerFilterSet */

export default function useFilterSetWorkspace() {
  const dispatch = useAppDispatch();
  const explorerId = useAppSelector((s) => s.explorer.explorerId);
  const workspaces = useAppSelector((s) => s.explorer.workspaces);

  // Location-state filter injection is handled by ExplorerDashboard before
  // GuppyWrapper mounts, so it no longer needs to be done here.
  useEffect(() => {
    // sync browser store with workspace state
    const json = JSON.stringify(workspaces);
    window.sessionStorage.setItem(workspacesSessionStorageKey, json);
  }, [workspaces]);

  return useMemo(
    () => ({
      ...workspaces[explorerId],
      size: Object.keys(workspaces[explorerId].all).length,
      clear() {
        dispatch(clearWorkspaceFilterSet());
      },
      clearAll() {
        dispatch(clearWorkspaceAllFilterSets());
      },
      create() {
        dispatch(createWorkspaceFilterSet());
      },
      duplicate() {
        dispatch(duplicateWorkspaceFilterSet());
      },
      load(filterSet) {
        dispatch(loadWorkspaceFilterSet(filterSet));
      },
      remove() {
        dispatch(removeWorkspaceFilterSet());
      },
      use(id) {
        dispatch(useWorkspaceFilterSet(id));
      },
    }),
    [workspaces, explorerId]
  );
}
