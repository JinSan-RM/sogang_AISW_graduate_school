import { useState } from "react";

import type { AdminListSort } from "../types";

export function useAdminListSort<Key extends string>(initial: AdminListSort<Key>) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<AdminListSort<Key>>();

  function sortBy(key: Key) {
    setSort(previous => {
      const current = previous ?? initial;
      return {
        sort_by: key,
        sort_direction: current.sort_by === key && current.sort_direction === "asc" ? "desc" : "asc",
      };
    });
    setPage(1);
  }

  // Preserve the server's default ordering until the user presses a header.
  return { page, setPage, sort, order: sort ?? initial, sortBy };
}
