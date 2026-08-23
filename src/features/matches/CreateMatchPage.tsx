import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useMatches } from "../../app/matchContext";
import { matchRoutes, routePaths } from "../../app/paths";
import type { CompetitionType } from "../../domain";
import {
  firstInvalidField,
  toCreateMatchInput,
  validateMatchDetails,
  validateMatchParticipants,
  type MatchFormErrors,
  type MatchFormField,
  type MatchFormValues,
  type ScoringFormatPreset,
} from "./createMatchValidation";
import "./create-match.css";

const initialValues: MatchFormValues = {
  eventName: "",
  court: "",
  competitionType: "singles",
  scoringFormat: "standard-3x21",
  sideAPlayer1: "",
  sideAPlayer2: "",
  sideBPlayer1: "",
  sideBPlayer2: "",
};

type WizardStep = "details" | "participants";

export function CreateMatchPage() {
  const navigate = useNavigate();
  const matches = useMatches();
  const [step, setStep] = useState<WizardStep>("details");
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<MatchFormErrors>({});
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fields = useRef<
    Partial<Record<MatchFormField, HTMLInputElement | null>>
  >({});
  const registerField = (
    field: MatchFormField,
    element: HTMLInputElement | null,
  ) => {
    fields.current[field] = element;
  };

  const updateField = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as MatchFormField;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServiceError(null);
  };

  const updateCompetitionType = (competitionType: CompetitionType) => {
    setValues((current) => ({ ...current, competitionType }));
    setErrors((current) => ({
      ...current,
      sideAPlayer2: undefined,
      sideBPlayer2: undefined,
    }));
    setServiceError(null);
  };

  const updateScoringFormat = (scoringFormat: ScoringFormatPreset) => {
    setValues((current) => ({ ...current, scoringFormat }));
    setServiceError(null);
  };

  const focusFirstError = (
    validation: MatchFormErrors,
    section: WizardStep,
  ) => {
    const firstInvalid = firstInvalidField(validation, section);
    if (firstInvalid) fields.current[firstInvalid]?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (step === "details") {
      const validation = validateMatchDetails(values);
      setErrors(validation);
      if (Object.values(validation).some(Boolean)) {
        focusFirstError(validation, "details");
        return;
      }
      setStep("participants");
      return;
    }

    const validation = validateMatchParticipants(values);
    setErrors(validation);
    setServiceError(null);
    if (Object.values(validation).some(Boolean)) {
      focusFirstError(validation, "participants");
      return;
    }

    setIsSubmitting(true);
    try {
      const match = await matches.create(toCreateMatchInput(values));
      navigate(matchRoutes.readiness(match.id), { replace: true });
    } catch {
      setServiceError(
        "Unable to save this match. Your entries are still here; please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="create-match" aria-labelledby="create-match-title">
      <header className="create-match__header">
        <strong className="create-match__context">Match setup</strong>
        <div>
          <span>New match</span>
          <strong>Draft workspace</strong>
        </div>
      </header>

      <div className="create-match__layout">
        <aside className="create-match__intro">
          <p className="create-match__eyebrow">Match operations</p>
          <h1 id="create-match-title">Create match</h1>
          <p>
            Add the court and players now. Camera and calibration checks follow
            before monitoring can begin.
          </p>
          <ol className="create-match__progress" aria-label="Creation progress">
            <li
              aria-current={step === "details" ? "step" : undefined}
              className={step === "details" ? "is-current" : "is-complete"}
            >
              <span>01</span>
              <div>
                <strong>Match details</strong>
                <small>Event, court, competition</small>
              </div>
            </li>
            <li
              aria-current={step === "participants" ? "step" : undefined}
              className={step === "participants" ? "is-current" : ""}
            >
              <span>02</span>
              <div>
                <strong>Players & format</strong>
                <small>Participants and scoring</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Hardware readiness</strong>
                <small>Cameras and calibration</small>
              </div>
            </li>
          </ol>
        </aside>

        <form
          className="create-match__form"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          <div className="create-match__step-heading">
            <span>Step {step === "details" ? "1" : "2"} of 2</span>
            <h2>{step === "details" ? "Match details" : "Players & format"}</h2>
            <p aria-live="polite">
              {step === "details"
                ? "Name the event, identify the court, and choose the competition type."
                : `Add ${values.competitionType === "singles" ? "one player" : "two players"} to each side.`}
            </p>
          </div>

          {step === "details" ? (
            <MatchDetailsStep
              errors={errors}
              registerField={registerField}
              values={values}
              onChange={updateField}
              onCompetitionTypeChange={updateCompetitionType}
            />
          ) : (
            <ParticipantsStep
              errors={errors}
              registerField={registerField}
              values={values}
              onChange={updateField}
              onScoringFormatChange={updateScoringFormat}
            />
          )}

          {serviceError && (
            <p className="create-match__service-error" role="alert">
              <strong>Match could not be created.</strong>
              <span>{serviceError}</span>
            </p>
          )}

          <footer className="create-match__actions">
            <button
              className="create-match__button create-match__button--quiet"
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                step === "details"
                  ? navigate(routePaths.matches)
                  : setStep("details")
              }
            >
              {step === "details" ? "Cancel" : "Back"}
            </button>
            <button
              className="create-match__button create-match__button--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {step === "details"
                ? "Continue to players"
                : isSubmitting
                  ? "Creating match…"
                  : "Create match & continue"}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </footer>
        </form>
      </div>
    </section>
  );
}

interface StepProps {
  errors: MatchFormErrors;
  registerField: (
    field: MatchFormField,
    element: HTMLInputElement | null,
  ) => void;
  values: MatchFormValues;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

interface MatchDetailsStepProps extends StepProps {
  onCompetitionTypeChange: (type: CompetitionType) => void;
}

function MatchDetailsStep({
  errors,
  registerField,
  values,
  onChange,
  onCompetitionTypeChange,
}: MatchDetailsStepProps) {
  return (
    <div className="create-match__fields">
      <MatchInput
        autoComplete="off"
        error={errors.eventName}
        field="eventName"
        inputRef={(element) => {
          registerField("eventName", element);
        }}
        label="Event or match name"
        maxLength={100}
        onChange={onChange}
        placeholder="Fly Eye Open"
        value={values.eventName}
      />
      <MatchInput
        autoComplete="off"
        error={errors.court}
        field="court"
        inputRef={(element) => {
          registerField("court", element);
        }}
        label="Court name or number"
        maxLength={80}
        onChange={onChange}
        placeholder="Court 2"
        value={values.court}
      />
      <fieldset className="create-match__competition">
        <legend>Competition type</legend>
        <div>
          <CompetitionOption
            checked={values.competitionType === "singles"}
            description="One player on each side"
            label="Singles"
            value="singles"
            onChange={onCompetitionTypeChange}
          />
          <CompetitionOption
            checked={values.competitionType === "doubles"}
            description="Two players on each side"
            label="Doubles"
            value="doubles"
            onChange={onCompetitionTypeChange}
          />
        </div>
      </fieldset>
    </div>
  );
}

function ParticipantsStep({
  errors,
  registerField,
  values,
  onChange,
  onScoringFormatChange,
}: ParticipantsStepProps) {
  const isDoubles = values.competitionType === "doubles";
  return (
    <div className="create-match__participants">
      <ParticipantSide
        errors={errors}
        registerField={registerField}
        isDoubles={isDoubles}
        side="A"
        values={values}
        onChange={onChange}
      />
      <div className="create-match__versus" aria-hidden="true">
        VS
      </div>
      <ParticipantSide
        errors={errors}
        registerField={registerField}
        isDoubles={isDoubles}
        side="B"
        values={values}
        onChange={onChange}
      />
      <fieldset className="create-match__format">
        <legend>Scoring format</legend>
        <p>Choose the rules used for this match.</p>
        <div className="create-match__format-options">
          <ScoringOption
            checked={values.scoringFormat === "standard-3x21"}
            detail="Best of 3 games · 21 points per game"
            label="Standard 3×21"
            value="standard-3x21"
            onChange={onScoringFormatChange}
          />
          <ScoringOption
            checked={values.scoringFormat === "bwf-2027-3x15"}
            detail="Best of 3 games · 15 points per game"
            label="BWF 2027 3×15"
            value="bwf-2027-3x15"
            onChange={onScoringFormatChange}
          />
        </div>
      </fieldset>
    </div>
  );
}

interface ParticipantsStepProps extends StepProps {
  onScoringFormatChange: (format: ScoringFormatPreset) => void;
}

interface ParticipantSideProps extends StepProps {
  isDoubles: boolean;
  side: "A" | "B";
}

function ParticipantSide({
  errors,
  registerField,
  isDoubles,
  side,
  values,
  onChange,
}: ParticipantSideProps) {
  const firstField = `side${side}Player1` as MatchFormField;
  const secondField = `side${side}Player2` as MatchFormField;
  return (
    <fieldset className="create-match__side">
      <legend>
        <span>Side {side}</span>
        {isDoubles ? "Doubles pair" : "Singles player"}
      </legend>
      <MatchInput
        autoComplete="off"
        error={errors[firstField]}
        field={firstField}
        inputRef={(element) => {
          registerField(firstField, element);
        }}
        label={isDoubles ? "Player 1" : "Player name"}
        maxLength={80}
        onChange={onChange}
        placeholder={side === "A" ? "Nguyen" : "Tran"}
        value={values[firstField]}
      />
      {isDoubles && (
        <MatchInput
          autoComplete="off"
          error={errors[secondField]}
          field={secondField}
          inputRef={(element) => {
            registerField(secondField, element);
          }}
          label="Player 2"
          maxLength={80}
          onChange={onChange}
          placeholder={side === "A" ? "Pham" : "Le"}
          value={values[secondField]}
        />
      )}
    </fieldset>
  );
}

interface MatchInputProps {
  autoComplete: string;
  error?: string;
  field: MatchFormField;
  inputRef: (element: HTMLInputElement | null) => void;
  label: string;
  maxLength: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  value: string;
}

function MatchInput({
  autoComplete,
  error,
  field,
  inputRef,
  label,
  maxLength,
  onChange,
  placeholder,
  value,
}: MatchInputProps) {
  const errorId = `${field}-error`;
  return (
    <div className="create-match__field">
      <label htmlFor={field}>{label}</label>
      <input
        ref={inputRef}
        id={field}
        name={field}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-describedby={error ? errorId : undefined}
        aria-errormessage={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        onChange={onChange}
      />
      {error && (
        <span id={errorId} className="create-match__field-error">
          {error}
        </span>
      )}
    </div>
  );
}

interface CompetitionOptionProps {
  checked: boolean;
  description: string;
  label: string;
  value: CompetitionType;
  onChange: (value: CompetitionType) => void;
}

function CompetitionOption({
  checked,
  description,
  label,
  value,
  onChange,
}: CompetitionOptionProps) {
  return (
    <label className="create-match__competition-option">
      <input
        checked={checked}
        name="competitionType"
        type="radio"
        value={value}
        onChange={() => onChange(value)}
      />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <b aria-hidden="true">✓</b>
    </label>
  );
}

interface ScoringOptionProps {
  checked: boolean;
  detail: string;
  label: string;
  value: ScoringFormatPreset;
  onChange: (value: ScoringFormatPreset) => void;
}

function ScoringOption({
  checked,
  detail,
  label,
  value,
  onChange,
}: ScoringOptionProps) {
  return (
    <label className="create-match__format-option">
      <input
        checked={checked}
        name="scoringFormat"
        type="radio"
        value={value}
        onChange={() => onChange(value)}
      />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <b aria-hidden="true">✓</b>
    </label>
  );
}
