export const cleanSpaces = (s = "") => s.replace(/\s+/g, " ").trim();

export const isTwoWordName = (s = "") => {
    const parts = cleanSpaces(s).split(" ");
    return parts.length === 2 && parts[0] && parts[1];
};

export const isFullNameValid = (s = "") => {
  const parts = cleanSpaces(s).split(" ");
  return parts.length >= 4 && parts.length <= 7 && parts.every(p => p.length > 0);
};

export const eg11ToE164 = (v = "") => {
    const raw = (v + "").trim();
    if (raw.startsWith("+20")) {
        const rest = raw.slice(3);
        return /^(10|11|12|15)\d{8}$/.test(rest) ? `+20${rest}` : null;
    }
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "20" + digits.slice(1);
    if (!digits.startsWith("20")) return null;
    const rest = digits.slice(2);
    return /^(10|11|12|15)\d{8}$/.test(rest) ? `+${digits}` : null;
};

export const is11DigitLocal = (s="") => /^\d{11}$/.test((s||"").replace(/\D/g,""));

export const paymentMethodFromUI = (v) => (v === "vodafone_cash" ? "vodafone_cash" : v === "instapay" ? "instapay" : "cash");

export function upsertById(list, row) {
    const i = list.findIndex(x => x.id === row.id);
    if (i === -1) return [row, ...list];
    const next = list.slice();
    next[i] = { ...next[i], ...row };
    return next;
}

export function money(cents) {
    const n = Number(cents || 0);
    return (n / 100).toFixed(2);
}

export function cap(s=""){ return s ? s[0].toUpperCase()+s.slice(1) : s; }

export function moneyEGPfromCents(c=0){ return (Number(c||0)/100).toFixed(2); }

export function centsFromEGP(x){ const n = Number(String(x).replace(/[^\d.]/g,"")); return Number.isFinite(n) ? Math.round(n*100) : 0; }

export function qtyOf(r) { return Number(r?.qty ?? r?.quantity ?? r?.count ?? 1);}

export function paymentOf(r) {
  const raw =
    r?.payment_method ??
    r?.payment_type ??
    r?.method ??
    r?.payment ??
    r?.pay_method ??
    r?.gateway ??
    r?.tags?.payment_method ??
    r?.tags?.method ??
    r?.meta?.payment_method ??
    r?.metadata?.payment_method ??
    r?.attributes?.payment_method ??
    "";
  return normalizePayment(raw);
}

export function unitCentsOf(r, maps) {
  const direct = r?.unit_price_cents ?? r?.price_cents ?? r?.unit_price;
  if (direct != null) return Number(direct);

  const total = r?.total_cents ?? r?.amount_cents ?? r?.amount;
  if (total != null) return Math.round(Number(total) / Math.max(1, qtyOf(r)));

  const item = (r?.item_id && maps.byId[r.item_id]) || (r?.sku && maps.bySku[r.sku]) || null;
  return Number(item?.default_price_cents ?? 0);
}

export function totalCentsOf(r, maps) {
  const total = r?.total_cents ?? r?.amount_cents ?? r?.amount;
  if (total != null) return Number(total);
  return unitCentsOf(r, maps) * qtyOf(r);
}

export function normalizePayment(pm) {
  const s = String(pm || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (!s) return "cash";
  if (s.includes("voda")) return "vodafone_cash";
  if (s.includes("insta")) return "instapay";
  if (s.includes("cash"))  return "cash";
  return "cash";
}

export function cents(n) { return Number(n || 0); }

export function fullItemName(resourceType, itemName) {
  const rt = (resourceType||"").trim();
  const nm = (itemName||"").trim().replace(/\s+/g, "_");
  return `${rt}_${nm}`;
}

