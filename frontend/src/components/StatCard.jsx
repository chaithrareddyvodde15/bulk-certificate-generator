import React from 'react';

export const StatCard = ({ title, value, icon: Icon, description, color = 'indigo' }) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600',
      border: 'border-slate-200',
    },
    blue: {
      bg: 'bg-blue-50 text-blue-600',
      border: 'border-slate-200',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'border-slate-200',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600',
      border: 'border-slate-200',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'border-slate-200',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${scheme.bg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
      </div>
      {description && (
        <p className="mt-1 text-xs text-slate-500 font-normal">{description}</p>
      )}
    </div>
  );
};

export default StatCard;
