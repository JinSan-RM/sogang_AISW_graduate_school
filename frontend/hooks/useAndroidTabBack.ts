import { router, useFocusEffect, usePathname } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Platform } from "react-native";

import { androidTabBackAction } from "../utils/androidTabBack";
import { HOME_TAB_ROUTE } from "../utils/appRoutes";

export function useAndroidTabBack(drawerOpen: boolean, closeDrawer: () => void) {
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return undefined;

      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        const action = androidTabBackAction(pathname, router.canGoBack(), drawerOpen);
        if (action === "close-drawer") {
          closeDrawer();
          return true;
        }
        if (action === "home") {
          router.navigate(HOME_TAB_ROUTE);
          return true;
        }
        // Preserve detail-screen handlers; only Home may fall through to Android.
        return false;
      });

      return () => subscription.remove();
    }, [closeDrawer, drawerOpen, pathname]),
  );
}
