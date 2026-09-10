import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useRef } from "react";
import { BackHandler, Platform } from "react-native";

import { useMyPageDrawer } from "../components/MyPageDrawer";
import {
  handleMyPageHardwareBack,
  type MyPageDrawerSettingsRoute,
  myPageSettingsBackHandler,
} from "../utils/myPageNavigation";

export function useReturnToMyPageDrawer(route: MyPageDrawerSettingsRoute) {
  const { returnToDrawer, settingsDidLayout } = useMyPageDrawer();
  const navigation = useNavigation();
  const hasLaidOut = useRef(false);
  const readyFrame = useRef<number | null>(null);
  const returnFromScreen = myPageSettingsBackHandler(route, returnToDrawer);
  const cancelReady = useCallback(() => {
    if (readyFrame.current !== null) cancelAnimationFrame(readyFrame.current);
    readyFrame.current = null;
  }, []);
  const revealWhenPainted = useCallback(() => {
    cancelReady();
    if (!navigation.isFocused()) return;
    // Layout/focus can precede the native tab's presentation. Leave a frame for
    // that commit to paint before removing the covering Android window.
    readyFrame.current = requestAnimationFrame(() => {
      readyFrame.current = requestAnimationFrame(() => {
        readyFrame.current = null;
        if (navigation.isFocused()) settingsDidLayout(route);
      });
    });
  }, [cancelReady, navigation, route, settingsDidLayout]);
  const onLayout = useCallback(() => {
    hasLaidOut.current = true;
    revealWhenPainted();
  }, [revealWhenPainted]);
  useFocusEffect(
    useCallback(() => {
      // Retained settings screens may focus again without another layout event.
      if (hasLaidOut.current) revealWhenPainted();
      const subscription = Platform.OS === "android" ? BackHandler.addEventListener(
        "hardwareBackPress",
        () => handleMyPageHardwareBack(returnFromScreen),
      ) : undefined;
      return () => {
        cancelReady();
        subscription?.remove();
      };
    }, [cancelReady, returnFromScreen, revealWhenPainted]),
  );
  return { returnToMyPageDrawer: returnFromScreen, onLayout };
}
