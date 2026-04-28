import { useQuery } from "@tanstack/react-query";

import { boardApi, userApi } from "../services/api";
import { useUserStore } from "../stores/userStore";

export function useBoardsQuery() {
  return useQuery({
    queryKey: ["boards"],
    queryFn: boardApi.getBoards,
  });
}

export function useMeQuery() {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: ["me"],
    queryFn: userApi.getMe,
    enabled: isAuthenticated,
    retry: false,
  });
}
