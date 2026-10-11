import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Award,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  PlusCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Cpu,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { getJobs, extractErrorMessage } from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

export const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch recent jobs (up to 100 for calculating metrics)
      const data = await getJobs({ page: 1, pageSize: 100 });
      setJobs(data.items || []);
      setTotalJobsCount(data.total || 0);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute metrics from actual API response data
  const metrics = React.useMemo(() => {
    const totalJobs = totalJobsCount;
    let totalCerts = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    jobs.forEach((job) => {
      totalCerts += job.total_count || 0;
      totalSuccess += job.success_count || 0;
      totalFailed += job.failure_count || 0;
    });

    return {
      totalJobs,
      totalCerts,
      totalSuccess,
      totalFailed,
    };
  }, [jobs, totalJobsCount]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>High-Throughput Certificate Pipeline</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome to Certificate Studio
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Generate, validate, and distribute high-fidelity credentials in bulk.
            Asynchronous background tasks process each recipient independently with robust fault isolation.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Certificates</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Jobs"
          value={loading ? '...' : metrics.totalJobs}
          icon={Layers}
          description="Total generation jobs scheduled"
          color="indigo"
        />
        <StatCard
          title="Total Certificates"
          value={loading ? '...' : metrics.totalCerts}
          icon={Award}
          description="Cumulative recipient volume"
          color="blue"
        />
        <StatCard
          title="Successfully Generated"
          value={loading ? '...' : metrics.totalSuccess}
          icon={CheckCircle2}
          description="Verified PDF files generated"
          color="emerald"
        />
        <StatCard
          title="Failed Certificates"
          value={loading ? '...' : metrics.totalFailed}
          icon={AlertOctagon}
          description="Isolated generation exceptions"
          color={metrics.totalFailed > 0 ? 'rose' : 'indigo'}
        />
      </div>

      {/* Recent Generation Jobs Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              Recent Generation Jobs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live processing logs and status reports for recent requests.
            </p>
          </div>
          {jobs.length > 0 && (
            <Link
              to="/history"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Content Body: Loading, Error, Empty, or Table */}
        {loading && jobs.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading generation jobs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50 m-4 rounded-xl border border-rose-200">
            <AlertOctagon className="w-6 h-6 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-semibold">Failed to load generation jobs</p>
            <p className="text-xs mt-1 text-rose-500">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-3 text-xs font-medium text-rose-700 underline"
            >
              Try again
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">No Generation Jobs Yet</h4>
              <p className="text-sm text-slate-500 mt-1">
                You haven't initiated any certificate generation batches yet. Create your first batch to start generating PDFs.
              </p>
            </div>
            <div>
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create First Job</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/75 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Job ID</th>
                  <th className="py-3.5 px-6">Certificate & Event</th>
                  <th className="py-3.5 px-6">Created</th>
                  <th className="py-3.5 px-6 text-center">Recipients</th>
                  <th className="py-3.5 px-6 text-center">Success</th>
                  <th className="py-3.5 px-6 text-center">Failed</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.slice(0, 8).map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-900">
                      #{job.id}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-900">{job.certificate_title}</div>
                      <div className="text-xs text-slate-400">{job.event_name} • {job.organization_name}</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="py-4 px-6 text-center font-medium text-slate-800">
                      {job.total_count}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-semibold text-emerald-600">
                        {job.success_count}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={job.failure_count > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                        {job.failure_count}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={job.status} size="sm" />
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Highlights / Architectural Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-slate-900">Non-Blocking Architecture</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Requests return HTTP 202 Accepted instantly. Work executes via FastAPI BackgroundTasks with autonomous session handling.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-slate-900">Fault Isolation</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            One recipient's rendering failure never terminates the rest. Valid recipients complete cleanly and errors are recorded.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-slate-900">Vector PDF Generation</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Crisp, printable landscape A4 vector certificates generated with ReportLab, featuring decorative double borders and security badges.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
