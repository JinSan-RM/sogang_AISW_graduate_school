import { Redirect } from "expo-router";

import { useUserStore } from "../stores/userStore";

export default function Index() {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  return <Redirect href={isAuthenticated ? "/(tabs)/home" : "/auth/login"} />;
}
