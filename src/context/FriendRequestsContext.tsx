import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { fetchPendingRequests } from "../services/friendService";
import type { FriendRequest } from "../services/friendService";

/**
 * Incoming friend requests, shared between the navbar badge and the Search
 * page so the count can't disagree with the list. Anything that accepts or
 * declines calls refresh() so the badge updates immediately.
 */
type Value = {
  requests: FriendRequest[];
  refresh: () => Promise<void>;
};

const FriendRequestsContext = createContext<Value>({
  requests: [],
  refresh: async () => {},
});

export function FriendRequestsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRequests([]);
      return;
    }
    try {
      setRequests(await fetchPendingRequests(userId));
    } catch (err) {
      console.error("Failed to load friend requests:", err);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <FriendRequestsContext.Provider value={{ requests, refresh }}>
      {children}
    </FriendRequestsContext.Provider>
  );
}

export function useFriendRequests() {
  return useContext(FriendRequestsContext);
}
