import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  ASPIRANT_TYPES,
  EXAM_MEDIUMS,
  ATTEMPT_OPTIONS,
  INSTALLMENT_PLANS,
  CUSTOM_EMI_MIN,
  CUSTOM_EMI_MAX,
  COURSE_TYPES,
  PAYMENT_MODES,
} from '../../utils/studentConstants';
import {
  buildInstallmentPreview,
  formatInstallmentPlanOption,
  getInstallmentBalanceTotal,
  getInstallmentPlanLabel,
  normalizeCustomInstallmentCount,
  setInstallmentAmountAt,
} from '../../utils/paymentHelpers';

const STEPS_SALES = ['Student Info', 'Program & Fee', 'Review & Submit'];
const STEPS_ADMIN = ['Student Info', 'Program & Fee', 'Confirm & Register'];

const fmtInr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

function InstallmentSchedule({
  installments,
  plan,
  customInstallmentCount,
  balanceDue,
  amountPaidNum,
  editable,
  onInstallmentAmountChange,
}) {
  const dueInstallments = installments.filter((inst) => Number(inst.amount) >= 0);
  const showRegistration = amountPaidNum > 0;
  const lastNumber = dueInstallments.length ? dueInstallments[dueInstallments.length - 1].number : null;

  if (!showRegistration && !dueInstallments.length) return null;

  return (
    <div className="installment-preview-box full-width">
      <div className="installment-preview-header">
        <strong>Payment schedule</strong>
        <span className="muted-text">{getInstallmentPlanLabel(plan, customInstallmentCount)}</span>
      </div>
      {editable && dueInstallments.length > 1 && (
        <p className="installment-preview-edit-hint muted-text">
          Edit an installment amount; the last one adjusts to the remaining balance.
        </p>
      )}
      <ul className="installment-preview-list">
        {showRegistration && (
          <li className="installment-preview-row status-paid">
            <span className="installment-preview-num">Reg.</span>
            <span className="installment-preview-due">At registration</span>
            <span className="installment-preview-amount">{fmtInr(amountPaidNum)}</span>
            <span className="installment-preview-status badge badge-payment-paid">Paid</span>
          </li>
        )}
        {dueInstallments.map((inst) => {
          const dueStr = inst.dueDate
            ? new Date(inst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
          const remaining = Math.max(0, inst.amount - (inst.paidAmount || 0));
          const isLast = inst.number === lastNumber;
          const canEdit = editable && dueInstallments.length > 0 && (dueInstallments.length === 1 || !isLast);

          return (
            <li key={inst.number} className={`installment-preview-row status-${(inst.status || 'pending').toLowerCase()}`}>
              <span className="installment-preview-num">#{inst.number}</span>
              <span className="installment-preview-due">Due {dueStr}</span>
              {canEdit ? (
                <input
                  type="number"
                  className="app-input installment-preview-amount-input"
                  min={0}
                  max={balanceDue}
                  value={inst.amount}
                  onChange={(e) => onInstallmentAmountChange?.(inst.number, e.target.value)}
                  aria-label={`Installment ${inst.number} amount`}
                />
              ) : (
                <span className="installment-preview-amount">
                  {fmtInr(inst.amount)}
                  {editable && isLast && dueInstallments.length > 1 && (
                    <span className="installment-preview-auto-tag">auto</span>
                  )}
                </span>
              )}
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
        <span>Registration paid: <strong>{fmtInr(amountPaidNum)}</strong></span>
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
    customInstallmentCount: '6',
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
  customInstallmentCount: '6',
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const STEPS = isAdmin ? STEPS_ADMIN : STEPS_SALES;
  const [step, setStep] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState(null);
  const scheduleSourceKeyRef = useRef('');

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
    setPendingApproval(false);
    setEditedSchedule(null);
    scheduleSourceKeyRef.current = '';
  }, [open, leadId, isAlreadyRegisteredProp, lead, bdas]);

  useEffect(() => {
    if (!open) return;
    const key = `${form.totalFee}|${form.discount}|${form.installmentPlan}|${form.customInstallmentCount}|${form.amountPaid}|${form.installmentStartDate}`;
    if (scheduleSourceKeyRef.current && scheduleSourceKeyRef.current !== key) {
      setEditedSchedule(null);
    }
    scheduleSourceKeyRef.current = key;
  }, [open, form.totalFee, form.discount, form.installmentPlan, form.customInstallmentCount, form.amountPaid, form.installmentStartDate]);

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
        if (!cancelled) {
          setAlreadyRegistered(Boolean(res.data?.registered));
          setPendingApproval(Boolean(res.data?.pendingApproval));
        }
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
  const customEmiCount =
    form.installmentPlan === 'Custom EMI' ? normalizeCustomInstallmentCount(form.customInstallmentCount) : null;
  const installmentPreview = buildInstallmentPreview(
    finalFee,
    form.installmentPlan,
    amountPaidNum,
    startDate,
    customEmiCount
  );
  const installmentBalanceTotal = getInstallmentBalanceTotal(finalFee, amountPaidNum);
  const displayInstallments = editedSchedule ?? installmentPreview;
  const balanceDue = Math.max(0, finalFee - amountPaidNum);
  const scheduleEditable = installmentBalanceTotal > 0 && displayInstallments.length > 0;
  const needsBalanceDueDate = installmentBalanceTotal > 0;

  const handleInstallmentAmountChange = (installmentNumber, rawValue) => {
    const base = editedSchedule ?? installmentPreview;
    setEditedSchedule(
      setInstallmentAmountAt(base, installmentBalanceTotal, installmentNumber, rawValue)
    );
  };

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
    if (form.installmentPlan === 'Custom EMI') {
      const raw = Number(form.customInstallmentCount);
      if (!raw || raw < CUSTOM_EMI_MIN || raw > CUSTOM_EMI_MAX) {
        toast.error(`Number of EMIs must be between ${CUSTOM_EMI_MIN} and ${CUSTOM_EMI_MAX}`);
        return false;
      }
    }
    if (needsBalanceDueDate) {
      if (!form.installmentStartDate || Number.isNaN(startDate.getTime())) {
        toast.error(
          form.installmentPlan === 'Full Payment'
            ? 'Please select when the balance payment is due'
            : 'Please select a valid first due date'
        );
        return false;
      }
    }
    if (installmentBalanceTotal > 0 && displayInstallments.length > 0) {
      const scheduleSum = displayInstallments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
      if (Math.abs(scheduleSum - installmentBalanceTotal) > 1) {
        toast.error('Installment amounts must add up to the balance due');
        return false;
      }
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
        ...(form.installmentPlan === 'Custom EMI'
          ? { customInstallmentCount: customEmiCount }
          : {}),
        installmentStartDate: needsBalanceDueDate && form.installmentStartDate
          ? `${form.installmentStartDate}T00:00:00`
          : null,
        amountPaid: form.amountPaid === '' ? 0 : Number(form.amountPaid),
        paymentMode: form.paymentMode || 'Cash',
        transactionId: form.transactionId?.trim() || '',
        notes: form.notes,
      };
      if (form.leadId) payload.leadId = form.leadId;
      if (form.assignedBda) payload.assignedBda = form.assignedBda;
      if (displayInstallments.length > 0) {
        payload.installments = displayInstallments.map((inst) => ({
          number: inst.number,
          amount: inst.amount,
          dueDate: inst.dueDate,
        }));
      }

      const res = await api.post('/students', payload);
      if (res.data?.pendingApproval) {
        toast.success(
          res.data?.welcomeEmailMessage ||
            'Registration submitted for admin approval. The student will be notified after approval.'
        );
      } else if (res.data?.welcomeEmailSent && !res.data?.welcomeEmailWarning) {
        toast.success(res.data?.welcomeEmailMessage || 'Student registered and welcome kit email sent');
      } else if (res.data?.welcomeEmailMessage) {
        const msg = res.data.pendingApproval
          ? res.data.welcomeEmailMessage
          : `Student registered. ${res.data.welcomeEmailMessage}`;
        if (res.data?.welcomeEmailWarning) {
          toast.warning(msg);
        } else {
          toast.info(msg);
        }
      } else {
        toast.success(isAdmin ? 'Student registered successfully' : 'Submitted for admin approval');
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

        {pendingApproval && !isAdmin && (
          <p className="approval-submit-hint" style={{ padding: '0 24px 8px' }}>
            This lead registration is awaiting admin approval. You will be notified once it is approved.
          </p>
        )}

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
              <label>Discount+Scholarship (₹)
                <input className="app-input" type="number" min="0" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
              </label>
              <label>Final Fee (₹)
                <input className="app-input" readOnly value={finalFee} />
              </label>
              <label>Installment Plan
                <select className="app-select" value={form.installmentPlan} onChange={(e) => set('installmentPlan', e.target.value)}>
                  {INSTALLMENT_PLANS.map((o) => (
                    <option key={o} value={o}>{formatInstallmentPlanOption(o)}</option>
                  ))}
                </select>
                <span className="field-hint">{getInstallmentPlanLabel(form.installmentPlan, customEmiCount)}</span>
              </label>
              {form.installmentPlan === 'Custom EMI' && (
                <label>Number of monthly EMIs *
                  <input
                    className="app-input"
                    type="number"
                    min={CUSTOM_EMI_MIN}
                    max={CUSTOM_EMI_MAX}
                    required
                    value={form.customInstallmentCount}
                    onChange={(e) => set('customInstallmentCount', e.target.value)}
                  />
                  <span className="field-hint">
                    Enter how many equal monthly payments to split the balance ({CUSTOM_EMI_MIN}–{CUSTOM_EMI_MAX}).
                  </span>
                </label>
              )}
              {(form.installmentPlan !== 'Full Payment' || needsBalanceDueDate) && (
                <label>
                  {form.installmentPlan === 'Full Payment' ? 'Balance payment due date' : 'First due date'}
                  <input
                    className="app-input"
                    type="date"
                    value={form.installmentStartDate || ''}
                    onChange={(e) => set('installmentStartDate', e.target.value)}
                  />
                  <span className="field-hint">
                    {form.installmentPlan === 'Full Payment'
                      ? 'When the remaining fee must be paid in full (shown as due date for payment #1).'
                      : 'This will be the due date for installment/EMI #1. Next payments are monthly from this date.'}
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
                  placeholder="0"
                />
                {finalFee > 0 && (
                  <span className="field-hint">
                    Amount received now at registration (shown as Paid in the schedule). Remaining balance is due later.
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
                  installments={displayInstallments}
                  plan={form.installmentPlan}
                  customInstallmentCount={customEmiCount}
                  balanceDue={balanceDue}
                  amountPaidNum={amountPaidNum}
                  editable={scheduleEditable}
                  onInstallmentAmountChange={handleInstallmentAmountChange}
                />
              )}
              <label className="full-width">Notes
                <textarea className="app-input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="register-confirm">
              <h3>{isAdmin ? 'Review & Register' : 'Review & Submit'}</h3>
              {!isAdmin && (
                <p className="approval-submit-hint muted-text">
                  This registration will be sent to admin for approval. The welcome email goes to the student only after approval.
                </p>
              )}
              <dl className="confirm-dl">
                <dt>Student</dt><dd>{form.fullName}</dd>
                <dt>Phone</dt><dd>{form.phone}</dd>
                <dt>Email</dt><dd>{form.email || '—'}</dd>
                <dt>Program</dt><dd>{form.programName} ({form.courseType})</dd>
                <dt>Final Fee</dt><dd>₹{finalFee.toLocaleString('en-IN')}</dd>
                <dt>Plan</dt><dd>{getInstallmentPlanLabel(form.installmentPlan, customEmiCount)}</dd>
                <dt>Registration amount</dt><dd>{fmtInr(amountPaidNum)}</dd>
                <dt>Payment mode</dt><dd>{form.paymentMode || 'Cash'}</dd>
                {form.transactionId && (
                  <>
                    <dt>Transaction ID</dt><dd>{form.transactionId}</dd>
                  </>
                )}
                <dt>Balance due</dt><dd>{fmtInr(balanceDue)}</dd>
                {needsBalanceDueDate && form.installmentStartDate && (
                  <>
                    <dt>{form.installmentPlan === 'Full Payment' ? 'Balance payment due' : 'First due date'}</dt>
                    <dd>
                      {new Date(`${form.installmentStartDate}T00:00:00`).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </dd>
                  </>
                )}
                {lead && (
                  <>
                    <dt>Lead source</dt><dd>{form.leadSource || '—'}</dd>
                  </>
                )}
              </dl>
              {finalFee > 0 && (
                <InstallmentSchedule
                  installments={displayInstallments}
                  plan={form.installmentPlan}
                  customInstallmentCount={customEmiCount}
                  balanceDue={balanceDue}
                  amountPaidNum={amountPaidNum}
                  editable={scheduleEditable}
                  onInstallmentAmountChange={handleInstallmentAmountChange}
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
              disabled={loading || (pendingApproval && !isAdmin)}
            >
              {alreadyRegistered
                ? pendingApproval && !isAdmin
                  ? 'Awaiting approval'
                  : 'Close'
                : loading
                  ? isAdmin
                    ? 'Registering…'
                    : 'Submitting…'
                  : isAdmin
                    ? 'Confirm & Register'
                    : 'Submit for approval'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
