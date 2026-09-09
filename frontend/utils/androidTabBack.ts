import { HOME_TAB_ROUTE } from "./appRoutes";
import { myPageOriginRoute } from "./myPageNavigation";

export function androidTabBackAction(
  pathname: string,
  canGoBack: boolean,
  drawerOpen: boolean,
): "close-drawer" | "home" | "default" {
  if (drawerOpen) return "close-drawer";

  const tabRoot = myPageOriginRoute(pathname);
  if (tabRoot === HOME_TAB_ROUTE) return "default";
  if (tabRoot || !canGoBack) return "home";

  return "default";
}
