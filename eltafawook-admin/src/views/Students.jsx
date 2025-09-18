import React, { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch, apiSearchStudent, apiUpdateStudent, apiGetStudent, enqueueWA, uploadPaymentProof, fetchReservationByIdFull, cancelReservationRobust, findLinkedSaleId} from '../api';

import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select, Textarea, ToggleWrap } from '../components/Form';
import { NavGrid, NavButton, Helper, Pill, SubTabs, SubTabButton, MenuWrap, Hamburger, Dropdown, DropItem, ToastStack, Toast } from '../components/Misc';

import { cleanSpaces, isTwoWordName, eg11ToE164 } from '../utils/helpers';
import { renderTemplate } from '../utils/settings';
import { useTranslation } from "react-i18next";

export default function Students ({ apiBase, authToken, toast, schools, branchId, settings }) {
    const [studentTab, setStudentTab] = useState("register");
    const [studentForm, setStudentForm] = useState({full_name: "", phone: "", parent_phone: "", school_id: "", gender: "male", grade: "", branch_id: "", section: "science", whatsapp_opt_in: true,});
    const [studentCreated, setStudentCreated] = useState(null);
    const [editSearchTerm, setEditSearchTerm] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [editRows, setEditRows] = useState([]);
    const [editResult, setEditResult] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [newSchoolName, setNewSchoolName] = useState("");
    useEffect(() => setStudentForm((s) => ({ ...s, branch_id: branchId })), [branchId]);
    const selectedSchool = useMemo(() => schools.find((s) => s.id === studentForm.school_id), [schools, studentForm.school_id]);
    const SECTION_OPTIONS = {2: ['literature', 'science'], 3: ['literature', 'science', 'math'],};
    const { t } = useTranslation();

    async function createStudent() {
    try {
        const phoneE164 = eg11ToE164(studentForm.phone);
        const parentE164 = studentForm.parent_phone ? eg11ToE164(studentForm.parent_phone) : "";

        if (!isTwoWordName(studentForm.full_name)) {
        setStudentForm((s) => ({ ...s, full_name: "" }));
        toast.push({ title: t('invalidName'), description: t('InvalidNameDesc'), tone: "error" });
        return;
        }
        if (!phoneE164) {
        setStudentForm((s) => ({ ...s, phone: "" }));
        toast.push({ title: t('InvalidPhone'), description: t('InvalidPhoneDesc'), tone: "error" });
        return;
        }
        if (studentForm.parent_phone && !parentE164) {
        setStudentForm((s) => ({ ...s, parent_phone: "" }));
        toast.push({ title: t('InvalidParentPhone'), description: t('InvalidParentPhoneDesc'), tone: "error" });
        return;
        }

        const payload = {
            ...studentForm,
            phone: phoneE164,
            parent_phone: parentE164 || null,
        };

        if (payload.grade === '1' || payload.grade === 1) {
            payload.section = 'science';
        }

        if (studentForm.school_id === 'other') {
            if (!newSchoolName.trim()) {
                toast.push({ title: t('schoolNameReq'), description: t('schoolNameReqDesc'), tone: "error" });
                return;
            }
            payload.new_school_name = newSchoolName.trim();
            payload.school_id = null;
        } else if (!studentForm.school_id) {
                toast.push({ title: t('schoolReq'), description: t('schoolReqDesc'), tone: "error" });
                return;
        }

        const st = await apiFetch(apiBase, "/students", { method: "POST", body: payload, authToken });
        toast.push({ title: t('studentCreated'), description: `#${st.public_id} • ${st.full_name}` });

        try {
            const isFemale = st.gender === "female";
            const idStr = st.public_id ?? st.id;
            const childWord   = isFemale ? "بنت" : "ابن";
            const idPronoun   = isFemale ? "بتاعتها" : "بتاعه";
            const childOfYou  = childWord + " حضرتك";
            const link = isFemale ? (settings.group_link_female || settings.group_link_male): (settings.group_link_male   || settings.group_link_female);
            const studentTemplateKey = isFemale ? 'female_student_join_tpl' : 'male_student_join_tpl';
            const parentTemplateKey = isFemale ? 'female_parent_welcome_tpl' : 'male_parent_welcome_tpl';
            const studentMsg = renderTemplate(settings[studentTemplateKey], {student_name: st.full_name, student_id: idStr, group_link: link,});

            const parentMsg = renderTemplate(settings[parentTemplateKey], {
                student_name: st.full_name,
                student_id: idStr,
                child_word: childWord,
                id_pronoun: idPronoun,
                child_of_you: childOfYou,
            });

            if (st.phone) {
                await enqueueWA(apiBase, {
                to: st.phone,
                message: studentMsg,
                tags: { kind: "student_join", student_id: st.id, template: studentTemplateKey },
                authToken
                });
            }
            if (st.parent_phone) {
                await enqueueWA(apiBase, {
                to: st.parent_phone,
                message: parentMsg,
                tags: { kind: "parent_welcome", student_id: st.id, template: parentTemplateKey },
                authToken
                });
            }

            toast.push({ title: t('messageQueued'), description: t('messageQueuedDesc') });
            } catch (e) {
            toast.push({ title: t('WAfailed'), description: e.message, tone: "error" });
            }

            setStudentForm({
            full_name: "",
            phone: "",
            parent_phone: "",
            school_id: "",
            gender: "male",
            grade: 3,
            branch_id: branchId,
            section: "science",
            whatsapp_opt_in: true,
            });
            setNewSchoolName("");
            setStudentCreated(null);
    } catch (e) {
        toast.push({ title: t('createStudentFail'), description: e.message, tone: "error" });
    }
    }

    async function handleEditSearch() {
    try {
        setEditLoading(true);
        setEditRows([]);
        setEditResult(null);
        setEditForm(null);

        const rows = await apiSearchStudent(apiBase, { term: editSearchTerm.trim() });
        setEditRows(Array.isArray(rows) ? rows : []);

        if (!rows || rows.length === 0) {
        toast.push({ title: t('noMatch'), description: t('noMatchDesc'), tone: "error" });
        }
    } catch (e) {
        toast.push({ title: t('searchFailed'), description: e.message, tone: "error" });
    } finally {
        setEditLoading(false);
    }
    }

    function buildEditForm(st) {
    const toLocal = (p) => (p && p.startsWith("+20") ? "0" + p.slice(3) : (p || ""));
    return {
        full_name: st.full_name || "",
        phone: toLocal(st.phone),
        parent_phone: toLocal(st.parent_phone),
        school_id: st.school_id || "",
        gender: st.gender || "male",
        grade: st.grade ?? 3,
        branch_id: branchId,
        section: st.section ?? "science",
        whatsapp_opt_in: !!st.whatsapp_opt_in,
    };
    }

    async function beginEdit(rowOrSelected = null) {
    const target = rowOrSelected || editResult;
    if (!target) return;
    const full = await apiGetStudent(apiBase, target);
    setEditResult(full);
    setEditForm(buildEditForm(full));
    }

    async function submitEdit() {
    if (!editResult || !editForm) return;
    try {
        if (!isTwoWordName(editForm.full_name)) {
        setEditForm((s) => ({ ...s, full_name: "" }));
        toast.push({ title: t('invalidName'), description: t('invalidNameDesc'), tone: "error" });
        return;
        }

        const phoneE164 = eg11ToE164(editForm.phone);
        const parentE164 = editForm.parent_phone ? eg11ToE164(editForm.parent_phone) : "";

        if (!phoneE164) {
        setEditForm((s) => ({ ...s, phone: "" }));
        toast.push({ title: t('invalidPhone'), description: t('invalidPhoneDesc'), tone: "error" });
        return;
        }
        if (editForm.parent_phone && !parentE164) {
        setEditForm((s) => ({ ...s, parent_phone: "" }));
        toast.push({ title: t('invalidParentPhone'), description: t('invalidParentPhoneDesc'), tone: "error" });
        return;
        }

        const body = {
        ...editForm,
        phone: phoneE164,
        parent_phone: parentE164 || null,
        };

        const updated = await apiUpdateStudent(apiBase, editResult.id, body);
        toast.push({ title: t('studentUpdated'), description: `#${updated.public_id} • ${updated.full_name}` });

        setEditResult(updated);
        setEditForm(null);
    } catch (e) {
        toast.push({ title: t('studentUpdatedFail'), description: e.message, tone: "error" });
    }
    }
    return (
        <Card>
        <CardHead><CardTitle>{t('students')}</CardTitle></CardHead>
        <CardBody>
            <SubTabs>
            <SubTabButton $active={studentTab==="register"} onClick={()=>setStudentTab("register")}>{t('register')}</SubTabButton>
            <SubTabButton $active={studentTab==="edit"} onClick={()=>setStudentTab("edit")}>{t('edit')}</SubTabButton>
            </SubTabs>

            {studentTab === "register" && (
            <>
                <Row>
                <div>
                    <Label>{t('studentName')}</Label>
                    <Input
                    value={studentForm.full_name}
                    onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                    onBlur={(e) => {
                        const cleaned = cleanSpaces(e.target.value);
                        if (!isTwoWordName(cleaned)) {
                        setStudentForm((s) => ({ ...s, full_name: "" }));
                        toast.push({ title: t('invalidName'), description: t('invalidNameDesc'), tone: "error" });
                        } else {
                        setStudentForm((s) => ({ ...s, full_name: cleaned }));
                        }
                    }}
                    />
                </div>
                <div>
                    <Label>{t('studentPhone')}</Label>
                    <Input
                    value={studentForm.phone}
                    placeholder="01XXXXXXXXX"
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    onBlur={(e) => {
                        const e164 = eg11ToE164(e.target.value);
                        if (!e164) {
                        setStudentForm((s) => ({ ...s, phone: "" }));
                        toast.push({ title: t('invalidPhone'), description: t('invalidPhoneDesc'), tone: "error" });
                        } else {
                        setStudentForm((s) => ({ ...s, phone: e164 }));
                        }
                    }}
                    />
                </div>
                </Row>

                <Row>
                <div>
                    <Label>{t('parentPhone')}</Label>
                    <Input
                    value={studentForm.parent_phone}
                    placeholder="01XXXXXXXXX"
                    onChange={(e) => setStudentForm({ ...studentForm, parent_phone: e.target.value })}
                    onBlur={(e) => {
                        if (!e.target.value) return;
                        const e164 = eg11ToE164(e.target.value);
                        if (!e164) {
                        setStudentForm((s) => ({ ...s, parent_phone: "" }));
                        toast.push({ title: t('invalidParentPhone'), description: t('invalidParentPhoneDesc'), tone: "error" });
                        } else {
                        setStudentForm((s) => ({ ...s, parent_phone: e164 }));
                        }
                    }}
                    />
                </div>
                <div>
                    <Label>{t('school')}</Label>
                    <Select value={studentForm.school_id} onChange={(e) => setStudentForm({ ...studentForm, school_id: e.target.value })}>
                        <option value="">{t('selectSchool')}</option>
                        <option value="other">{t('addNewSchool')}</option>
                        {schools.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </Select>
                </div>
            </Row>

            {studentForm.school_id === 'other' && (
                <Row style={{marginTop: '12px'}}>
                    <div>
                        <Label>{t('newSchoolName')}</Label>
                        <Input 
                            value={newSchoolName}
                            onChange={(e) => setNewSchoolName(e.target.value)}
                            placeholder={t('typeNewSchoolName')}
                        />
                    </div>
                </Row>
            )}

                <Row cols={3}>
                <div>
                    <Label>{t('gender')}</Label>
                    <Select value={studentForm.gender} onChange={(e)=>setStudentForm({...studentForm, gender: e.target.value})}>
                    <option value="male">{t('male')}</option>
                    <option value="female">{t('female')}</option>
                    </Select>
                </div>
                <div>
                    <Label>{t('grade')}</Label>
                    <Select
                    value={studentForm.grade}
                    onChange={(e) => {
                        setStudentForm({
                        ...studentForm,
                        grade: e.target.value,
                        section: '',
                        });
                    }}
                    >
                    <option value="">{t('selectGrade')}</option>
                    <option value="1">{t('grade1')}</option>
                    <option value="2">{t('grade2')}</option>
                    <option value="3">{t('grade3')}</option>
                    </Select>
                </div>
                {(studentForm.grade === '2' || studentForm.grade === '3') && (
                <div>
                    <Label>{t('section')}</Label>
                    <Select
                    value={studentForm.section}
                    onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                    >
                    <option value="">{t('selectSection')}</option>
                    {(SECTION_OPTIONS[studentForm.grade] || []).map(option => (
                        <option key={option} value={option}>
                            {t(`section_${option}`)}
                        </option>
                    ))}
                    </Select>
                </div>
                )}
                </Row>

                <Row cols={3}>
                <div>
                    <Label>{t('allowWPMessages')}</Label>
                    <Button
                    onClick={() =>
                        setStudentForm({
                        ...studentForm,
                        whatsapp_opt_in: !studentForm.whatsapp_opt_in,
                        })
                    }
                    style={{
                        backgroundColor: studentForm.whatsapp_opt_in ? "#22c55e" : "#ffffff",
                        color: studentForm.whatsapp_opt_in ? "#fff" : "#374151",
                        border: "1px solid var(--border)",
                    }}
                    >
                    {studentForm.whatsapp_opt_in ? t("yes") : t("no")}
                    </Button>
                </div>
                </Row>

                <div style={{marginTop:8}}>
                <Button onClick={createStudent}>{t('createStudent')}</Button>
                </div>

                {studentCreated && (
                <Helper style={{marginTop:10}}>
                    {t('created')} <strong>{studentCreated.full_name}</strong> — id: <Pill>{studentCreated.public_id ?? studentCreated.id}</Pill>
                </Helper>
                )}
            </>
            )}

            {studentTab === "edit" && (
            <Card title="Edit Student">
                {editForm ? (
                <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                        <Label>{t('studentName')}</Label>
                        <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>{t('studentPhone')}</Label>
                        <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                    </div>
                    </div>

                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                        <Label>{t('parentPhone')}</Label>
                        <Input
                        value={editForm.parent_phone}
                        onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>{t('school')}</Label>
                        <Select
                        value={editForm.school_id}
                        onChange={(e) => setEditForm({ ...editForm, school_id: e.target.value })}
                        >
                        <option value="">{t('selectSchool')}</option>
                        {schools.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                        </Select>
                    </div>
                    </div>

                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                        <Label>{t('gender')}</Label>
                        <Select
                        value={editForm.gender}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        >
                        <option value="male">{t('male')}</option>
                        <option value="female">{t('female')}</option>
                        </Select>
                    </div>
                    <div>
                    <Label>{t('grade')}</Label>
                    <Select
                        value={editForm.grade}
                        onChange={(e) => {
                        setEditForm({
                            ...editForm,
                            grade: e.target.value,
                            section: '',
                        });
                        }}
                    >
                        <option value="">{t('selectGrade')}</option>
                        <option value="1">{t('grade1')}</option>
                        <option value="2">{t('grade2')}</option>
                        <option value="3">{t('grade3')}</option>
                    </Select>
                    </div>

                    {(editForm.grade === '2' || editForm.grade === '3') && (
                    <div>
                        <Label>{t('section')}</Label>
                        <Select
                        value={editForm.section}
                        onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                        >
                        <option value="">{t('selectSection')}</option>
                        {(SECTION_OPTIONS[editForm.grade] || []).map(option => {
                            const capitalizedOption = option.charAt(0).toUpperCase() + option.slice(1);
                            return (
                                <option key={option} value={option}>{t(`section_${option}`)}</option>
                            );
                        })}
                        </Select>
                    </div>
                    )}
                <Row cols={3}>
                    <div>
                    <Label>{t('allowWPMessages')}</Label>
                    <Button
                        onClick={() =>
                        setEditForm({
                            ...editForm,
                            whatsapp_opt_in: !editForm.whatsapp_opt_in,
                        })
                        }
                        style={{
                        backgroundColor: editForm.whatsapp_opt_in ? "#22c55e" : "#ffffff",
                        color: editForm.whatsapp_opt_in ? "#fff" : "#374151",
                        border: "1px solid var(--border)",
                        }}
                    >
                        {editForm.whatsapp_opt_in ? t('yes') : t('no')}
                    </Button>
                    </div>
                </Row>
                    </div>

                    <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                    <Button $variant="success" onClick={submitEdit}>{t('saveChanges')}</Button>
                    <Button $variant="ghost" onClick={() => setEditForm(null)}>{t('cancel')}</Button>
                    </div>
                </div>
                ) : (
                <>
                    <Label style={{ textAlign: "center" }}>
                    {t('searchStudent')}
                    </Label>
                    <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 12,
                        marginTop: 8,
                    }}
                    >
                    <Input
                        placeholder={t('searchStudentDesc')}
                        value={editSearchTerm}
                        onChange={(e) => setEditSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEditSearch()}
                    />
                    <Button onClick={handleEditSearch} disabled={editLoading}>
                        {editLoading ? t('searching') : t('search')}
                    </Button>
                    </div>

                    {editRows.length > 0 && (
                    <div
                        style={{
                        marginTop: 12,
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        overflow: "hidden",
                        }}
                    >
                        <table style={{ width: "100%", fontSize: 14 }}>
                        <thead style={{ background: 'var(--bg)' }}>
                            <tr>
                            <th style={{ textAlign: "left", padding: "8px 12px" }}>#</th>
                            <th style={{ textAlign: "left", padding: "8px 12px" }}>{t('name')}</th>
                            <th style={{ textAlign: "left", padding: "8px 12px" }}>{t('phone')}</th>
                            <th style={{ textAlign: "left", padding: "8px 12px" }}>{t('parent')}</th>
                            <th style={{ textAlign: "right", padding: "8px 12px" }}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editRows.map((r) => (
                            <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                                <td style={{ padding: "8px 12px" }}>{r.public_id}</td>
                                <td style={{ padding: "8px 12px" }}>{r.full_name}</td>
                                <td style={{ padding: "8px 12px" }}>{r.phone || "-"}</td>
                                <td style={{ padding: "8px 12px" }}>{r.parent_phone || "-"}</td>
                                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                <Button $variant="success" onClick={() => beginEdit(r)}>
                                    {t('updateinfo')}
                                </Button>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    )}
                </>
                )}
            </Card>
            )}
        </CardBody>
        </Card>
    )
}