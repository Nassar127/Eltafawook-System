export const SETTINGS_KEY = "waSettings.v1";
export const DEFAULT_SETTINGS = {
  group_link_male:   "https://chat.whatsapp.com/FagDTxSs9bcKsethsLTWDf",
  group_link_female: "https://chat.whatsapp.com/LNIorc2C6Lh93uUC6yxGOI",
  male_student_join_tpl:
    "السلام عليكم ورحمة الله وبركاته\nعلى الطالب {{student_name}} دخول جروب الاكاديمية لمتابعة الكتب الجديدة\n{{group_link}}\nال ID الخاص بحضرتك هو {{student_id}}",
  female_student_join_tpl:
    "السلام عليكم ورحمة الله وبركاته\nعلى الطالبة {{student_name}} دخول جروب الاكاديمية لمتابعة الكتب الجديدة\n{{group_link}}\nال ID الخاص بحضراتكم هو {{student_id}}",
  
  male_parent_welcome_tpl:
    "السلام عليكم\nابن حضراتكم {{student_name}} لسا مسجل عندنا فى اكاديمية التفوق و الID بتاعه هو {{student_id}}",
  female_parent_welcome_tpl:
    "السلام عليكم\nبنت حضراتكم {{student_name}} لسا مسجلة عندنا فى اكاديمية التفوق و الID بتاعها هو {{student_id}}",
};
export const loadSettings = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const migrated = { ...raw };
    if (!migrated.group_link_male   && raw.group_link) migrated.group_link_male   = raw.group_link;
    if (!migrated.group_link_female && raw.group_link) migrated.group_link_female = raw.group_link;
    return { ...DEFAULT_SETTINGS, ...migrated };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};
export const saveSettings = (s) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

export const renderTemplate = (tpl, vars) =>
  (tpl || "").replace(/{{\s*(\w+)\s*}}/g, (_, k) => (vars?.[k] ?? ""));