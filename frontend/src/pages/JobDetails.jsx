import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  Calendar,
  FileText,
  Users,
  Check,
  AlertCircle,
  Eye,
  X
} from 'lucide-react';
import {
  getJobDetails,
  getJobCertificates,
  downloadCertificatePdf,
  extractErrorMessage
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

export const JobDetails = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedError, setSelectedError] = useState(null);

  // Poll timer ref
  const pollTimerRef = useRef(null);

  const fetchJobData = async (isBackgroundPoll = false) => {
    try {
      if (!isBackgroundPoll) setLoading(true);
      setError(null);

      const [jobData, certsData] = await Promise.all([
        getJobDetails(id),
        getJobCertificates(id),
      ]);

      setJob(jobData);
      setCertificates(certsData);
      return jobData;
    } catch (err) {
      if (!isBackgroundPoll) {
        setError(extractErrorMessage(err));
      }
      return null;
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const runPolling = async () => {
      const currentJob = await fetchJobData(false);
      if (!isMounted || !currentJob) return;

      // Check if job is still active
      const isActive =
        currentJob.status === 'PENDING' || currentJob.status === 'PROCESSING';

      if (isActive) {
        pollTimerRef.current = setInterval(async () => {
          const updatedJob = await fetchJobData(true);
          if (
            updatedJob &&
            updatedJob.status !== 'PENDING' &&
            updatedJob.status !== 'PROCESSING'
          ) {
            // Stop polling when reached terminal state
            clearInterval(pollTimerRef.current);
          }
        }, 1800);
      }
    };

    runPolling();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [id]);

  const handleDownload = async (certId, recipientName) => {
    try {
      setDownloadingId(certId);
      const response = await downloadCertificatePdf(certId);

      // Create blob download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${certId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Download failed: ${extractErrorMessage(err)}`);
    } finally {
      setDownloadingId(null);
    }
  };

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

  if (loading && !job) {
    return (
      <div className="p-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Retrieving job #{id} status...</p>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Job Not Found or Inaccessible</h3>
        <p className="text-sm text-slate-500">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const isTerminal =
    job && job.status !== 'PENDING' && job.status !== 'PROCESSING';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Generation History</span>
        </Link>

        <div className="flex items-center gap-3">
          {!isTerminal && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>Auto-polling live progress</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchJobData(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Manual Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Job Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                Job #{job.job_id}
              </span>
              <StatusBadge status={job.status} size="md" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {job.certificate_title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.organization_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.event_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Issued: {job.issue_date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Created: {formatDate(job.created_at)}</span>
              </div>
            </div>
          </div>

          {job.completed_at && (
            <div className="text-right text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 shrink-0">
              <span className="font-medium text-slate-600 block">Completed</span>
              <span>{formatDate(job.completed_at)}</span>
            </div>
          )}
        </div>

        {/* Dynamic Horizontal Progress Bar */}
        <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-100 space-y-2">
          <ProgressBar
            successful={job.successful}
            failed={job.failed}
            total={job.total}
            status={job.status}
          />
        </div>

        {/* Counter Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {job.total}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-center">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Successful
            </span>
            <span className="text-xl font-bold text-emerald-800 mt-1 block">
              {job.successful}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/70 text-center">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
              Failed
            </span>
            <span className="text-xl font-bold text-rose-800 mt-1 block">
              {job.failed}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/70 text-center">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
              Pending
            </span>
            <span className="text-xl font-bold text-blue-800 mt-1 block">
              {job.pending}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/70 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
              Completed
            </span>
            <span className="text-xl font-bold text-indigo-800 mt-1 block">
              {job.completed}
            </span>
          </div>
        </div>
      </div>

      {/* Recipient Roster & Download Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              Recipients Roster ({certificates.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual certificate status and secure download endpoints.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">ID</th>
                <th className="py-3.5 px-6">Recipient</th>
                <th className="py-3.5 px-6">Email</th>
                <th className="py-3.5 px-6">Course / Track</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certificates.map((cert) => {
                const isSuccess = cert.status === 'SUCCESS';
                const isFailed = cert.status === 'FAILED';
                const isDownloading = downloadingId === cert.id;

                return (
                  <tr
                    key={cert.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-800">
                      #{cert.id}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900">
                      {cert.recipient_name}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600 font-mono">
                      {cert.recipient_email}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      {cert.course}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={cert.status} size="sm" />
                      {isFailed && cert.error_message && (
                        <button
                          type="button"
                          onClick={() => setSelectedError({ name: cert.recipient_name, error: cert.error_message })}
                          className="ml-2 text-rose-600 hover:text-rose-800 text-xs font-medium underline"
                          title="View error details"
                        >
                          View Error
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {isSuccess ? (
                        <button
                          type="button"
                          onClick={() => handleDownload(cert.id, cert.recipient_name)}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors shadow-2xs"
                        >
                          <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                          <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                        </button>
                      ) : isFailed ? (
                        <span className="text-xs text-rose-500 font-medium italic">
                          Generation failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium px-2 py-1 rounded bg-slate-100">
                          <Clock className="w-3 h-3" />
                          <span>Generating...</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Recipient Generation Error</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Recipient
              </p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedError.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Error Message
              </p>
              <p className="text-xs font-mono bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-200 mt-1 break-all">
                {selectedError.error}
              </p>
            </div>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;
