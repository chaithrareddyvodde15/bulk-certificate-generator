import React from 'react';

export const ProgressBar = ({
  successful = 0,
  failed = 0,
  total = 0,
  status = 'PENDING',
  showLabels = true,
}) => {
  const completed = successful + failed;
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  // Color scheme based on job status
  let barColor = 'bg-indigo-600';
  if (status === 'COMPLETED') {
    barColor = 'bg-emerald-600';
  } else if (status === 'COMPLETED_WITH_ERRORS') {
    barColor = 'bg-amber-500';
  } else if (status === 'FAILED') {
    barColor = 'bg-rose-500';
  } else if (status === 'PROCESSING') {
    barColor = 'bg-indigo-600';
  }

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between items-center mb-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Progress</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {percentage}%
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {completed} of {total} recipients processed
          </div>
        </div>
      )}

      {/* Progress Track */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60 shadow-inner">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
