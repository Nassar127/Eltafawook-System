export function parseDateSafe(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = typeof v === "string" ? v.replace(" ", "T") : v;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}  

export function startOfIsoWeek(anchorDateStr) {
  const d = new Date(anchorDateStr + "T00:00:00");
  const day = d.getDay();
  const delta = (day - 6 + 7) % 7;
  d.setDate(d.getDate() - delta);
  return d;
}

export function endOfIsoWeek(anchorDateStr) {
  const start = startOfIsoWeek(anchorDateStr);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return end;
}