import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Platform } from "react-native";

import { useMyPageDrawer } from "../components/MyPageDrawer";

export function useReturnToMyPageDrawer() {
  const { returnToDrawer } = useMyPageDrawer();
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return undefined;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        returnToDrawer();
        return true;
      });
      return () => subscription.remove();
    }, [returnToDrawer]),
  );
  return returnToDrawer;
}
