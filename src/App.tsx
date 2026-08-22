import { RouterProvider } from "react-router-dom";

import type { AppServices } from "./services";
import { AppServicesProvider } from "./app/AppServicesProvider";
import { MatchProvider } from "./app/MatchProvider";
import type { AppRouterInstance } from "./app/router";
import { RouteAccessProvider } from "./app/RouteAccessProvider";
import type { RouteAccessState } from "./app/routeAccess";
import { SessionProvider } from "./app/SessionProvider";
import { useSession } from "./app/sessionContext";

interface AppRouterProps {
  access: RouteAccessState;
  router: AppRouterInstance;
}

export function AppRouter({ access, router }: AppRouterProps) {
  return (
    <RouteAccessProvider state={access}>
      <main className="app-viewport">
        <RouterProvider router={router} />
      </main>
    </RouteAccessProvider>
  );
}

interface SessionRouterProps {
  router: AppRouterInstance;
}

function SessionRouter({ router }: SessionRouterProps) {
  const session = useSession();
  const access: RouteAccessState = { status: session.status };
  return <AppRouter access={access} router={router} />;
}

interface AppProps {
  router: AppRouterInstance;
  services: AppServices;
}

function App({ router, services }: AppProps) {
  return (
    <AppServicesProvider services={services}>
      <SessionProvider>
        <MatchProvider>
          <SessionRouter router={router} />
        </MatchProvider>
      </SessionProvider>
    </AppServicesProvider>
  );
}

export default App;
