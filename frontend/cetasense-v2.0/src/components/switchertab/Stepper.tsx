// src/components/switchertab/SmallStepper.tsx
import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';

interface Step {
  label: React.ReactNode;
  path: string;
  storageKey: string;
}

const steps: Step[] = [
    { label: <>Melakukan Pengaturan<br />Ruangan</>,  path: '/settings/ruangan',   storageKey: 'step-1-completed' },
    { label: <>Melakukan Pengaturan<br />Data</>,      path: '/settings/data',      storageKey: 'step-2-completed' },
    { label: <>Melakukan Pengaturan<br />Algoritma</>, path: '/settings/algoritma', storageKey: 'step-3-completed' },
];

export const Stepper: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <nav className="px-8 mt-4">
    <div className="bg-white rounded-lg shadow px-8 mt-4 py-2">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isActive   = pathname === step.path;
          const isComplete = pathname === step.path && sessionStorage.getItem(step.storageKey) === 'true';
          // circle & line styling
          const circleBase = `w-8 h-8 rounded-full border-2 flex items-center justify-center`;
          const circleCls  = isComplete
            ? `bg-blue-100 border-blue-500`
            : isActive
              ? `bg-blue-100 border-blue-500`
              : `bg-white border-gray-300`;
          const lineCls    = isComplete
            ? `bg-blue-100`
            : isActive
              ? `bg-blue-500`
              : `bg-gray-300`;

          return (
            <React.Fragment key={step.path}>
              <NavLink to={step.path} className="flex flex-col items-center text-center">
                <span className={`${circleBase} ${circleCls}`}>
                  {isComplete
                    ? <circle className="w-4 h-4" />
                    : <span className={isActive ? 'text-blue-500 text-sm' : 'text-gray-500 text-sm'}>
                        {i + 1}
                      </span>
                  }
                </span>
                <span className={`mt-1 text-xs font-medium ${isActive ? 'text-black' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </NavLink>

              {i < steps.length - 1 && (
                <div className={`w-full flex-1 h-px ${lineCls} mx-1`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
    </nav>
  );
};

export default Stepper;
