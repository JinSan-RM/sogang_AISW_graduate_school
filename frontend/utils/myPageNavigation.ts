import {
  COMMUNITY_TAB_ROUTE,
  COUNCIL_TAB_ROUTE,
  HOME_TAB_ROUTE,
  NOTICES_TAB_ROUTE,
  PARTICIPATION_TAB_ROUTE,
} from "./appRoutes";

export const MY_PAGE_ORIGIN_ROUTES = [
  HOME_TAB_ROUTE,
  NOTICES_TAB_ROUTE,
  COMMUNITY_TAB_ROUTE,
  PARTICIPATION_TAB_ROUTE,
  COUNCIL_TAB_ROUTE,
] as const;

export type MyPageOriginRoute = (typeof MY_PAGE_ORIGIN_ROUTES)[number];

export const MY_PAGE_DRAWER_SETTINGS_ROUTES = [
  "/settings/profile",
  "/settings/notifications",
  "/settings/account",
] as const;

export type MyPageDrawerSettingsRoute = (typeof MY_PAGE_DRAWER_SETTINGS_ROUTES)[number];

export function myPageOriginRoute(value: unknown): MyPageOriginRoute | null {
  if (typeof value !== "string") return null;
  const withoutGroup = value.replace(/^\/\(tabs\)/, "");
  const normalized = withoutGroup.length > 1 ? withoutGroup.replace(/\/+$/, "") : withoutGroup;
  const route = MY_PAGE_ORIGIN_ROUTES.find((candidate) => candidate.replace("/(tabs)", "") === normalized);
  return route ?? null;
}

export function myPageOriginOrHome(value: unknown): MyPageOriginRoute {
  return myPageOriginRoute(value) ?? HOME_TAB_ROUTE;
}

type MyPageReturnNavigator = {
  navigate: (route: MyPageOriginRoute) => void;
  // These optional members make it explicit that unrelated history is ignored.
  canGoBack?: () => boolean;
  back?: () => void;
};

type ScheduleDrawerOpen = (callback: () => void) => void;

export function navigateBackToMyPageDrawer(
  origin: unknown,
  navigator: MyPageReturnNavigator,
  openDrawer: () => void,
  schedule: ScheduleDrawerOpen = (callback) => setTimeout(callback, 0),
) {
  navigator.navigate(myPageOriginOrHome(origin));
  schedule(openDrawer);
}

export function myPageSettingsBackHandler(
  route: MyPageDrawerSettingsRoute,
  returnToDrawer: () => void,
): () => void {
  if (!MY_PAGE_DRAWER_SETTINGS_ROUTES.includes(route)) {
    throw new Error(`Unsupported My Page drawer return route: ${route}`);
  }
  return returnToDrawer;
}

export function handleMyPageHardwareBack(returnToDrawer: () => void): true {
  returnToDrawer();
  return true;
}
