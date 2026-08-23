import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedOperator } from "../../services";
import type { MatchRecord } from "../../domain";
import { MatchDashboard } from "./MatchDashboard";

const identity: AuthenticatedOperator = {
  profile: {
    id: "operator-1",
    displayName: "Khoa Tran",
    email: "khoa@example.com",
    createdAt: "2026-08-22T10:00:00.000Z",
  },
  session: {
    profileId: "operator-1",
    mode: "demo",
    startedAt: "2026-08-22T10:00:00.000Z",
  },
};

const match: MatchRecord = {
  id: "match-1",
  eventName: "Fly Eye Open",
  court: "Court 2",
  competitionType: "doubles",
  sideA: { displayName: "Nguyen / Tran", players: ["Nguyen", "Tran"] },
  sideB: { displayName: "Lee / Park", players: ["Lee", "Park"] },
  format: { bestOfGames: 3, pointsToWin: 21 },
  status: "ready",
  createdAt: "2026-08-22T10:00:00.000Z",
  updatedAt: "2026-08-22T10:10:00.000Z",
};

function renderDashboard(
  overrides: Partial<React.ComponentProps<typeof MatchDashboard>> = {},
) {
  return render(
    <MatchDashboard
      identity={identity}
      matches={[]}
      status="ready"
      error={null}
      onCreateMatch={vi.fn()}
      onResumeMatch={vi.fn()}
      onRetry={vi.fn()}
      onSignOut={vi.fn()}
      {...overrides}
    />,
  );
}

describe("MatchDashboard", () => {
  it("renders the realistic first-run empty state and primary actions", () => {
    const onCreateMatch = vi.fn();
    renderDashboard({ onCreateMatch });

    expect(
      screen.getByRole("heading", { name: /match dashboard/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/start your first review workspace/i),
    ).toBeVisible();
    expect(screen.getByText(/demo session/i)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /^create match$/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /create your first match/i }),
    );
    expect(onCreateMatch).toHaveBeenCalledOnce();
  });

  it("renders match cards with operational details and resumes a match", () => {
    const onResumeMatch = vi.fn();
    renderDashboard({ matches: [match], onResumeMatch });

    expect(screen.getByText("Fly Eye Open")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /nguyen \/ tran vs lee \/ park/i }),
    ).toBeVisible();
    expect(screen.getByText("Court 2")).toBeVisible();
    expect(screen.getByText(/best of 3 · 21 points/i)).toBeVisible();
    expect(screen.getByText("Ready")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /^create match$/i }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /open readiness/i }));
    expect(onResumeMatch).toHaveBeenCalledWith(match);
  });

  it("orders restored matches by their most recent update", () => {
    const olderMatch: MatchRecord = {
      ...match,
      id: "match-older",
      eventName: "Earlier Event",
      updatedAt: "2026-08-21T10:10:00.000Z",
    };

    renderDashboard({ matches: [olderMatch, match] });

    const cards = screen.getAllByRole("article");
    expect(within(cards[0]).getByText("Fly Eye Open")).toBeVisible();
    expect(within(cards[1]).getByText("Earlier Event")).toBeVisible();
  });

  it("shows notices, loading, and retry states accessibly", () => {
    const onRetry = vi.fn();
    renderDashboard({
      status: "error",
      error: new Error("Local data unavailable."),
      notice: "You have been redirected to your workspace.",
      onRetry,
    });

    expect(screen.getByRole("status")).toHaveTextContent(/redirected/i);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /local data unavailable/i,
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();

    cleanup();
    renderDashboard({ status: "loading" });
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  it("supports local identity, sign-out state, and accessible controls", () => {
    const onSignOut = vi.fn();
    renderDashboard({
      onSignOut,
      isSigningOut: true,
      actionError: "Sign-out was rejected.",
    });

    const signOut = screen.getByRole("button", { name: /signing out/i });
    expect(signOut).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /create your first match/i }),
    ).toBeEnabled();
    expect(screen.getByText("Khoa Tran")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /sign-out was rejected/i,
    );

    // The disabled state intentionally prevents duplicate sign-out requests.
    fireEvent.click(signOut);
    expect(onSignOut).not.toHaveBeenCalled();
  });
});
