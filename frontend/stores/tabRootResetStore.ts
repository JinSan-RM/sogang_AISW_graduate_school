import { create } from "zustand";

export type TabRootName = "notices" | "community" | "participation";

export type TabRootResetRevisions = Record<TabRootName, number>;

export const INITIAL_TAB_ROOT_RESET_REVISIONS: TabRootResetRevisions = {
  notices: 0,
  community: 0,
  participation: 0,
};

export function shouldRequestTabRootReset(isFocused: boolean) {
  return !isFocused;
}

export function resetRevisionForTab(
  revisions: TabRootResetRevisions,
  tabName: TabRootName,
): TabRootResetRevisions {
  return {
    ...revisions,
    [tabName]: revisions[tabName] + 1,
  };
}

type TabRootResetState = {
  revisions: TabRootResetRevisions;
  requestReset: (tabName: TabRootName) => void;
};

export const useTabRootResetStore = create<TabRootResetState>((set) => ({
  revisions: { ...INITIAL_TAB_ROOT_RESET_REVISIONS },
  requestReset: (tabName) => {
    set((state) => ({
      revisions: resetRevisionForTab(state.revisions, tabName),
    }));
  },
}));

export function requestTabRootReset(tabName: TabRootName) {
  useTabRootResetStore.getState().requestReset(tabName);
}
