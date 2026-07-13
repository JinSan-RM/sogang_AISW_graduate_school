import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PUSH_TOKEN_KEY = "aisw_expo_push_token";

export async function getStoredPushToken() {
  if (Platform.OS === "web") return typeof localStorage === "undefined" ? null : localStorage.getItem(PUSH_TOKEN_KEY);
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

export async function setStoredPushToken(token: string) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(PUSH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

export async function clearStoredPushToken() {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.removeItem(PUSH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}
