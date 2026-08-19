import type { SVGProps } from "react";

import "./CourtScene.css";

export type CourtSceneVariant = "sideline" | "baseline";

export interface CourtSceneProps extends Omit<
  SVGProps<SVGSVGElement>,
  "aria-label" | "role" | "title"
> {
  /** The camera perspective to illustrate. */
  variant?: CourtSceneVariant;
  /** Alias for variant that reads naturally at call sites that describe a view. */
  view?: CourtSceneVariant;
  /** Hide the illustration from assistive technology when it is supporting nearby text. */
  decorative?: boolean;
  /** Accessible name for the illustration when it is not decorative. */
  ariaLabel?: string;
  /** Optional accessible description for the illustration. */
  description?: string;
  /** Accessible title. Defaults to a perspective-specific camera description. */
  title?: string;
}

const palette = {
  background: "#0B1A11",
  court: "#17402A",
  line: "#F2F4F0",
  trajectory: "#E8A33D",
  player: "#D6E0F0",
  detection: "#4C8DFF",
} as const;

function SidelineScene() {
  return (
    <>
      <rect width="320" height="180" fill={palette.background} />
      <path d="M38 172 L118 58 L214 58 L302 172 Z" fill={palette.court} />
      <g fill="none" opacity=".92" stroke={palette.line} strokeWidth="1.4">
        <path d="M38 172 L118 58 L214 58 L302 172 Z" />
        <path d="M62 138 L278 138" />
        <path d="M95 95 L242 95" />
        <path d="M108 76 L228 76" />
        <path d="M170 172 L166 58" strokeDasharray="3 4" opacity=".6" />
      </g>
      <g fill="none" opacity=".45" stroke={palette.line} strokeWidth="2">
        <path d="M68 58 L68 122 M266 58 L266 122" />
        <path d="M68 86 L266 86" />
      </g>
      <Trajectory path="M244 34 Q216 88 196 128" />
      <LandingPoint cx="196" cy="128" radius="4" />
      <g data-element="player" data-testid="player" aria-hidden="true">
        <ellipse cx="118" cy="148" rx="10" ry="4" fill="#000" opacity=".35" />
        <path
          d="M118 148 v-24 l-8 -13 M118 124 l9 -14"
          fill="none"
          stroke={palette.player}
          strokeLinecap="round"
          strokeWidth="3.2"
        />
        <circle cx="118" cy="106" r="5" fill={palette.player} />
      </g>
    </>
  );
}

function BaselineScene() {
  return (
    <>
      <rect width="320" height="180" fill={palette.background} />
      <path d="M18 176 L94 44 L226 44 L302 176 Z" fill={palette.court} />
      <g fill="none" opacity=".92" stroke={palette.line} strokeWidth="1.4">
        <path d="M18 176 L94 44 L226 44 L302 176 Z" />
        <path d="M42 132 L278 132" />
        <path d="M72 82 L248 82" />
        <path d="M160 176 L160 44" strokeDasharray="3 4" opacity=".6" />
      </g>
      <path d="M38 142 L282 142" stroke={palette.line} strokeWidth="3" />
      <Trajectory path="M238 50 Q220 106 205 150" />
      <LandingPoint cx="205" cy="150" radius="4.5" />
      <rect
        data-element="detection-box"
        data-testid="detection-box"
        x="186"
        y="130"
        width="44"
        height="36"
        fill="none"
        stroke={palette.detection}
        strokeDasharray="4 3"
        strokeWidth="1.4"
      />
    </>
  );
}

function Trajectory({ path }: { path: string }) {
  return (
    <path
      data-element="shuttle-trajectory"
      data-testid="shuttle-trajectory"
      d={path}
      fill="none"
      stroke={palette.trajectory}
      strokeDasharray="5 4"
      strokeWidth="1.8"
    />
  );
}

function LandingPoint({
  cx,
  cy,
  radius,
}: {
  cx: string;
  cy: string;
  radius: string;
}) {
  return (
    <circle
      data-element="landing-point"
      data-testid="landing-point"
      cx={cx}
      cy={cy}
      r={radius}
      fill={palette.line}
    />
  );
}

export function CourtScene({
  variant: requestedVariant,
  view,
  decorative = false,
  ariaLabel,
  description,
  title,
  className,
  ...svgProps
}: CourtSceneProps) {
  const variant = requestedVariant ?? view ?? "sideline";
  const defaultTitle =
    variant === "sideline"
      ? "Sideline camera view of a badminton court"
      : "Baseline camera view of a badminton court";
  const accessibleLabel = ariaLabel ?? title ?? defaultTitle;
  const descriptionId = description
    ? `court-scene-${variant}-description`
    : undefined;

  return (
    <svg
      {...svgProps}
      className={className ? `court-scene ${className}` : "court-scene"}
      data-variant={variant}
      focusable={false}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : accessibleLabel}
      aria-describedby={decorative ? undefined : descriptionId}
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 320 180"
    >
      {!decorative && <title>{accessibleLabel}</title>}
      {!decorative && description && (
        <desc id={descriptionId}>{description}</desc>
      )}
      {variant === "sideline" ? <SidelineScene /> : <BaselineScene />}
    </svg>
  );
}

export default CourtScene;
