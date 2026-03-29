import React, { type HTMLAttributes, type ReactNode } from 'react';
import { joinClassNames } from './shared';

export interface WizardProgressStep {
  id: string;
  index: number;
  label: string;
}

interface WizardFrameHeaderAction {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

interface WizardFrameHeaderProps extends HTMLAttributes<HTMLElement> {
  heading: ReactNode;
  backLabel: string;
  backVisual: ReactNode;
  onBack: () => void;
  actions?: WizardFrameHeaderAction[];
}

export function WizardFrameHeader({
  className,
  heading,
  backLabel,
  backVisual,
  onBack,
  actions = [],
  ...props
}: WizardFrameHeaderProps) {
  return (
    <header className={joinClassNames('phase-wizard-header', className)} {...props}>
      <div className="phase-wizard-header-left">
        <button
          aria-label={backLabel}
          className="phase-wizard-icon-button phase-wizard-back-button"
          onClick={onBack}
          type="button"
        >
          {backVisual}
        </button>
        <h1>{heading}</h1>
      </div>
      {actions.length > 0 ? (
        <div className="phase-wizard-header-actions">
          {actions.map((action) => (
            <button
              aria-label={action.label}
              className="phase-wizard-icon-button"
              key={action.label}
              onClick={action.onClick}
              type="button"
            >
              {action.icon}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

interface WizardProgressStepperProps extends HTMLAttributes<HTMLDivElement> {
  currentStepId: string;
  steps: WizardProgressStep[];
}

export function WizardProgressStepper({
  className,
  currentStepId,
  steps,
  ...props
}: WizardProgressStepperProps) {
  const currentIndex = steps.findIndex((item) => item.id === currentStepId);
  const currentStep = steps.find((item) => item.id === currentStepId);

  return (
    <div
      className={joinClassNames(
        'phase-wizard-stepper',
        currentStep ? `phase-wizard-progress-${currentStep.index}` : null,
        className,
      )}
      {...props}
    >
      <div className="phase-wizard-step-line" />
      <div className="phase-wizard-step-line phase-wizard-step-line-active" />
      {steps.map((entry, entryIndex) => {
        const stateClass =
          entryIndex < currentIndex
            ? 'is-complete'
            : entry.id === currentStepId
              ? 'is-active'
              : '';
        return (
          <div className={`phase-wizard-step ${stateClass}`.trim()} key={entry.id}>
            <div className="phase-wizard-step-index">{entry.index}</div>
            <span>{entry.label}</span>
          </div>
        );
      })}
    </div>
  );
}
