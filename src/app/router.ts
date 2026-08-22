import { createElement } from "react";
import {
  createHashRouter,
  createMemoryRouter,
  type RouteObject,
} from "react-router-dom";

import {
  DecisionRoute,
  LiveRoute,
  Placeholder,
  PublicOnlyRoute,
  RequireSession,
  ReviewRoute,
  RootRoute,
  UnknownRoute,
  type PlaceholderProps,
} from "./RouteScreens";
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
        element: placeholder({
          eyebrow: "Operator console",
          title: "Welcome to FLY EYE",
          description:
            "Registration, sign-in, and demo access arrive in Batch 3.",
        }),
      },
      {
        path: routePaths.register,
        element: placeholder({
          eyebrow: "Prototype account",
          title: "Create account",
          description: "The registration experience arrives in Batch 3.",
        }),
      },
      {
        path: routePaths.signIn,
        element: placeholder({
          eyebrow: "Prototype account",
          title: "Sign in",
          description: "The sign-in experience arrives in Batch 3.",
        }),
      },
    ],
  },
  {
    element: createElement(RequireSession),
    children: [
      {
        path: routePaths.matches,
        element: placeholder({
          eyebrow: "Match operations",
          title: "Match dashboard",
          description: "The operator dashboard arrives in Batch 4.",
        }),
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
