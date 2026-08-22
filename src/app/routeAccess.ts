import { createContext, useContext } from "react";

export type RouteAccessState =
  | { status: "restoring" }
  | { status: "authenticated" }
  | { status: "anonymous" };

export const RouteAccessContext = createContext<RouteAccessState | null>(null);

export function routeAccessForEnvironment(
  isDevelopment: boolean,
): RouteAccessState {
  return isDevelopment ? { status: "authenticated" } : { status: "anonymous" };
}

export function useRouteAccess(): RouteAccessState {
  const state = useContext(RouteAccessContext);

  if (!state) {
    throw new Error("useRouteAccess must be used within RouteAccessProvider");
  }

  return state;
}
