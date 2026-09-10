export const routePaths = {
  root: "/",
  welcome: "/welcome",
  register: "/register",
  signIn: "/sign-in",
  matches: "/matches",
  newMatch: "/matches/new",
  readinessPattern: "/matches/:matchId/readiness",
  calibrationPattern: "/matches/:matchId/cameras/:cameraId/calibration",
  livePattern: "/matches/:matchId/live",
  reviewPattern: "/matches/:matchId/review",
  decisionPattern: "/matches/:matchId/decision",
} as const;

function matchPath(matchId: string, destination: string): string {
  return `/matches/${encodeURIComponent(matchId)}/${destination}`;
}

export const matchRoutes = {
  readiness: (matchId: string) => matchPath(matchId, "readiness"),
  calibration: (matchId: string, cameraId: string) =>
    `/matches/${encodeURIComponent(matchId)}/cameras/${encodeURIComponent(cameraId)}/calibration`,
  live: (matchId: string) => matchPath(matchId, "live"),
  review: (matchId: string) => matchPath(matchId, "review"),
  decision: (matchId: string) => matchPath(matchId, "decision"),
} as const;
