import { createElement } from "react";
import {
  createHashRouter,
  createMemoryRouter,
  type RouteObject,
} from "react-router-dom";

import {
  DecisionRoute,
  LiveRoute,
  PublicOnlyRoute,
  RequireSession,
  ReviewRoute,
  RootRoute,
  UnknownRoute,
} from "./RouteScreens";
import { RegisterPage, SignInPage, WelcomePage } from "../features/auth";
import { CreateMatchPage, MatchDashboardPage } from "../features/matches";
import { CalibrationPage } from "../features/calibration";
import { HardwareReadinessPage } from "../features/readiness";
import { routePaths } from "./paths";

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
        element: createElement(MatchDashboardPage),
      },
      {
        path: routePaths.newMatch,
        element: createElement(CreateMatchPage),
      },
      {
        path: routePaths.readinessPattern,
        element: createElement(HardwareReadinessPage),
      },
      {
        path: routePaths.calibrationPattern,
        element: createElement(CalibrationPage),
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
