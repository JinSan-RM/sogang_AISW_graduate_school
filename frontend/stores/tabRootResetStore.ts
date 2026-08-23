import { create } from "zustand";

import {
  COMMUNITY_TAB_ROUTE,
  COUNCIL_TAB_ROUTE,
  HOME_TAB_ROUTE,
  NOTICES_TAB_ROUTE,
  PARTICIPATION_TAB_ROUTE,
} from "../utils/appRoutes";

export type TabRootName = "notices" | "community" | "participation";
export type VisibleTabRootName = "home" | TabRootName | "council";

type VisibleTabRootRoute =
  | typeof HOME_TAB_ROUTE
  | typeof NOTICES_TAB_ROUTE
  | typeof COMMUNITY_TAB_ROUTE
  | typeof PARTICIPATION_TAB_ROUTE
  | typeof COUNCIL_TAB_ROUTE;

type TabRootPressAction = {
  route: VisibleTabRootRoute;
  resetTab: TabRootName | null;
};

const TAB_ROOT_PRESS_ACTIONS: Record<VisibleTabRootName, TabRootPressAction> = {
  home: { route: HOME_TAB_ROUTE, resetTab: null },
  notices: { route: NOTICES_TAB_ROUTE, resetTab: "notices" },
  community: { route: COMMUNITY_TAB_ROUTE, resetTab: "community" },
  participation: { route: PARTICIPATION_TAB_ROUTE, resetTab: "participation" },
  council: { route: COUNCIL_TAB_ROUTE, resetTab: null },
};

export type TabRootResetRevisions = Record<TabRootName, number>;

export const INITIAL_TAB_ROOT_RESET_REVISIONS: TabRootResetRevisions = {
  notices: 0,
  community: 0,
  participation: 0,
};

export function tabRootPressAction(tabName: VisibleTabRootName) {
  return TAB_ROOT_PRESS_ACTIONS[tabName];
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
