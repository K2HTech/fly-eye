import { createElement } from "react";
import {
  createHashRouter,
  createMemoryRouter,
  type RouteObject,
} from "react-router-dom";

import {
  DecisionRoute,
  LiveRoute,
  MatchDashboardPlaceholder,
  Placeholder,
  PublicOnlyRoute,
  RequireSession,
  ReviewRoute,
  RootRoute,
  UnknownRoute,
  type PlaceholderProps,
} from "./RouteScreens";
import { RegisterPage, SignInPage, WelcomePage } from "../features/auth";
import { routePaths } from "./paths";

function placeholder(props: PlaceholderProps) {
  return createElement(Placeholder, props);
}

const appRoutes: RouteObject[] = [
  {
    path: routePaths.root,
    element: createElement(RootRoute),
  },
  {
    element: createElement(PublicOnlyRoute),
    children: [
      {
        path: routePaths.welcome,
        element: createElement(WelcomePage),
      },
      {
        path: routePaths.register,
        element: createElement(RegisterPage),
      },
      {
        path: routePaths.signIn,
        element: createElement(SignInPage),
      },
    ],
  },
  {
    element: createElement(RequireSession),
    children: [
      {
        path: routePaths.matches,
        element: createElement(MatchDashboardPlaceholder),
      },
      {
        path: routePaths.newMatch,
        element: placeholder({
          eyebrow: "Match operations",
          title: "Create match",
          description: "The match creation workflow arrives in Batch 5.",
        }),
      },
      {
        path: routePaths.readinessPattern,
        element: placeholder({
          eyebrow: "System setup",
          title: "Hardware readiness",
          description:
            "Simulated camera and calibration checks arrive in Batch 6.",
        }),
      },
      { path: routePaths.livePattern, element: createElement(LiveRoute) },
      { path: routePaths.reviewPattern, element: createElement(ReviewRoute) },
      {
        path: routePaths.decisionPattern,
        element: createElement(DecisionRoute),
      },
    ],
  },
  { path: "*", element: createElement(UnknownRoute) },
];

export function createAppHashRouter() {
  return createHashRouter(appRoutes);
}

export function createAppMemoryRouter(initialEntries: string[]) {
  return createMemoryRouter(appRoutes, { initialEntries });
}

export type AppRouterInstance = ReturnType<typeof createAppHashRouter>;
