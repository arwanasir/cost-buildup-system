import React from 'react';

interface Step {
  id: string;
  label: string;
  status?: string;
}

interface StepperProps {
  steps: Step[];
  currentStepIndex?: number;
}

export function Stepper({ steps, currentStepIndex = 0 }: StepperProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          return (
            <li
              key={step.id}
              className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}
            >
              <div className="flex items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ring-2 ring-white z-10 ${
                    isCompleted
                      ? 'bg-blue-600'
                      : isCurrent
                        ? 'bg-blue-200 border-2 border-blue-600'
                        : 'bg-gray-200'
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span
                      className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={`absolute top-4 w-full h-0.5 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`}
                    style={{ left: '2rem', width: 'calc(100% - 2rem)' }}
                  />
                )}
              </div>
              <div className="mt-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                {step.label}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
