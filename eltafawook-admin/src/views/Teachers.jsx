import { useState } from "react";
import { apiFetch } from '../api';
import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select } from '../components/Form';
import { Small } from '../components/Layout';
import { useTranslation } from "react-i18next";

export default function Teachers({ apiBase, authToken, toast, teachers, setTeachers }) {
  const [teacherForm, setTeacherForm] = useState({ name: "", subject: ""});
  const ALL_TEACHER_SUBJECTS = ['arabic', 'english', 'chemistry', 'physics', 'biology', 'geology', 'math', 'history', 'geography', 'psychology', 'computer_science','religion', 'french', 'german', 'italian', 'spanish', 'chinese'
  ];
  const { t } = useTranslation();


  async function createTeacher() {
    try {
      const t = await apiFetch(apiBase, "/teachers", { method: "POST", body: teacherForm, authToken });
      setTeachers((xs) => [t, ...xs]);
      toast.push({ title: t('createTeacher'), description: t.name });
      setTeacherForm({ name: "", subject: "Physics"});
    } catch (e) {
      toast.push({ title: t('createTeacherFail'), description: e.message, tone: "error" });
    }
  }

  return (
    <Card>
      <CardHead><CardTitle>{t('teachers')}</CardTitle></CardHead>
      <CardBody>
        <Row>
          <div>
            <Label>{t('teacherName')}</Label>
            <Input value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} />
          </div>
          <div>
            <Label>{t('subject')}</Label>
            <Select
              value={teacherForm.subject}
              onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
            >
              <option value="">{t('selectSubject')}</option>
              {ALL_TEACHER_SUBJECTS.map(subject => (
                <option key={subject} value={subject}>{t(`subject_${subject}`)}</option>
              ))}
            </Select>
          </div>
        </Row>
        <Row>
          <div style={{display:"flex", alignItems:"end"}}><Button onClick={createTeacher}>{t('teacherCreate')}</Button></div>
        </Row>
        {teachers.length > 0 && <Small>{t('lastTeacher')}{teachers[0].name}</Small>}
      </CardBody>
    </Card>
  );
}