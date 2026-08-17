import { HOME_TAB_ROUTE } from "./appRoutes";

export type MyPageReturnDecision =
  | { action: "back" }
  | { action: "replace"; route: typeof HOME_TAB_ROUTE };

export function myPageReturnDecision(canGoBack: boolean): MyPageReturnDecision {
  return canGoBack ? { action: "back" } : { action: "replace", route: HOME_TAB_ROUTE };
}

type MyPageReturnNavigator = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (route: typeof HOME_TAB_ROUTE) => void;
};

type ScheduleDrawerOpen = (callback: () => void) => void;

export function navigateBackToMyPageDrawer(
  navigator: MyPageReturnNavigator,
  openDrawer: () => void,
  schedule: ScheduleDrawerOpen = (callback) => setTimeout(callback, 0),
) {
  const decision = myPageReturnDecision(navigator.canGoBack());
  if (decision.action === "back") navigator.back();
  else navigator.replace(decision.route);
  schedule(openDrawer);
}
