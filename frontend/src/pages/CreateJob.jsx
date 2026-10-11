import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Send,
  Sparkles,
  AlertCircle,
  FileText,
  Users,
  Calendar,
  Building,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { createGenerationJob, extractErrorMessage } from '../services/api';

const SAMPLE_RECIPIENTS = [
  { name: 'Sarah Connor', email: 'sarah.connor@cyberdyne.org', course: 'Autonomous Systems & AI Safety' },
  { name: 'John Doe', email: 'john.doe@example.com', course: 'Full-Stack Distributed Systems' },
  { name: 'Jane Smith', email: 'jane.smith@example.org', course: 'Full-Stack Distributed Systems' },
  { name: 'Alan Turing', email: 'alan.turing@cambridge.ac.uk', course: 'Foundations of Computer Science' },
  { name: 'Ada Lovelace', email: 'ada.lovelace@analytics.org', course: 'Algorithmic Computation & Logic' },
];

export const CreateJob = () => {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    certificate_title: 'Certificate of Excellence',
    event_name: 'Global Developer Summit 2026',
    organization_name: 'International Software Institute',
    issue_date: new Date().toISOString().split('T')[0],
  });

  const [recipients, setRecipients] = useState([
    { name: '', email: '', course: '' },
  ]);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Field change handlers
  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleRecipientChange = (index, field, value) => {
    setRecipients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    const errorKey = `recipient_${index}_${field}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const addRecipientRow = () => {
    setRecipients((prev) => [
      ...prev,
      { name: '', email: '', course: formData.event_name ? `${formData.event_name} Track` : '' },
    ]);
  };

  const removeRecipientRow = (index) => {
    if (recipients.length <= 1) return;
    setRecipients((prev) => prev.filter((_, i) => i !== index));
    // Clean up any errors for this row
    setFieldErrors((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, val]) => {
        if (!key.startsWith(`recipient_${index}_`)) {
          next[key] = val;
        }
      });
      return next;
    });
  };

  const loadSampleRecipients = () => {
    setRecipients(SAMPLE_RECIPIENTS);
    setFieldErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.certificate_title.trim()) {
      errors.certificate_title = 'Certificate title is required';
    }
    if (!formData.event_name.trim()) {
      errors.event_name = 'Event name is required';
    }
    if (!formData.organization_name.trim()) {
      errors.organization_name = 'Organization name is required';
    }
    if (!formData.issue_date.trim()) {
      errors.issue_date = 'Issue date is required';
    }

    if (!recipients.length) {
      errors.general = 'At least one recipient is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    recipients.forEach((rec, idx) => {
      if (!rec.name.trim()) {
        errors[`recipient_${idx}_name`] = 'Recipient name is required';
      }
      if (!rec.email.trim()) {
        errors[`recipient_${idx}_email`] = 'Email address is required';
      } else if (!emailRegex.test(rec.email.trim())) {
        errors[`recipient_${idx}_email`] = 'Please enter a valid email address';
      }
      if (!rec.course.trim()) {
        errors[`recipient_${idx}_course`] = 'Course name is required';
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        certificate_title: formData.certificate_title.trim(),
        event_name: formData.event_name.trim(),
        organization_name: formData.organization_name.trim(),
        issue_date: formData.issue_date.trim(),
        recipients: recipients.map((r) => ({
          name: r.name.trim(),
          email: r.email.trim().toLowerCase(),
          course: r.course.trim(),
        })),
      };

      const result = await createGenerationJob(payload);
      // Navigate to the newly created job's details page
      navigate(`/jobs/${result.job_id}`);
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back button and page heading */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <button
          type="button"
          onClick={loadSampleRecipients}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Load 5 Sample Recipients</span>
        </button>
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Unable to submit generation job</p>
            <p className="mt-0.5 text-xs text-rose-600">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION A: Certificate Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              A
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Certificate Information</h3>
              <p className="text-xs text-slate-500">
                Core credentials that will appear across all issued PDF certificates in this batch.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Certificate Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="certificate_title"
                value={formData.certificate_title}
                onChange={handleInfoChange}
                placeholder="e.g. Certificate of Participation"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors ${
                  fieldErrors.certificate_title ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {fieldErrors.certificate_title && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.certificate_title}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Event or Workshop Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="event_name"
                value={formData.event_name}
                onChange={handleInfoChange}
                placeholder="e.g. AI & Cloud Architecture Summit 2026"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors ${
                  fieldErrors.event_name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {fieldErrors.event_name && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.event_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Issuing Organization <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="organization_name"
                value={formData.organization_name}
                onChange={handleInfoChange}
                placeholder="e.g. Acme Tech Institute"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors ${
                  fieldErrors.organization_name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {fieldErrors.organization_name && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.organization_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Issue Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleInfoChange}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors ${
                  fieldErrors.issue_date ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                }`}
              />
              {fieldErrors.issue_date && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.issue_date}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION B: Recipients */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                B
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Recipients List ({recipients.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Individual recipient details for certificate personalization and delivery.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addRecipientRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Recipient</span>
            </button>
          </div>

          <div className="space-y-4">
            {recipients.map((recipient, index) => {
              const nameErr = fieldErrors[`recipient_${index}_name`];
              const emailErr = fieldErrors[`recipient_${index}_email`];
              const courseErr = fieldErrors[`recipient_${index}_course`];

              return (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200/80 text-slate-700 inline-flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      Recipient #{index + 1}
                    </span>
                    {recipients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRecipientRow(index)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Remove this recipient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={recipient.name}
                        onChange={(e) => handleRecipientChange(index, 'name', e.target.value)}
                        placeholder="Full Name *"
                        className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                          nameErr ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                        }`}
                      />
                      {nameErr && <p className="mt-1 text-[11px] text-rose-500">{nameErr}</p>}
                    </div>

                    <div>
                      <input
                        type="email"
                        value={recipient.email}
                        onChange={(e) => handleRecipientChange(index, 'email', e.target.value)}
                        placeholder="Email Address *"
                        className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                          emailErr ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                        }`}
                      />
                      {emailErr && <p className="mt-1 text-[11px] text-rose-500">{emailErr}</p>}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={recipient.course}
                        onChange={(e) => handleRecipientChange(index, 'course', e.target.value)}
                        placeholder="Course / Track *"
                        className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                          courseErr ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                        }`}
                      />
                      {courseErr && <p className="mt-1 text-[11px] text-rose-500">{courseErr}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={addRecipientRow}
              className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Recipient</span>
            </button>
          </div>
        </div>

        {/* SECTION C: Submission */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  Ready to Issue {recipients.length} {recipients.length === 1 ? 'Certificate' : 'Certificates'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold">
                  HTTP 202 Async
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                One individual vector PDF certificate will be generated per recipient in the background.
                Progress updates in real time on the job monitor page.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/"
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold shadow-sm transition-all"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Scheduling Batch...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Generate Certificates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;
