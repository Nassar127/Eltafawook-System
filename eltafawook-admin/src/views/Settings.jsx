import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select, Textarea } from '../components/Form';
import { Helper, Pill } from '../components/Misc';
import { saveSettings, loadSettings, DEFAULT_SETTINGS } from '../utils/settings';

export default function Settings({ settings, setSettings, toast, currentUser, branches, activeBranchId, onBranchChange }) {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <>
      <Card>
          <CardHead><CardTitle>{t('adminSettings')}</CardTitle></CardHead>
          <CardBody>
              <Row cols={1}>
                  <div>
                      <Label>{t('manageBranch')}</Label>
                      <Select value={activeBranchId} onChange={(e) => onBranchChange(e.target.value)}>
                          {branches.map(branch => (
                              <option key={branch.id} value={branch.id}>
                                  {branch.name} ({branch.code})
                              </option>
                          ))}
                      </Select>
                      <Helper>{t('manageBranchHelper')}</Helper>
                  </div>
              </Row>
          </CardBody>
      </Card>
      
      <Card>
        <CardHead><CardTitle>{t('notificationsTitle')}</CardTitle></CardHead>
        <CardBody>
          <Row cols={2}>
            <div>
              <Label>WhatsApp Group (Male)</Label>
              <Input
                value={settings.group_link_male}
                onChange={(e) => setSettings({ ...settings, group_link_male: e.target.value })}
              />
              <Helper>Used via <Pill>{"{{group_link}}"}</Pill> for male students.</Helper>
            </div>
            <div>
              <Label>WhatsApp Group (Female)</Label>
              <Input
                value={settings.group_link_female}
                onChange={(e) => setSettings({ ...settings, group_link_female: e.target.value })}
              />
              <Helper>Used via <Pill>{"{{group_link}}"}</Pill> for female students.</Helper>
            </div>
          </Row>
          <Row cols={1}>
            <div>
                <Label>Student invite message (template)</Label>
                <Textarea
                    value={settings.male_student_join_tpl}
                    onChange={(e) => setSettings({ ...settings, male_student_join_tpl: e.target.value })}
                />
                <Helper>Placeholders: <Pill>{"{{student_name}}"}</Pill> <Pill>{"{{student_id}}"}</Pill> <Pill>{"{{group_link}}"}</Pill></Helper>
            </div>
            <div>
                <Label>Parent welcome message (template)</Label>
                <Textarea
                    value={settings.male_parent_welcome_tpl}
                    onChange={(e) => setSettings({ ...settings, male_parent_welcome_tpl: e.target.value })}
                />
                <Helper>Placeholders: <Pill>{"{{student_name}}"}</Pill> <Pill>{"{{student_id}}"}</Pill> <Pill>{"{{child_word}}"}</Pill></Helper>
            </div>
          </Row>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <Button onClick={() => { saveSettings(settings); toast.push({ title:"Saved" }); }}>Save</Button>
            <Button $variant="ghost" onClick={() => { setSettings(loadSettings()); toast.push({ title:"Reverted to saved" }); }}>Revert</Button>
            <Button $variant="danger" onClick={() => { setSettings({ ...DEFAULT_SETTINGS }); toast.push({ title:"Loaded defaults (not saved)" }); }}>Load Defaults</Button>
          </div>
        </CardBody>
      </Card>
    </>
  );
}