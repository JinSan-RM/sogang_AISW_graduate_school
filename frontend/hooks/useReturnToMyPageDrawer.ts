import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Platform } from "react-native";

import { useMyPageDrawer } from "../components/MyPageDrawer";
import {
  handleMyPageHardwareBack,
  type MyPageDrawerSettingsRoute,
  myPageSettingsBackHandler,
} from "../utils/myPageNavigation";

export function useReturnToMyPageDrawer(route: MyPageDrawerSettingsRoute) {
  const { returnToDrawer } = useMyPageDrawer();
  const returnFromScreen = myPageSettingsBackHandler(route, returnToDrawer);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return undefined;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => handleMyPageHardwareBack(returnFromScreen),
      );
      return () => subscription.remove();
    }, [returnFromScreen]),
  );
  return returnFromScreen;
}
