import type { AuthenticatedOperator } from "../../services";
import type { MatchRecord, MatchStatus } from "../../domain";
import { matchResumeLabel } from "./matchNavigation";

import "./matches.css";

export type MatchCollectionStatus = "idle" | "loading" | "ready" | "error";

export interface MatchDashboardProps {
  identity: AuthenticatedOperator;
  matches: readonly MatchRecord[];
  status: MatchCollectionStatus;
  error: Error | null;
  actionError?: string;
  notice?: string;
  onCreateMatch: () => void;
  onResumeMatch: (match: MatchRecord) => void;
  onRetry: () => void;
  onSignOut: () => void;
  isSigningOut?: boolean;
}

const statusLabels: Record<MatchStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  live: "Live",
  completed: "Completed",
};

const statusDescriptions: Record<MatchStatus, string> = {
  draft: "Match setup is not finished.",
  ready: "Hardware checks are ready to start.",
  live: "Monitoring is currently active.",
  completed: "Review the recorded match decision.",
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function participants(match: MatchRecord): string {
  return `${match.sideA.displayName}  vs  ${match.sideB.displayName}`;
}

function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return (
    <span
      className={`matches-dashboard__status matches-dashboard__status--${status}`}
      title={statusDescriptions[status]}
    >
      <span aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function MatchCard({
  match,
  onResume,
}: {
  match: MatchRecord;
  onResume: (match: MatchRecord) => void;
}) {
  return (
    <article className="matches-dashboard__card">
      <div className="matches-dashboard__card-topline">
        <MatchStatusBadge status={match.status} />
        <time dateTime={match.updatedAt}>
          Updated {formatTimestamp(match.updatedAt)}
        </time>
      </div>
      <div className="matches-dashboard__card-heading">
        <div>
          <p className="matches-dashboard__card-event">{match.eventName}</p>
          <h3>{participants(match)}</h3>
        </div>
        <span className="matches-dashboard__court">{match.court}</span>
      </div>
      <dl className="matches-dashboard__facts">
        <div>
          <dt>Format</dt>
          <dd>
            Best of {match.format.bestOfGames} · {match.format.pointsToWin}{" "}
            points
          </dd>
        </div>
        <div>
          <dt>Competition</dt>
          <dd>{match.competitionType}</dd>
        </div>
      </dl>
      <button
        className="matches-dashboard__resume"
        type="button"
        onClick={() => onResume(match)}
      >
        {matchResumeLabel(match.status)}
        <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

export function MatchDashboard({
  identity,
  matches,
  status,
  error,
  actionError,
  notice,
  onCreateMatch,
  onResumeMatch,
  onRetry,
  onSignOut,
  isSigningOut = false,
}: MatchDashboardProps) {
  const isDemo = identity.session.mode === "demo";
  const isLoading = status === "loading";

  return (
    <section className="matches-dashboard" aria-labelledby="matches-title">
      <header className="matches-dashboard__header">
        <div className="matches-dashboard__brand-block">
          <p className="matches-dashboard__eyebrow">Operator workspace</p>
          <h1 id="matches-title">Match dashboard</h1>
          <p className="matches-dashboard__lead">
            Prepare a court, confirm the cameras, and make the next call with
            confidence.
          </p>
        </div>
        <div className="matches-dashboard__account">
          <span className="matches-dashboard__account-mode">
            <span aria-hidden="true" />
            {isDemo ? "Demo session" : "Local profile"}
          </span>
          <strong>{identity.profile.displayName}</strong>
          <span>{identity.profile.email}</span>
          <button
            className="matches-dashboard__signout"
            type="button"
            disabled={isSigningOut}
            onClick={onSignOut}
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      {notice && (
        <p className="matches-dashboard__notice" role="status">
          {notice}
        </p>
      )}

      {actionError && (
        <p className="matches-dashboard__action-error" role="alert">
          {actionError}
        </p>
      )}

      <div className="matches-dashboard__toolbar">
        <div>
          <p className="matches-dashboard__eyebrow">Your workspace</p>
          <h2>Recent matches</h2>
        </div>
        {matches.length > 0 && (
          <button
            className="matches-dashboard__create"
            type="button"
            onClick={onCreateMatch}
          >
            <span aria-hidden="true">+</span>
            Create match
          </button>
        )}
      </div>

      {error && (
        <div className="matches-dashboard__error" role="alert">
          <div>
            <strong>Matches could not be loaded.</strong>
            <span>{error.message}</span>
          </div>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {isLoading && (
        <div className="matches-dashboard__loading" role="status">
          Loading your recent matches…
        </div>
      )}

      {!isLoading && !error && matches.length === 0 && (
        <div className="matches-dashboard__empty">
          <div className="matches-dashboard__empty-mark" aria-hidden="true">
            ◎
          </div>
          <p className="matches-dashboard__eyebrow">No matches yet</p>
          <h2>Start your first review workspace</h2>
          <p>
            Create a match to name the court, add the players, and run the
            camera readiness check before play begins.
          </p>
          <button
            className="matches-dashboard__create matches-dashboard__create--empty"
            type="button"
            onClick={onCreateMatch}
          >
            <span aria-hidden="true">+</span>
            Create your first match
          </button>
        </div>
      )}

      {!isLoading && !error && matches.length > 0 && (
        <div className="matches-dashboard__grid" aria-label="Recent matches">
          {[...matches]
            .sort(
              (left, right) =>
                Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
            )
            .map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onResume={onResumeMatch}
              />
            ))}
        </div>
      )}
    </section>
  );
}
