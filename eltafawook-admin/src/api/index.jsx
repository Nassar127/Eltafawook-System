export async function apiFetch(base, path, { method = "GET", body, headers, signal, authToken } = {}) {
  const url = `${base}${path}`;
  const h = { ...(headers || {}) };
  
  if (authToken) {
    h['Authorization'] = `Bearer ${authToken}`;
  }
  let finalBody = body;
  if (body != null && typeof body === 'object') {
    if (h["Content-Type"] == null) {
      h["Content-Type"] = "application/json";
    }
    finalBody = JSON.stringify(body);
  }

  const opts = {
    method,
    headers: h,
    body: finalBody,
    signal,
  };

  const t0 = performance.now();
  const res = await fetch(url, opts);
  const ms = Math.round(performance.now() - t0);
  let data = null;
  const txt = await res.text();
  try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }
  if (!res.ok) {
    const detail = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg || JSON.stringify(d)).join("; "): (data?.detail || data?.message || res.statusText || "Request failed");
    const error = new Error(detail);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function apiSearchStudent(base, { term }) {
  const raw = (term || "").trim();
  const normalizeEg = (s) => {
    let digits = (s || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "20" + digits.slice(1);
    if (!digits.startsWith("20") && s.startsWith("+20")) digits = "20" + s.slice(3);
    if (digits.startsWith("20") && digits.length === 12) {
      const rest = digits.slice(2);
      return /^(10|11|12|15)\d{8}$/.test(rest) ? `+${digits}` : null;
    }
    return null;
  };

  const isLocalPhone  = /^0\d{10}$/.test(raw);
  const isE164Phone   = /^\+20\d{10}$/.test(raw);
  const is20Phone     = /^20\d{10}$/.test(raw);
  const isPhoneLike   = isLocalPhone || isE164Phone || is20Phone;

  if (isPhoneLike) {
    const e164 = normalizeEg(raw);
    if (e164) {
      const byPhone  = await apiFetch(base, `/students/search?phone=${encodeURIComponent(e164)}`);
      const byParent = await apiFetch(base, `/students/search?parent_phone=${encodeURIComponent(e164)}`);
      const seen = new Set();
      return [...byPhone, ...byParent].filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    }
  }

  if (/^\d{1,6}$/.test(raw)) {
    return apiFetch(base, `/students/search?public_id=${encodeURIComponent(raw)}`);
  }

  return apiFetch(base, `/students/search?q=${encodeURIComponent(raw)}`);
}

export async function apiUpdateStudent(base, id, body) {
  return apiFetch(base, `/students/${id}`, { method: "PUT", body });
}

export async function apiGetStudent(base, rowOrId) {
  const id = typeof rowOrId === "string" ? rowOrId : rowOrId?.id;

  try {
    if (!id) throw new Error("Missing student id");
    return await apiFetch(base, `/students/${id}`);
  } catch (e) {
    if (e.status === 405 || e.status === 404) {
      const publicId = typeof rowOrId === "object" ? rowOrId.public_id : null;
      if (!publicId) throw e;
      const list = await apiFetch(base, `/students/search?public_id=${encodeURIComponent(publicId)}`);
      return Array.isArray(list) && list.length ? list[0] : null;
    }
    throw e;
  }
}

export async function apiSearchKgStudent(base, { term, branchId, authToken }) {
  if (!term || !branchId) return [];
  const path = `/kg-students/search?branch_id=${encodeURIComponent(branchId)}&term=${encodeURIComponent(term)}`;
  return apiFetch(base, path, { authToken });
}

export async function enqueueWA(base, { to, message, tags }) {
  if (!to || !message) return;
  const candidates = [
    "/notifications/wa/enqueue",
    "/notifications/wa/queue",
    "/notifications/wa/outbox",
    "/notifications/wa/publish",
  ];
  const body = { to, message, ...(tags ? { tags } : {}) };
  let lastErr = null;
  for (const path of candidates) {
    try {
      const res = await apiFetch(base, path, { method: "POST", body });
      return res;
    } catch (e) {
      lastErr = e;
      if (e.status === 404 || e.status === 405) continue;
      break;
    }
  }
  throw lastErr || new Error("No WA enqueue endpoint available");
}

export async function uploadPaymentProof(apiBase, file) {
    if (!file) return null;
    const endpoints = ["/payments/upload", "/uploads", "/files/upload", "/media/upload"];
    let lastErr = null;
    for (const p of endpoints) {
    try {
        const url = `${apiBase}${p}`;
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(url, { method: "POST", body: fd, headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || sessionStorage.getItem("authToken")}` } });
        const txt = await res.text();
        let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }
        if (!res.ok) throw new Error(data?.detail || data?.message || res.statusText || "Upload failed");
        return { id: data?.id || data?.file_id || data?.upload_id || null, url: data?.url || data?.path || null, raw: data };
    } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("No upload endpoint available");
}

export async function fetchReservationByIdFull(apiBase, authToken, id, signal) {
    try {
      return await apiFetch(apiBase, `/reservations/${encodeURIComponent(id)}`, { authToken, signal });
   } catch (e) {
     const rows = await apiFetch(apiBase, `/reservations/search?id=${encodeURIComponent(id)}&limit=1`, { authToken });
     return Array.isArray(rows) && rows[0] ? rows[0] : null;
   }
}

export async function cancelReservationRobust(apiBase, authToken, resId) {
  if (!resId) throw new Error("Missing reservation id");

  const full0 = await fetchReservationByIdFull(apiBase, authToken, resId);
  const status0 = (full0?.status || "").toLowerCase();

  let saleId = await findLinkedSaleId(apiBase, authToken, resId);
  if (saleId) {
    const saleEndpoints = [
      { path: `/sales/${encodeURIComponent(saleId)}/rollback`, method: "POST" },
      { path: `/sales/${encodeURIComponent(saleId)}/void`,     method: "POST" },
      { path: `/sales/${encodeURIComponent(saleId)}`,          method: "DELETE" },
    ];
    for (const ep of saleEndpoints) {
      try { await apiFetch(apiBase, ep.path, { method: ep.method, authToken }); break; }
      catch (e) { if (e.status === 404 || e.status === 405) continue; else throw e; }
    }
  }

  if (status0 === "fulfilled" || full0?.fulfilled_at) {
    const undo = [
      { path: `/reservations/${encodeURIComponent(resId)}/unfulfill`, method: "POST" },
      { path: `/reservations/${encodeURIComponent(resId)}/rollback`,  method: "POST" },
    ];
    for (const ep of undo) {
      try { await apiFetch(apiBase, ep.path, { method: ep.method, authToken }); break; }
      catch (e) { if (e.status === 404 || e.status === 405) continue; else throw e; }
    }
  }

  try {
    await apiFetch(apiBase, `/reservations/${encodeURIComponent(resId)}/cancel`, { method: "POST", authToken });
  } catch (e) {
    if (![400, 404, 409].includes(e.status)) throw e;
  }

  let full1 = await fetchReservationByIdFull(apiBase, authToken, resId);
  let status1 = (full1?.status || "").toLowerCase();
  if (status1 !== "cancelled") {
  }

  return { id: resId, status: "cancelled" };;
}

export async function findLinkedSaleId(apiBase, authToken, resId) {
  const attempts = [
    async () => {
      const full = await fetchReservationByIdFull(apiBase, authToken, resId);
      return full?.sale_id || null;
    },
    async () => {
      const rows = await apiFetch(apiBase, `/sales/search?reservation_id=${encodeURIComponent(resId)}&limit=1`, { authToken });
      return (Array.isArray(rows) && rows[0]?.id) || null;
    },
  ];

  for (const tryGet of attempts) {
    try {
      const id = await tryGet();
      if (id) return id;
    } catch (e) {
      if (e?.status === 404 || e?.status === 405) continue;
      throw e;
   }
  }
  return null;
}