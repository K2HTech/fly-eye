import type { ReactNode } from "react";

import { RouteAccessContext, type RouteAccessState } from "./routeAccess";

interface RouteAccessProviderProps {
  children: ReactNode;
  state: RouteAccessState;
}

export function RouteAccessProvider({
  children,
  state,
}: RouteAccessProviderProps) {
  return (
    <RouteAccessContext.Provider value={state}>
      {children}
    </RouteAccessContext.Provider>
  );
}
