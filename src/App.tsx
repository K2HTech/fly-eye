import { RouterProvider } from "react-router-dom";

import type { AppRouterInstance } from "./app/router";
import { RouteAccessProvider } from "./app/RouteAccessProvider";
import {
  routeAccessForEnvironment,
  type RouteAccessState,
} from "./app/routeAccess";

const environmentAccess = routeAccessForEnvironment(import.meta.env.DEV);

interface AppRouterProps {
  access?: RouteAccessState;
  router: AppRouterInstance;
}

export function AppRouter({
  access = environmentAccess,
  router,
}: AppRouterProps) {
  return (
    <RouteAccessProvider state={access}>
      <main className="app-viewport">
        <RouterProvider router={router} />
      </main>
    </RouteAccessProvider>
  );
}

export default AppRouter;
