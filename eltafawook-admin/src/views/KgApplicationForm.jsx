import { useState, useEffect } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { apiFetch } from '../api';
import { eg11ToE164, isFullNameValid } from '../utils/helpers';

import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select, Textarea } from '../components/Form';
import { AppShell, Container, H1 } from '../components/Layout';
import logo from '../assets/logo.png';

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

const InfoBox = styled.div`
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    margin: 24px 0;
    font-size: 14px;
    line-height: 1.6;
    background: var(--bg);

    h3, h4 { margin-top: 0; }
    ul { padding-left: 20px; margin-bottom: 0; }
    p { margin-top: 0; }
`;

const PreSubmissionInfo = () => {
    const { t } = useTranslation();
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginTop: '24px', fontSize: '14px', lineHeight: '1.6', background: 'var(--bg)' }}>
            <h3 style={{ marginTop: 0 }}>{t("register_kg_students.presub.box_title")}</h3>
            <h4>{t("register_kg_students.presub.fees_title")}</h4>
            <ul>
                <li><b>{t("register_kg_students.presub.fees_morning")}</b></li>
                <li><b>{t("register_kg_students.presub.fees_evening")}</b></li>
                <li>{t("register_kg_students.presub.fees_age")}</li>
            </ul>
            <hr style={{margin: '16px 0', borderTop: '1px solid var(--border)'}} />
            <h4>{t("register_kg_students.presub.transport_title")}</h4>
            <p>{t("register_kg_students.presub.transport_text")}</p>
            <ul>
                <li>{t("register_kg_students.presub.driver_1")}</li>
                <li>{t("register_kg_students.presub.driver_2")}</li>
                <li>{t("register_kg_students.presub.driver_3")}</li>
            </ul>
            <hr style={{margin: '16px 0', borderTop: '1px solid var(--border)'}} />
            <h4>{t("register_kg_students.presub.uniform_title")}</h4>
            <p>{t("register_kg_students.presub.uniform_text")}</p>
            <hr style={{margin: '16px 0', borderTop: '1px solid var(--border)'}} />
            <h4>{t("register_kg_students.presub.docs_title")}</h4>
            <p>{t("register_kg_students.presub.docs_text")}</p>
            <ul>
                <li>{t("register_kg_students.presub.doc_1")}</li>
                <li>{t("register_kg_students.presub.doc_2")}</li>
                <li>{t("register_kg_students.presub.doc_3")}</li>
            </ul>
        </div>
    );
};

export default function KgApplicationForm() {
    const { t, i18n } = useTranslation();
    const [form, setForm] = useState(INITIAL_FORM_STATE);
    const [ageAtOctober, setAgeAtOctober] = useState({ years: '', months: '', days: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    
    const apiBase = "http://localhost:8000/api/v1";

    useEffect(() => {
        const calculatedAge = calculateAgeAtOctober(form.date_of_birth);
        setAgeAtOctober(calculatedAge);
    }, [form.date_of_birth]);

    useEffect(() => {
        if (i18n.language !== 'ar') {
            i18n.changeLanguage('ar');
        }
        document.body.dir = 'rtl';
    }, [i18n]);
    
    useEffect(() => {
        document.body.dir = i18n.dir();
    }, [i18n, i18n.language]);

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handlePickupChange = (index, value) => {
        const updatedPickups = [...form.authorized_pickups];
        updatedPickups[index] = value;
        setForm(prev => ({ ...prev, authorized_pickups: updatedPickups }));
    };
    
    const handleSubmit = async () => {
        setError("");

        if (!form.full_name.trim() || !form.father_name.trim() || !form.date_of_birth) {
            setError("Please fill in all required fields: Child's Full Name, Father's Name, and Date of Birth.");
            return;
        }
        
        // The National ID check is already optional (it only runs if a value is entered), so it remains.
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
    
    return (
        <AppShell>
            <Container style={{ paddingTop: '40px', paddingBottom: '40px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                         <img src={logo} alt="Eltafawook Academy Logo" style={{ height: '60px' }} />
                        <H1 style={{justifyContent: 'center'}}>{t("navKgReg")}</H1>
                    </div>

                    {success ? (
                        <Card>
                            <CardBody style={{textAlign: 'center'}}>
                                <h2 style={{color: '#059669'}}>{t("toasts_kg_students.reg_success")}</h2>
                                <p>{t("toasts_kg_students.reg_success")}</p>
                            </CardBody>
                        </Card>
                    ) : (
                        <Card>
                            <CardBody>
                                {/* --- RE-ADDED FULL FORM CONTENT --- */}
                                <CardTitle style={{ fontSize: 16 }}>{t("register_kg_students.child_info_title")}</CardTitle>
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
                                <Row cols={1}><Label>{t("register_kg_students.labels.address")}</Label><Input name="address" value={form.address} onChange={handleFormChange} /></Row>
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
                                
                                {error && <p style={{color: 'var(--danger)', textAlign: 'center'}}>{error}</p>}

                                <div style={{marginTop: 24}}>
                                    <Button onClick={handleSubmit} disabled={isSubmitting} style={{width: '100%', padding: '12px'}}>
                                        {isSubmitting ? t("signingIn") : t("register_kg_students.submit_btn")}
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </AppShell>
    );
}