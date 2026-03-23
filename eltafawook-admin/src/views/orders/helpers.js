export const SUBJECTS_BY_GRADE_AND_SECTION = {
  1: { default: ["Religion", "Arabic", "English", "Math", "Science", "Psychology", "History", "2nd Language", "Computer Science"] },
  2: {
    Literature: ["Arabic", "English", "Geography", "History", "Psychology", "Math", "2nd Language"],
    Science: ["Arabic", "English", "Chemistry", "Biology", "Physics", "Math", "2nd Language"],
  },
  3: {
    Literature: ["Arabic", "English", "History", "Geography", "Math", "Psychology", "2nd Language"],
    Science: ["Arabic", "English", "Biology", "Chemistry", "Physics", "2nd Language", "Geology"],
    Math: ["Arabic", "English", "Math", "Chemistry", "Physics", "2nd Language"],
  },
};

export const SECOND_LANGUAGES = ["French", "German", "Italian", "Spanish", "Chinese"];

export function enrichReservation(r) {
  const unit = Number(r.unit_price_cents_effective ?? r.unit_price_cents ?? 0);
  const qty = Number(r.qty ?? 0);
  const paid = Number(r.prepaid_cents ?? 0);
  const total = r.total_cents ? Number(r.total_cents) : unit * qty;
  const remaining = Math.max(0, total - paid);
  const itemLabel = `${r.item_name || r.sku} (Grade ${r.item_grade})`;
  return {
    ...r,
    _unit: unit,
    _qty: qty,
    _paid: paid,
    _total: total,
    _remaining: remaining,
    _teacherName: r.teacher_name || "—",
    _itemLabel: itemLabel || "Unknown Item",
    _studentPublicId: r.student_public_id || r.student_id,
  };
}
