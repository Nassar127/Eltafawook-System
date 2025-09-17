import React, { useState, useEffect } from "react";
import { apiFetch, apiSearchKgStudent } from '../api';
import { eg11ToE164, isFullNameValid } from '../utils/helpers';

import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select, Textarea } from '../components/Form';
import { Helper, SubTabs, SubTabButton, Pill } from '../components/Misc';
import { useTranslation } from "react-i18next";

const INITIAL_FORM_STATE = {
  full_name: "",
  national_id: "",
  nationality: "Egyptian",
  religion: "Muslim",
  address: "",
  date_of_birth: "",
  place_of_birth: "",
  attendance_period: 'morning',
  father_name: "",
  father_national_id: "",
  father_profession: "",
  father_phone: "",
  father_whatsapp: "",
  mother_phone: "",
  guardian_name: "",
  guardian_national_id: "",
  guardian_relation: "",
  guardian_phone: "",
  guardian_whatsapp: "",
  has_chronic_illness: false,
  chronic_illness_description: "",
  attended_previous_nursery: false,
  previous_nursery_name: "",
  needs_bus_subscription: false,
  alternative_transport_method: "",
  authorized_pickups: ["", "", ""],
};

function calculateAgeAtOctober(birthDateStr) {
  if (!birthDateStr) return { years: '', months: '', days: '' };
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return { years: '', months: '', days: '' };

  const today = new Date();
  const targetDate = new Date(today.getFullYear(), 9, 1);

  let years = targetDate.getFullYear() - birthDate.getFullYear();
  let months = targetDate.getMonth() - birthDate.getMonth();
  let days = targetDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const lastDayOfPreviousMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0).getDate();
    days += lastDayOfPreviousMonth;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

const PreSubmissionInfo = () => {
  const { t } = useTranslation();

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginTop: '24px', fontSize: '14px', lineHeight: '1.6' }}>
      <h3 style={{ marginTop: 0 }}>{t("register_kg_students.presub.box_title")}</h3>

      <h4>{t("register_kg_students.presub.fees_title")}</h4>
      <ul>
        <li>{t("register_kg_students.presub.fees_morning")}</li>
        <li>{t("register_kg_students.presub.fees_evening")}</li>
        <li>{t("register_kg_students.presub.fees_diff")}</li>
        <li>{t("register_kg_students.presub.fees_age")}</li>
      </ul>

      <h4>{t("register_kg_students.presub.transport_title")}</h4>
      <p>{t("register_kg_students.presub.transport_text")}</p>
      <ul>
        <li>{t("register_kg_students.presub.driver_1")}</li>
        <li>{t("register_kg_students.presub.driver_2")}</li>
        <li>{t("register_kg_students.presub.driver_3")}</li>
      </ul>

      <h4>{t("register_kg_students.presub.uniform_title")}</h4>
      <p>{t("register_kg_students.presub.uniform_text")}</p>

      <h4>{t("register_kg_students.presub.docs_title")}</h4>
      <p>{t("register_kg_students.presub.docs_text")}</p>
      <ul>
        <li>{t("register_kg_students.presub.doc_1")}</li>
        <li>{t("register_kg_students.presub.doc_2")}</li>
        <li>{t("register_kg_students.presub.doc_3")}</li>
        <li>{t("register_kg_students.presub.doc_4")}</li>
      </ul>
    </div>
  );
};

export default function KgStudents({ apiBase, authToken, toast, branchId }) {
  const [tab, setTab] = useState("register");
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [ageAtOctober, setAgeAtOctober] = useState({ years: '', months: '', days: '' });
  const [editSearchTerm, setEditSearchTerm] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editRows, setEditRows] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const { t, i18n } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const formatDateLocalized = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    const locale = i18n?.language?.startsWith("ar") ? "ar-EG" : undefined;
    return d.toLocaleDateString(locale);
  };

  useEffect(() => {
    const calculatedAge = calculateAgeAtOctober(form.date_of_birth);
    setAgeAtOctober(calculatedAge);
  }, [form.date_of_birth]);

  useEffect(() => {
    const fetchPending = async () => {
      if (tab === 'acceptance' && branchId) {
        setLoadingPending(true);
        try {
          const data = await apiFetch(apiBase, `/kg-students/pending?branch_id=${branchId}`, { authToken });
          setPendingStudents(data || []);
        } catch (e) {
          toast.push({ title: t("toasts_kg_students.pending_failed"), description: e.message, tone: "error" });
        } finally {
          setLoadingPending(false);
        }
      }
    };
    fetchPending();
  }, [tab, branchId, apiBase, authToken]);

  const handleStatusUpdate = async (studentId, newStatus) => {
    const confirmationMessage =
      newStatus === 'accepted'
        ? t("confirms.accept")
        : t("confirms.reject");

    if (window.confirm(confirmationMessage)) {
      try {
        await apiFetch(apiBase, `/kg-students/${studentId}/status`, {
          method: "PATCH",
          body: { status: newStatus },
          authToken
        });
        const statusTitle =
          newStatus === 'accepted'
            ? t("toasts_kg_students.student_accepted")
            : t("toasts_kg_students.student_rejected");
        toast.push({ title: statusTitle, tone: "success" });
        setPendingStudents(prev => prev.filter(s => s.id !== studentId));
      } catch (e) {
        toast.push({ title: t("toasts_kg_students.status_failed"), description: e.message, tone: "error" });
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePickupChange = (index, value) => {
    const updatedPickups = [...form.authorized_pickups];
    updatedPickups[index] = value;
    setForm(prev => ({ ...prev, authorized_pickups: updatedPickups }));
  };

  const handleEditSearch = async () => {
    if (!editSearchTerm.trim()) return;
    setEditLoading(true);
    setEditRows([]);
    try {
      const results = await apiSearchKgStudent(apiBase, { term: editSearchTerm, branchId, authToken });
      setEditRows(results);
      if (results.length === 0) {
        toast.push({ title: t("toasts_kg_students.no_students") });
      }
    } catch (e) {
      toast.push({ title: t("toasts_kg_students.search_failed"), description: e.message, tone: "error" });
    } finally {
      setEditLoading(false);
    }
  };

  const beginEdit = (student) => {
    const pickups = Array.isArray(student.authorized_pickups) ? student.authorized_pickups : [];
    while (pickups.length < 3) pickups.push("");
    setEditForm({ ...student, authorized_pickups: pickups });
  };

  const submitEdit = async () => {
    if (!editForm) return;

    const phoneFields = {
      father_phone: eg11ToE164(editForm.father_phone),
      father_whatsapp: eg11ToE164(editForm.father_whatsapp),
      mother_phone: eg11ToE164(editForm.mother_phone),
      guardian_phone: eg11ToE164(editForm.guardian_phone),
      guardian_whatsapp: eg11ToE164(editForm.guardian_whatsapp)
    };

    try {
      const payload = {
        ...editForm,
        ...phoneFields,
        authorized_pickups: editForm.authorized_pickups.filter(name => name.trim() !== ""),
      };
      await apiFetch(apiBase, `/kg-students/${editForm.id}`, { method: "PUT", body: payload, authToken });
      toast.push({ title: t("toasts_kg_students.student_updated"), description: editForm.full_name, tone: "success" });
      setEditForm(null);
      setEditRows([]);
      setEditSearchTerm("");
    } catch (e) {
      toast.push({ title: t("toasts_kg_students.update_failed"), description: e.message, tone: "error" });
    }
  };

    const handleSubmit = async () => {
        setError("");

        if (!form.full_name.trim() || !form.father_name.trim() || !form.date_of_birth) {
            setError("Please fill in all required fields: Child's Full Name, Father's Name, and Date of Birth.");
            return;
        }
        
        if (form.national_id && form.national_id.replace(/\D/g, '').length !== 14) {
            setError("If you enter a National ID for the child, it must be 14 digits.");
            return;
        }
        if (form.father_national_id && form.father_national_id.replace(/\D/g, '').length !== 14) {
            setError("If you enter a National ID for the father, it must be 14 digits.");
            return;
        }

        if (form.needs_bus_subscription === false && !form.alternative_transport_method?.trim()) {
            setError("If you do not need the bus, please specify the alternative transport method.");
            return;
        }

        if (!isFullNameValid(form.full_name) || !form.father_name || !form.date_of_birth) {
            setError("Please fill in all required fields: Child's Full Name (min. two names), Father's Name, and Date of Birth.");
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                ...form,
                father_phone: eg11ToE164(form.father_phone),
                father_whatsapp: eg11ToE164(form.father_whatsapp),
                mother_phone: eg11ToE164(form.mother_phone),
                guardian_phone: eg11ToE164(form.guardian_phone),
                guardian_whatsapp: eg11ToE164(form.guardian_whatsapp),
                authorized_pickups: form.authorized_pickups.filter(name => name && name.trim() !== "")
            };
            await apiFetch(apiBase, "/public/kg-applications", { method: "POST", body: payload });
            setSuccess(true);
        } catch (e) {
            setError(`Submission Failed: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

  const handleRegisterAnother = () => {
    setForm(INITIAL_FORM_STATE);
    setSuccess(false);
  };

  return (
    <Card dir={i18n?.dir?.() || undefined} lang={i18n?.language}>
      <CardHead>
        <CardTitle>{t('title_kg_students')}</CardTitle>
      </CardHead>
      <CardBody>
        <SubTabs>
          <SubTabButton $active={tab === 'register'} onClick={() => setTab('register')}>
            {t("tabs_kg_students.register")}
          </SubTabButton>
          <SubTabButton
            $active={tab === 'edit'}
            onClick={() => { setTab('edit'); setEditForm(null); setEditRows([]); }}>
            {t("tabs_kg_students.edit")}
          </SubTabButton>
          <SubTabButton $active={tab === 'acceptance'} onClick={() => setTab('acceptance')}>
            {t("tabs_kg_students.acceptance")}
          </SubTabButton>
        </SubTabs>

        {tab === 'register' && (
          <>
            {success ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <h2 style={{ color: '#059669' }}>{t("toasts_kg_students.reg_success")}</h2>
                <p>{t("toasts_kg_students.reg_success_desc", { name: form.full_name })}</p>
                <Button onClick={handleRegisterAnother} style={{ marginTop: '16px' }}>
                    {t("register_kg_students.register_another")}
                </Button>
              </div>
            ) : (
              <div>
                <CardTitle style={{ fontSize: 16, marginTop: 16 }}>{t("register_kg_students.child_info_title")}</CardTitle>
                <Row cols={3}>
                  <div><Label>{t("register_kg_students.labels.full_name")}</Label><Input name="full_name" value={form.full_name} onChange={handleFormChange} /></div>
                  <div><Label>{t("register_kg_students.labels.national_id")}</Label><Input name="national_id" value={form.national_id} onChange={handleFormChange} maxLength={14} /></div>
                  <div><Label>{t("register_kg_students.labels.nationality")}</Label><Input name="nationality" value={form.nationality} onChange={handleFormChange} /></div>
                  <div>
                    <Label>{t("register_kg_students.labels.religion")}</Label>
                    <Select name="religion" value={form.religion} onChange={handleFormChange}>
                      <option value="Muslim">{t("register_kg_students.labels.religion_muslim")}</option>
                      <option value="Christian">{t("register_kg_students.labels.religion_christian")}</option>
                    </Select>
                  </div>
                  <div><Label>{t("register_kg_students.labels.dob")}</Label><Input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleFormChange} /></div>
                  <div><Label>{t("register_kg_students.labels.pob")}</Label><Input name="place_of_birth" value={form.place_of_birth} onChange={handleFormChange} /></div>
                </Row>
                <Row cols={1}>
                  <div><Label>{t("register_kg_students.labels.address")}</Label><Input name="address" value={form.address} onChange={handleFormChange} /></div>
                </Row>

                <Row cols={1} style={{ marginTop: '12px' }}>
                  <div>
                    <Label>{t("register_kg_students.labels.attendance_title")}</Label>
                    <Select name="attendance_period" value={form.attendance_period} onChange={handleFormChange}>
                      <option value="morning">{t("register_kg_students.labels.attendance_morning")}</option>
                      <option value="evening">{t("register_kg_students.labels.attendance_evening")}</option>
                      <option value="both">{t("register_kg_students.labels.attendance_both")}</option>
                    </Select>
                  </div>
                </Row>

                <div style={{ marginTop: '12px' }}>
                  <Label>{t("register_kg_students.labels.age_oct_title")}</Label>
                  <Row cols={3}>
                    <div><Input value={ageAtOctober.years} readOnly disabled placeholder={t("register_kg_students.labels.age_years_ph")} /></div>
                    <div><Input value={ageAtOctober.months} readOnly disabled placeholder={t("register_kg_students.labels.age_months_ph")} /></div>
                    <div><Input value={ageAtOctober.days} readOnly disabled placeholder={t("register_kg_students.labels.age_days_ph")} /></div>
                  </Row>
                </div>

                <hr style={{ margin: '24px 0' }} />
                <CardTitle style={{ fontSize: 16 }}>{t("register_kg_students.parents_title")}</CardTitle>
                <Row cols={2}>
                  <div><Label>{t("register_kg_students.parents.father_name")}</Label><Input name="father_name" value={form.father_name} onChange={handleFormChange} /></div>
                  <div><Label>{t("register_kg_students.parents.father_national_id")}</Label><Input name="father_national_id" value={form.father_national_id} onChange={handleFormChange} maxLength={14} /></div>
                  <div><Label>{t("register_kg_students.parents.father_profession")}</Label><Input name="father_profession" value={form.father_profession} onChange={handleFormChange} /></div>
                  <div><Label>{t("register_kg_students.parents.father_phone")}</Label><Input name="father_phone" value={form.father_phone} onChange={handleFormChange} maxLength={11} /></div>
                  <div><Label>{t("register_kg_students.parents.father_whatsapp")}</Label><Input name="father_whatsapp" value={form.father_whatsapp} onChange={handleFormChange} maxLength={11} /></div>
                  <div><Label>{t("register_kg_students.parents.mother_phone")}</Label><Input name="mother_phone" value={form.mother_phone} onChange={handleFormChange} maxLength={11} /></div>
                </Row>

                <hr style={{ margin: '24px 0' }} />
                <CardTitle style={{ fontSize: 16 }}>{t("register_kg_students.guardian_title")}</CardTitle>
                <Row cols={2}>
                  <div><Label>{t("register_kg_students.guardian.name")}</Label><Input name="guardian_name" value={form.guardian_name} onChange={handleFormChange} /></div>
                  <div><Label>{t("register_kg_students.guardian.national_id")}</Label><Input name="guardian_national_id" value={form.guardian_national_id} onChange={handleFormChange} maxLength={14} /></div>
                  <div><Label>{t("register_kg_students.guardian.relation")}</Label><Input name="guardian_relation" value={form.guardian_relation} onChange={handleFormChange} /></div>
                  <div><Label>{t("register_kg_students.guardian.phone")}</Label><Input name="guardian_phone" value={form.guardian_phone} onChange={handleFormChange} maxLength={11} /></div>
                  <div><Label>{t("register_kg_students.guardian.whatsapp")}</Label><Input name="guardian_whatsapp" value={form.guardian_whatsapp} onChange={handleFormChange} maxLength={11} /></div>
                </Row>

                <hr style={{ margin: '24px 0' }} />
                <CardTitle style={{ fontSize: 16 }}>{t("register_kg_students.additional_title")}</CardTitle>
                <Row cols={2}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" id="has_chronic_illness" name="has_chronic_illness" checked={form.has_chronic_illness} onChange={handleFormChange} style={{ width: 20, height: 20 }} />
                    <Label htmlFor="has_chronic_illness" style={{ marginBottom: 0 }}>{t("register_kg_students.additional.has_illness")}</Label>
                  </div>
                  {form.has_chronic_illness && <div><Label>{t("register_kg_students.additional.illness_desc")}</Label><Input name="chronic_illness_description" value={form.chronic_illness_description} onChange={handleFormChange} /></div>}
                </Row>
                <Row cols={2} style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" id="attended_previous_nursery" name="attended_previous_nursery" checked={form.attended_previous_nursery} onChange={handleFormChange} style={{ width: 20, height: 20 }} />
                    <Label htmlFor="attended_previous_nursery" style={{ marginBottom: 0 }}>{t("register_kg_students.additional.attended_prev")}</Label>
                  </div>
                  {form.attended_previous_nursery && <div><Label>{t("register_kg_students.additional.prev_name")}</Label><Input name="previous_nursery_name" value={form.previous_nursery_name} onChange={handleFormChange} /></div>}
                </Row>

                <Row cols={2} style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" id="needs_bus_subscription" name="needs_bus_subscription" checked={form.needs_bus_subscription} onChange={handleFormChange} style={{ width: 20, height: 20 }} />
                    <Label htmlFor="needs_bus_subscription" style={{ marginBottom: 0 }}>{t("register_kg_students.additional.needs_bus")}</Label>
                  </div>
                  {!form.needs_bus_subscription && <div><Label>{t("register_kg_students.additional.alt_transport")}</Label><Input name="alternative_transport_method" value={form.alternative_transport_method} onChange={handleFormChange} /></div>}
                </Row>
                
                <div style={{ marginTop: 16 }}>
                  <Label>{t("register_kg_students.pickups.title")}</Label>
                  <Row cols={3}>
                    <Input placeholder={t("register_kg_students.pickups.ph1")} value={form.authorized_pickups[0]} onChange={e => handlePickupChange(0, e.target.value)} />
                    <Input placeholder={t("register_kg_students.pickups.ph2")} value={form.authorized_pickups[1]} onChange={e => handlePickupChange(1, e.target.value)} />
                    <Input placeholder={t("register_kg_students.pickups.ph3")} value={form.authorized_pickups[2]} onChange={e => handlePickupChange(2, e.target.value)} />
                  </Row>
                </div>
                
                <PreSubmissionInfo />

                {/* --- CHANGE 4: Add the error display and update the submit button --- */}
                {error && <p style={{color: 'var(--danger)', textAlign: 'center', marginTop: '16px'}}>{error}</p>}
                <div style={{ marginTop: 24 }}>
                  <Button onClick={handleSubmit} disabled={isSubmitting} style={{width: '100%', padding: '12px'}}>
                    {isSubmitting ? t("signingIn") : t("register_kg_students.submit_btn")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'edit' && (
          <div>
            {!editForm ? (
              <>
                <Label>{t("edit_kg_students.search_label")}</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                  <Input value={editSearchTerm} onChange={(e) => setEditSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEditSearch()} placeholder={t("edit_kg_students.ph")} />
                  <Button onClick={handleEditSearch} disabled={editLoading}>{editLoading ? t("edit_kg_students.searching") : t("edit_kg_students.search")}</Button>
                </div>
                <div style={{ marginTop: '24px', display: 'grid', gap: '16px' }}>
                  {editRows.map(student => (
                    <div key={student.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '18px' }}>{student.full_name}</h4>
                        <Button onClick={() => beginEdit(student)}>{t("edit_kg_students.card_edit")}</Button>
                      </div>
                      <Row cols={3} style={{ marginTop: '12px', fontSize: '14px' }}>
                        <div><strong>{t("edit_kg_students.card.father")}</strong> {student.father_name || 'N/A'}</div>
                        <div><strong>{t("edit_kg_students.card.mother_phone")}</strong> {student.mother_phone || 'N/A'}</div>
                        <div><strong>{t("edit_kg_students.card.transport")}</strong> {student.needs_bus_subscription ? 'Bus' : student.alternative_transport_method || 'Private'}</div>
                      </Row>
                      <div style={{ marginTop: '8px', fontSize: '14px' }}>
                        <strong>{t("edit_kg_students.card.auth_pickups")}</strong> {student.authorized_pickups?.join(', ') || t("edit_kg_students.card.none_listed")}
                      </div>
                      {student.has_chronic_illness && (
                        <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--danger)' }}>
                          <strong>{t("edit_kg_students.card.illness")}</strong> {student.chronic_illness_description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <CardTitle style={{ fontSize: 16 }}>{t("edit_kg_students.editing_title", { name: editForm.full_name })}</CardTitle>
                <Row cols={2}>
                  <div><Label>{t("register_kg_students.labels.full_name")}</Label><Input value={editForm.full_name} disabled /></div>
                  <div><Label>{t("register_kg_students.labels.national_id")}</Label><Input value={editForm.national_id} disabled /></div>
                </Row>
                <hr style={{ margin: '24px 0' }} />
                <CardTitle style={{ fontSize: 16 }}>{t("edit_kg_students.editable_info_title")}</CardTitle>
                <Row cols={3}>
                  <div>
                    <Label>{t("edit_kg_students.attendance_label")}</Label>
                    <Select
                      name="attendance_period"
                      value={editForm.attendance_period}
                      onChange={(e) => setEditForm({ ...editForm, attendance_period: e.target.value })}
                    >
                      <option value="morning">{t("register_kg_students.labels.attendance_morning")}</option>
                      <option value="evening">{t("register_kg_students.labels.attendance_evening")}</option>
                      <option value="both">{t("register_kg_students.labels.attendance_both")}</option>
                    </Select>
                  </div>
                  <div><Label>{t("edit_kg_students.phones.father_phone")}</Label><Input name="father_phone" value={editForm.father_phone || ''} onChange={(e) => setEditForm({ ...editForm, father_phone: e.target.value })} maxLength={11} /></div>
                  <div><Label>{t("edit_kg_students.phones.father_whatsapp")}</Label><Input name="father_whatsapp" value={editForm.father_whatsapp || ''} onChange={(e) => setEditForm({ ...editForm, father_whatsapp: e.target.value })} maxLength={11} /></div>
                  <div><Label>{t("edit_kg_students.phones.mother_phone")}</Label><Input name="mother_phone" value={editForm.mother_phone || ''} onChange={(e) => setEditForm({ ...editForm, mother_phone: e.target.value })} maxLength={11} /></div>
                  <div><Label>{t("edit_kg_students.phones.guardian_phone")}</Label><Input name="guardian_phone" value={editForm.guardian_phone || ''} onChange={(e) => setEditForm({ ...editForm, guardian_phone: e.target.value })} maxLength={11} /></div>
                  <div><Label>{t("edit_kg_students.phones.guardian_whatsapp")}</Label><Input name="guardian_whatsapp" value={editForm.guardian_whatsapp || ''} onChange={(e) => setEditForm({ ...editForm, guardian_whatsapp: e.target.value })} maxLength={11} /></div>
                </Row>
                <Row cols={2} style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" id="edit_needs_bus" name="needs_bus_subscription" checked={editForm.needs_bus_subscription} onChange={(e) => setEditForm({ ...editForm, needs_bus_subscription: e.target.checked })} style={{ width: 20, height: 20 }} />
                    <Label htmlFor="edit_needs_bus" style={{ marginBottom: 0 }}>{t("edit_kg_students.flags.needs_bus")}</Label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" id="edit_has_illness" name="has_chronic_illness" checked={editForm.has_chronic_illness} onChange={(e) => setEditForm({ ...editForm, has_chronic_illness: e.target.checked })} style={{ width: 20, height: 20 }} />
                    <Label htmlFor="edit_has_illness" style={{ marginBottom: 0 }}>{t("edit_kg_students.flags.has_illness")}</Label>
                  </div>
                </Row>
                {editForm.has_chronic_illness && (
                  <Row cols={1} style={{ marginTop: 12 }}>
                    <div>
                      <Label>{t("edit_kg_students.illness_desc")}</Label>
                      <Textarea
                        name="chronic_illness_description"
                        value={editForm.chronic_illness_description || ''}
                        onChange={(e) => setEditForm({ ...editForm, chronic_illness_description: e.target.value })}
                      />
                    </div>
                  </Row>
                )}
                <div style={{ marginTop: 16 }}>
                  <Label>{t("edit_kg_students.pickups_title")}</Label>
                  <Row cols={3}>
                    <Input placeholder={t("edit_kg_students.pickups_ph1")} value={editForm.authorized_pickups[0]} onChange={e => setEditForm(prev => { const p = [...prev.authorized_pickups]; p[0] = e.target.value; return { ...prev, authorized_pickups: p }; })} />
                    <Input placeholder={t("edit_kg_students.pickups_ph2")} value={editForm.authorized_pickups[1]} onChange={e => setEditForm(prev => { const p = [...prev.authorized_pickups]; p[1] = e.target.value; return { ...prev, authorized_pickups: p }; })} />
                    <Input placeholder={t("edit_kg_students.pickups_ph3")} value={editForm.authorized_pickups[2]} onChange={e => setEditForm(prev => { const p = [...prev.authorized_pickups]; p[2] = e.target.value; return { ...prev, authorized_pickups: p }; })} />
                  </Row>
                </div>
                <div style={{ marginTop: 24, display: 'flex', gap: '12px' }}>
                  <Button onClick={submitEdit}>{t("edit_kg_students.save")}</Button>
                  <Button $variant="ghost" onClick={() => setEditForm(null)}>{t("edit_kg_students.cancel")}</Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'acceptance' && (
          <div>
            <CardTitle style={{ fontSize: 16 }}>{t("acceptance.title")}</CardTitle>
            {loadingPending && <Helper>{t("acceptance.loading")}</Helper>}
            {!loadingPending && pendingStudents.length === 0 && <Helper>{t("acceptance.empty")}</Helper>}

            <div style={{ marginTop: '16px', display: 'grid', gap: '16px' }}>
              {pendingStudents.map(student => {
                const periodLabel = t(`register_kg_students.labels.attendance_${student.attendance_period}`, { defaultValue: student.attendance_period });
                return (
                  <div key={student.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '18px' }}>{student.full_name}</h4>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {t("acceptance.applied_on", { date: formatDateLocalized(student.application_date), interpolation: { escapeValue: false } })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          $variant="success"
                          onClick={() => handleStatusUpdate(student.id, 'accepted')}
                        >
                          {t("acceptance.accept_btn", { defaultValue: "قبول" })}
                        </Button>
                        <Button
                          $variant="danger"
                          onClick={() => handleStatusUpdate(student.id, 'rejected')}
                        >
                          {t("acceptance.reject_btn", { defaultValue: "رفض" })}
                        </Button>
                      </div>
                    </div>

                    <Row cols={3} style={{ marginTop: '12px', fontSize: '14px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      <div>
                        <strong>{t("acceptance.age_oct")}</strong>{" "}
                        {student.age_oct_years}{t("acceptance.age_suffix.y")}, {student.age_oct_months}{t("acceptance.age_suffix.m")}, {student.age_oct_days}{t("acceptance.age_suffix.d")}
                      </div>
                      <div><strong>{t("acceptance.period")}</strong> <Pill>{periodLabel}</Pill></div>
                      <div>
                        <strong>{t("acceptance.father")}</strong>{" "}
                        {student.father_name || 'N/A'} ({student.father_phone || 'N/A'})
                      </div>
                    </Row>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
