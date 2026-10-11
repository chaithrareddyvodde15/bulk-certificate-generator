import React from 'react';
import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check
} from 'lucide-react';

export const StatusBadge = ({ status, size = 'md' }) => {
  const normStatus = (status || '').toUpperCase();

  const configs = {
    PENDING: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Clock,
      label: 'PENDING',
      spin: false,
    },
    PROCESSING: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Loader2,
      label: 'PROCESSING',
      spin: true,
    },
    COMPLETED: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'COMPLETED',
      spin: false,
    },
    COMPLETED_WITH_ERRORS: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertTriangle,
      label: 'COMPLETED WITH ERRORS',
      spin: false,
    },
    FAILED: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      label: 'FAILED',
      spin: false,
    },
    SUCCESS: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Check,
      label: 'SUCCESS',
      spin: false,
    },
  };

  const config = configs[normStatus] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
    label: normStatus || 'UNKNOWN',
    spin: false,
  };

  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} tracking-wide font-medium shadow-sm transition-colors`}
    >
      <Icon
        className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin text-blue-600' : ''}`}
      />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
