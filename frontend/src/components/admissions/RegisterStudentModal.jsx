import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import {
  ASPIRANT_TYPES,
  EXAM_MEDIUMS,
  ATTEMPT_OPTIONS,
  INSTALLMENT_PLANS,
  COURSE_TYPES,
  PAYMENT_MODES,
} from '../../utils/studentConstants';
import {
  buildInstallmentPreview,
  getInstallmentPlanLabel,
  sumInstallmentPaid,
} from '../../utils/paymentHelpers';

const STEPS = ['Student Info', 'Program & Fee', 'Confirm & Register'];

const fmtInr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

function InstallmentSchedule({ installments, plan, balanceDue, amountPaidNum }) {
  if (!installments.length) return null;

  return (
    <div className="installment-preview-box full-width">
      <div className="installment-preview-header">
        <strong>Payment schedule</strong>
        <span className="muted-text">{getInstallmentPlanLabel(plan)}</span>
      </div>
      <ul className="installment-preview-list">
        {installments.map((inst) => {
          const dueStr = inst.dueDate
            ? new Date(inst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
          const remaining = Math.max(0, inst.amount - (inst.paidAmount || 0));
          return (
            <li key={inst.number} className={`installment-preview-row status-${(inst.status || 'pending').toLowerCase()}`}>
              <span className="installment-preview-num">#{inst.number}</span>
              <span className="installment-preview-due">Due {dueStr}</span>
              <span className="installment-preview-amount">{fmtInr(inst.amount)}</span>
              <span className={`installment-preview-status badge badge-payment-${(inst.status || 'pending').toLowerCase()}`}>
                {inst.status === 'Partial'
                  ? `${fmtInr(inst.paidAmount)} paid · ${fmtInr(remaining)} left`
                  : inst.status}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="installment-preview-summary">
        <span>Registration amount (included in fee): <strong>{fmtInr(amountPaidNum)}</strong></span>
        <span>Balance due: <strong>{fmtInr(balanceDue)}</strong></span>
      </div>
    </div>
  );
}

function leadPhone(lead) {
  const m = String(lead.mobile || '').trim();
  if (!m || m.includes('@')) return '';
  const digits = m.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return m;
}

function leadToForm(lead, salesUsers = []) {
  const email = lead.email || (lead.mobile?.includes('@') ? lead.mobile : '');
  const phone = leadPhone(lead);
  const assignedId = lead.assignedTo?._id || lead.assignedTo || '';
  const bdaName = lead.assignedTo?.name || '';

  return {
    leadId: lead._id,
    fullName: lead.name || '',
    phone,
    email,
    city: lead.city || '',
    state: lead.company || '',
    targetYear: lead.targetYear || new Date().getFullYear().toString(),
    attemptsSoFar: '0 (Fresh)',
    aspirantType: 'Full-time',
    examMedium: 'Hindi',
    optionalSubject: '',
    assignedBda: assignedId || (salesUsers[0]?._id || ''),
    leadSource: lead.source || '',
    leadCampaign: lead.platform || '',
    leadBdaName: bdaName,
    programName: '',
    courseType: 'Integrated',
    totalFee: lead.dealValue ?? '',
    discount: '',
    installmentPlan: 'Full Payment',
    amountPaid: '',
    paymentMode: 'Cash',
    transactionId: '',
    installmentStartDate: new Date().toISOString().slice(0, 10),
    notes: lead.requirement || '',
  };
}

const EMPTY_SALES_USERS = [];

const emptyForm = {
  leadId: null,
  fullName: '',
  phone: '',
  email: '',
  city: '',
  state: '',
  targetYear: new Date().getFullYear().toString(),
  attemptsSoFar: '0 (Fresh)',
  aspirantType: 'Full-time',
  examMedium: 'English',
  optionalSubject: '',
  assignedBda: '',
  leadSource: '',
  leadCampaign: '',
  leadBdaName: '',
  programName: '',
  courseType: 'Integrated',
  totalFee: '',
  discount: '',
  installmentPlan: 'Full Payment',
  amountPaid: '',
  paymentMode: 'Cash',
  transactionId: '',
  installmentStartDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function RegisterStudentModal({
  open,
  lead,
  salesUsers,
  isAlreadyRegistered: isAlreadyRegisteredProp = false,
  onClose,
  onSuccess,
}) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const bdas = salesUsers ?? EMPTY_SALES_USERS;
  const leadId = lead?._id ?? null;
  const initKeyRef = useRef('');

  // Reset form when modal opens or when a different lead is selected
  useEffect(() => {
    if (!open) {
      initKeyRef.current = '';
      return;
    }

    const initKey = `${leadId ?? 'manual'}`;
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;

    setStep(0);
    setForm(lead ? leadToForm(lead, bdas) : { ...emptyForm });
    setAlreadyRegistered(Boolean(isAlreadyRegisteredProp));
  }, [open, leadId, isAlreadyRegisteredProp, lead, bdas]);

  // Re-fill BDA dropdown when sales users load after open (without wiping other fields)
  useEffect(() => {
    if (!open || !leadId || bdas.length === 0) return;
    setForm((prev) => {
      if (prev.leadId !== leadId || prev.assignedBda) return prev;
      const assignedId = lead?.assignedTo?._id || lead?.assignedTo || '';
      return {
        ...prev,
        assignedBda: assignedId || bdas[0]?._id || '',
        leadBdaName: lead?.assignedTo?.name || prev.leadBdaName,
      };
    });
  }, [open, leadId, bdas, lead]);

  // Check if lead is already registered
  useEffect(() => {
    if (!open || !leadId) return undefined;

    if (isAlreadyRegisteredProp) {
      setAlreadyRegistered(true);
      return undefined;
    }

    let cancelled = false;
    setAlreadyRegistered(false);

    api
      .get(`/students/by-lead/${leadId}`)
      .then((res) => {
        if (!cancelled) setAlreadyRegistered(Boolean(res.data?.registered));
      })
      .catch(() => {
        if (!cancelled) setAlreadyRegistered(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, leadId, isAlreadyRegisteredProp]);

  if (!open) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const finalFee = Math.max(0, (Number(form.totalFee) || 0) - (Number(form.discount) || 0));
  const amountPaidNum = Math.max(0, Number(form.amountPaid) || 0);
  const startDate = form.installmentStartDate ? new Date(`${form.installmentStartDate}T00:00:00`) : new Date();
  const installmentPreview = buildInstallmentPreview(
    finalFee,
    form.installmentPlan,
    amountPaidNum,
    startDate
  );
  const balanceDue = Math.max(0, finalFee - amountPaidNum);
  const allocatedPaid = sumInstallmentPaid(installmentPreview);

  const validateStudentInfo = () => {
    if (!form.fullName.trim() || !form.phone.trim()) {
      toast.error('Full name and phone are required');
      return false;
    }
    return true;
  };

  const validateProgram = () => {
    if (!form.programName.trim()) {
      toast.error('Program name is required');
      return false;
    }
    if (finalFee > 0 && amountPaidNum > finalFee) {
      toast.error('Amount paid cannot exceed final fee');
      return false;
    }
    if (form.installmentPlan === 'Full Payment' && finalFee > 0 && amountPaidNum > 0 && amountPaidNum < finalFee) {
      toast.error('For Full Payment, amount paid must equal the final fee (or leave it 0 for pay later)');
      return false;
    }
    if (form.installmentPlan !== 'Full Payment' && form.installmentStartDate) {
      if (Number.isNaN(startDate.getTime())) {
        toast.error('Please select a valid first due date');
        return false;
      }
    }
    if (amountPaidNum > 0 && allocatedPaid !== amountPaidNum) {
      toast.error('Amount paid could not be allocated to installments — check fee and plan');
      return false;
    }
    return true;
  };

  const validateStep = () => {
    if (step === 0) return validateStudentInfo();
    if (step === 1) return validateProgram();
    return true;
  };

  const validateAll = () => validateStudentInfo() && validateProgram();

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (alreadyRegistered) {
      toast.info('This lead is already registered. Check the Admissions list.');
      onSuccess?.();
      onClose?.();
      return;
    }
    if (!validateAll()) return;
    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || '',
        city: form.city,
        state: form.state,
        targetYear: form.targetYear,
        attemptsSoFar: form.attemptsSoFar,
        aspirantType: form.aspirantType,
        examMedium: form.examMedium,
        optionalSubject: form.optionalSubject,
        leadSource: form.leadSource,
        leadCampaign: form.leadCampaign,
        leadBdaName: form.leadBdaName,
        programName: form.programName.trim(),
        courseType: form.courseType,
        totalFee: form.totalFee === '' ? 0 : Number(form.totalFee),
        discount: form.discount === '' ? 0 : Number(form.discount),
        installmentPlan: form.installmentPlan,
        installmentStartDate: form.installmentPlan === 'Full Payment'
          ? null
          : (form.installmentStartDate ? `${form.installmentStartDate}T00:00:00` : null),
        amountPaid: form.amountPaid === '' ? 0 : Number(form.amountPaid),
        paymentMode: form.paymentMode || 'Cash',
        transactionId: form.transactionId?.trim() || '',
        notes: form.notes,
      };
      if (form.leadId) payload.leadId = form.leadId;
      if (form.assignedBda) payload.assignedBda = form.assignedBda;

      const res = await api.post('/students', payload);
      if (res.data?.welcomeEmailSent && !res.data?.welcomeEmailWarning) {
        toast.success(res.data?.welcomeEmailMessage || 'Student registered and welcome kit email sent');
      } else if (res.data?.welcomeEmailMessage) {
        const msg = `Student registered. ${res.data.welcomeEmailMessage}`;
        if (res.data?.welcomeEmailWarning) {
          toast.warning(msg);
        } else {
          toast.info(msg);
        }
      } else {
        toast.success('Student registered successfully');
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.alreadyRegistered) {
        toast.info('This lead is already registered. Opening Admissions list.');
        onSuccess?.();
        onClose?.();
        return;
      }
      const msg = err.response?.data?.message || 'Registration failed';
      const field = err.response?.data?.field;
      toast.error(field ? `${msg} (${field})` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content register-student-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Register New Student</h2>
            <p className="modal-subtitle">Pre-filled from lead if converted from CRM</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="register-steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`register-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="register-step-num">{i + 1}</span>
              <span className="register-step-label">{label}</span>
            </div>
          ))}
        </div>

        {alreadyRegistered && (
          <div className="register-already-banner">
            This lead is already registered as a student. You can view them on the Admissions page.
          </div>
        )}

        <div className="register-form-body">
          {step === 0 && (
            <div className="lead-form-grid">
              <label>Full Name *
                <input className="app-input" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </label>
              <label>Phone *
                <input className="app-input" required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </label>
              <label>Email
                <input className="app-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </label>
              <label>City
                <input className="app-input" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </label>
              <label>State
                <input className="app-input" value={form.state} onChange={(e) => set('state', e.target.value)} />
              </label>
              <label>Target Year
                <input className="app-input" value={form.targetYear} onChange={(e) => set('targetYear', e.target.value)} />
              </label>
              <label>Attempts So Far
                <select className="app-select" value={form.attemptsSoFar} onChange={(e) => set('attemptsSoFar', e.target.value)}>
                  {ATTEMPT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label>Aspirant Type
                <select className="app-select" value={form.aspirantType} onChange={(e) => set('aspirantType', e.target.value)}>
                  {ASPIRANT_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label>Exam Medium
                <select className="app-select" value={form.examMedium} onChange={(e) => set('examMedium', e.target.value)}>
                  {EXAM_MEDIUMS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label>Optional Subject
                <input className="app-input" placeholder="e.g. Sociology" value={form.optionalSubject} onChange={(e) => set('optionalSubject', e.target.value)} />
              </label>
              {bdas.length > 0 && (
                <label>Assigned BDA
                  <select className="app-select" value={form.assignedBda} onChange={(e) => set('assignedBda', e.target.value)}>
                    <option value="">Select BDA</option>
                    {bdas.map((u) => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {lead && (
                <div className="lead-attribution-box">
                  <strong>Lead Attribution (auto-filled from CRM)</strong>
                  <div className="lead-attribution-grid">
                    <span><em>Source:</em> {form.leadSource || '—'}</span>
                    <span><em>Campaign:</em> {form.leadCampaign || '—'}</span>
                    <span><em>BDA:</em> {form.leadBdaName || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="lead-form-grid">
              <label>Program Name *
                <input className="app-input" required value={form.programName} onChange={(e) => set('programName', e.target.value)} placeholder="e.g. UPSC Foundation 2026" />
              </label>
              <label>Course Type
                <select className="app-select" value={form.courseType} onChange={(e) => set('courseType', e.target.value)}>
                  {COURSE_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label>Total Fee (₹)
                <input className="app-input" type="number" min="0" value={form.totalFee} onChange={(e) => set('totalFee', e.target.value)} />
              </label>
              <label>Discount (₹)
                <input className="app-input" type="number" min="0" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
              </label>
              <label>Final Fee (₹)
                <input className="app-input" readOnly value={finalFee} />
              </label>
              <label>Installment Plan
                <select className="app-select" value={form.installmentPlan} onChange={(e) => set('installmentPlan', e.target.value)}>
                  {INSTALLMENT_PLANS.map((o) => (
                    <option key={o} value={o}>
                      {o === 'EMI' ? 'EMI (6 monthly payments)' : o}
                    </option>
                  ))}
                </select>
                <span className="field-hint">{getInstallmentPlanLabel(form.installmentPlan)}</span>
              </label>
              {form.installmentPlan !== 'Full Payment' && (
                <label>First due date
                  <input
                    className="app-input"
                    type="date"
                    value={form.installmentStartDate || ''}
                    onChange={(e) => set('installmentStartDate', e.target.value)}
                  />
                  <span className="field-hint">
                    This will be the due date for installment/EMI #1. Next payments are monthly from this date.
                  </span>
                </label>
              )}
              <label>Registration amount (₹)
                <input
                  className="app-input"
                  type="number"
                  min="0"
                  max={finalFee || undefined}
                  value={form.amountPaid}
                  onChange={(e) => set('amountPaid', e.target.value)}
                  placeholder={form.installmentPlan === 'Full Payment' && finalFee > 0 ? String(finalFee) : '0'}
                />
                {form.installmentPlan !== 'Full Payment' && finalFee > 0 && (
                  <span className="field-hint">
                    Included in the total fee. Applied to earliest installment(s). Remaining balance split across the plan.
                  </span>
                )}
              </label>
              <label>Payment mode
                <select
                  className="app-select"
                  value={form.paymentMode}
                  onChange={(e) => set('paymentMode', e.target.value)}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
                <span className="field-hint">Shown on the fee receipt / invoice sent to the student.</span>
              </label>
              {(form.paymentMode === 'UPI' ||
                form.paymentMode === 'Credit Card' ||
                form.paymentMode === 'Debit Card' ||
                form.paymentMode === 'Net Banking' ||
                form.paymentMode === 'Bank Transfer') && (
                <label>Transaction / reference ID (optional)
                  <input
                    className="app-input"
                    value={form.transactionId}
                    onChange={(e) => set('transactionId', e.target.value)}
                    placeholder="e.g. UPI ref, last 4 digits, NEFT UTR"
                  />
                </label>
              )}
              {finalFee > 0 && (
                <InstallmentSchedule
                  installments={installmentPreview}
                  plan={form.installmentPlan}
                  balanceDue={balanceDue}
                  amountPaidNum={amountPaidNum}
                />
              )}
              <label className="full-width">Notes
                <textarea className="app-input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="register-confirm">
              <h3>Review & Register</h3>
              <dl className="confirm-dl">
                <dt>Student</dt><dd>{form.fullName}</dd>
                <dt>Phone</dt><dd>{form.phone}</dd>
                <dt>Email</dt><dd>{form.email || '—'}</dd>
                <dt>Program</dt><dd>{form.programName} ({form.courseType})</dd>
                <dt>Final Fee</dt><dd>₹{finalFee.toLocaleString('en-IN')}</dd>
                <dt>Plan</dt><dd>{form.installmentPlan === 'EMI' ? 'EMI (6 monthly payments)' : form.installmentPlan}</dd>
                <dt>Registration amount</dt><dd>{fmtInr(amountPaidNum)}</dd>
                <dt>Payment mode</dt><dd>{form.paymentMode || 'Cash'}</dd>
                {form.transactionId && (
                  <>
                    <dt>Transaction ID</dt><dd>{form.transactionId}</dd>
                  </>
                )}
                <dt>Balance due</dt><dd>{fmtInr(balanceDue)}</dd>
                {lead && (
                  <>
                    <dt>Lead source</dt><dd>{form.leadSource || '—'}</dd>
                  </>
                )}
              </dl>
              {finalFee > 0 && (
                <InstallmentSchedule
                  installments={installmentPreview}
                  plan={form.installmentPlan}
                  balanceDue={balanceDue}
                  amountPaidNum={amountPaidNum}
                />
              )}
            </div>
          )}
        </div>

        <div className="register-modal-footer">
          {step > 0 && (
            <button type="button" className="app-btn app-btn-ghost" onClick={handleBack} disabled={loading}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button type="button" className="app-btn app-btn-primary register-next-btn" onClick={handleNext}>
              Next: {STEPS[step + 1]} →
            </button>
          ) : (
            <button
              type="button"
              className="app-btn app-btn-primary register-next-btn"
              onClick={alreadyRegistered ? onClose : handleSubmit}
              disabled={loading}
            >
              {alreadyRegistered ? 'Close' : loading ? 'Registering…' : 'Confirm & Register'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
