import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  apiFetch,
  apiSearchStudent,
  uploadPaymentProof,
  cancelReservationRobust,
} from "../api";

import Button from "../components/Button";
import { Card, CardHead, CardTitle, CardBody } from "../components/Card";
import { Row, Label, Input, Select } from "../components/Form";
import { Helper, Pill, SubTabs, SubTabButton } from "../components/Misc";
import { TableWrap, Table } from "../components/Table";

import { parseDateSafe } from "../utils/dates";
import { is11DigitLocal, paymentMethodFromUI, money } from "../utils/helpers";

export default function Orders({
  apiBase,
  authToken,
  toast,
  branchId,
  branchCode,
  teachers,
  setTeachers, // kept for parity with props signature (unused here)
  items,
  setItems, // kept for parity with props signature (unused here)
  itemById,
  teacherById,
}) {
  const { t, i18n } = useTranslation();

  const [ordersTab, setOrdersTab] = useState("order");

  // Search & selection (Order / Reserve)
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderSearching, setOrderSearching] = useState(false);
  const [orderRows, setOrderRows] = useState([]);
  const [orderSelectedStudent, setOrderSelectedStudent] = useState(null);

  // Item picking
  const [orderTeacherId, setOrderTeacherId] = useState("");
  const [orderItemId, setOrderItemId] = useState("");
  const [orderQty, setOrderQty] = useState(1);

  // Payment (Order / Cart)
  const [paymentType, setPaymentType] = useState("cash");
  const [payerPhone, setPayerPhone] = useState("");
  const [paymentFile, setPaymentFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Cart
  const [cart, setCart] = useState([]);

  // Delete tab (today)
  const [todayOrders, setTodayOrders] = useState([]);
  const [loadingToday, setLoadingToday] = useState(false);

  // Receive tab
  const [recvSearchTerm, setRecvSearchTerm] = useState("");
  const [recvSearching, setRecvSearching] = useState(false);
  const [recvRows, setRecvRows] = useState([]);
  const [recvSelectedStudent, setRecvSelectedStudent] = useState(null);
  const [recvReservations, setRecvReservations] = useState([]);

  // Review tab
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewRows, setReviewRows] = useState([]);
  const [reviewAgg, setReviewAgg] = useState([]);

  // Reservation (Reserve tab)
  const [resDepositEGP, setResDepositEGP] = useState("");
  const [resPaymentType, setResPaymentType] = useState("cash");
  const [resPayerPhone, setResPayerPhone] = useState("");
  const [resPaymentFile, setResPaymentFile] = useState(null);
  const [resUploadingProof, setResUploadingProof] = useState(false);

  // Student public id cache
  const [studentPublicById, setStudentPublicById] = useState({});

  // Availability cache (by sku + grade)
  const [availBySku, setAvailBySku] = useState({});

  // Allowed subjects by grade/section (unchanged business logic)
  const SUBJECTS_BY_GRADE_AND_SECTION = {
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
  const SECOND_LANGUAGES = ["French", "German", "Italian", "Spanish", "Chinese"];

  // Availability helpers
  async function fetchAvailabilityForSku(item) {
    if (!item) return null;
    const cacheKey = `${item.sku}_${item.grade}_${item.teacher_id || ""}`;
    try {
      const url = `/inventory/summary-by-code?branch_code=${encodeURIComponent(
        branchCode
      )}&sku=${encodeURIComponent(item.sku)}&teacher_id=${encodeURIComponent(
        item.teacher_id
      )}&grade=${encodeURIComponent(item.grade)}`;
      const row = await apiFetch(apiBase, url, { authToken });
      setAvailBySku((m) => ({
        ...m,
        [cacheKey]: row || { available: 0, on_hand: 0, reserved: 0 },
      }));
      return row;
    } catch {
      setAvailBySku((m) => ({
        ...m,
        [cacheKey]: { available: 0, on_hand: 0, reserved: 0 },
      }));
      return null;
    }
  }

  async function ensureAvailabilityForItemId(itemId) {
    const it = itemById[itemId];
    if (!it) return { available: 0 };
    const cacheKey = `${it.sku}_${it.grade}_${it.teacher_id || ""}`;
    const cached = availBySku[cacheKey];
    if (cached) return cached;
    return (await fetchAvailabilityForSku(it)) || { available: 0 };
  }

  // Items filtered by teacher and optionally by selected student's grade
  const teacherItems = useMemo(() => {
    const baseItems = items || [];
    const teacherFiltered = orderTeacherId
      ? baseItems.filter((it) => it.teacher_id === orderTeacherId)
      : baseItems;

    if (orderSelectedStudent?.grade) {
      return teacherFiltered.filter(
        (it) => Number(it.grade) === Number(orderSelectedStudent.grade)
      );
    }

    return teacherFiltered;
  }, [items, orderTeacherId, orderSelectedStudent]);

  // Teachers filtered by student's grade/section subjects
  const filteredTeachers = useMemo(() => {
    if (!orderSelectedStudent) {
      return teachers || [];
    }

    const grade = orderSelectedStudent.grade;
    const section = orderSelectedStudent.section || "default";
    const allowedSubjects = SUBJECTS_BY_GRADE_AND_SECTION[grade]?.[section];
    if (!allowedSubjects) return teachers || [];

    return (teachers || []).filter((teacher) => {
      if (allowedSubjects.includes(teacher.subject)) return true;
      if (
        allowedSubjects.includes("2nd Language") &&
        SECOND_LANGUAGES.includes(teacher.subject)
      )
        return true;
      return false;
    });
  }, [orderSelectedStudent, teachers]);

  // Cart helpers
  function cartTotalCents() {
    return cart.reduce(
      (s, it) => s + Number(it.unit_price_cents || 0) * Number(it.qty || 0),
      0
    );
  }
  function resetCart() {
    setCart([]);
  }
  function resetOrderSelections() {
    setOrderTeacherId("");
    setOrderItemId("");
    setOrderQty(1);
    setPaymentType("cash");
    setPayerPhone("");
    setPaymentFile(null);
  }

  // Search students (Order/Reserve)
  async function ordersSearchStudents() {
    try {
      setOrderSearching(true);
      setOrderRows([]);
      setOrderSelectedStudent(null);
      const rows = await apiSearchStudent(apiBase, { term: orderSearchTerm.trim() });
      setOrderRows(Array.isArray(rows) ? rows : []);
      if (!rows || rows.length === 0) {
        toast.push({
          title: t("toasts_orders.no_match_title"),
          description: t("toasts_orders.no_match_desc"),
          tone: "error",
        });
      }
    } catch (e) {
      toast.push({
        title: t("toasts_orders.search_failed"),
        description: e.message,
        tone: "error",
      });
    } finally {
      setOrderSearching(false);
    }
  }

  // Place single-item immediate order (reserve->ready->fulfill)
  async function placeOrderNow() {
    if (!orderSelectedStudent?.id || !orderItemId) {
      toast.push({ title: t("toasts_orders.required_student_item"), tone: "error" });
      return;
    }

    const payMethod = paymentMethodFromUI(paymentType);
    let payer_reference = null,
      payment_proof_id = null,
      payment_proof_url = null;

    if (payMethod === "vodafone_cash" || payMethod === "instapay") {
      if (!is11DigitLocal(payerPhone)) {
        toast.push({
          title: t("toasts_orders.invalid_number_title"),
          description: t("toasts_orders.invalid_number_desc_payer"),
          tone: "error",
        });
        return;
      }
      if (!paymentFile) {
        toast.push({
          title: t("toasts_orders.missing_proof_title"),
          description:
            payMethod === "vodafone_cash"
              ? t("toasts_orders.missing_proof_desc_vfc")
              : t("toasts_orders.missing_proof_desc"),
          tone: "error",
        });
        return;
      }
      try {
        setUploadingProof(true);
        const uploaded = await uploadPaymentProof(apiBase, paymentFile);
        payer_reference = (payerPhone || "").replace(/\D/g, "");
        payment_proof_id = uploaded?.id || null;
        payment_proof_url = uploaded?.url || null;
      } catch (e) {
        toast.push({
          title: t("toasts_orders.upload_failed"),
          description: e.message,
          tone: "error",
        });
        return;
      } finally {
        setUploadingProof(false);
      }
    }

    try {
      const picked = itemById[orderItemId];
      const unitPriceCents = Number(picked?.default_price_cents || 0);
      const qty = Math.max(1, Number(orderQty || 1));

      const r = await apiFetch(apiBase, "/reservations", {
        method: "POST",
        body: {
          branch_id: branchId,
          item_id: orderItemId,
          qty,
          student_id: orderSelectedStudent.id,
          unit_price_cents: unitPriceCents,
          prepaid_cents: unitPriceCents * qty,
          payment_method: payMethod,
          payer_reference,
          payment_proof_id,
          payment_proof_url,
        },
        authToken,
      });

      await apiFetch(apiBase, `/reservations/${r.id}/mark-ready`, {
        method: "POST",
        body: { notify: false },
        authToken,
      });
      await apiFetch(apiBase, `/reservations/${r.id}/fulfill`, {
        method: "POST",
        authToken,
      });

      toast.push({ title: t("toasts_orders.order_completed"), description: r.id });
      resetOrderSelections();
      setOrderSelectedStudent(null);
      setOrderRows([]);
    } catch (e) {
      toast.push({
        title: t("toasts_orders.order_failed"),
        description: e.message,
        tone: "error",
      });
    }
  }

  // Cart ops
  function addToCart() {
    if (!orderItemId) {
      toast.push({ title: t("toasts_orders.pick_item"), tone: "error" });
      return;
    }
    const picked = itemById[orderItemId];
    const unit = Number(picked?.default_price_cents || 0);
    const qty = Math.max(1, Number(orderQty || 1));
    setCart((xs) => [...xs, { item_id: orderItemId, qty, unit_price_cents: unit }]);
    setOrderItemId("");
    setOrderQty(1);
    toast.push({
      title: t("toasts_orders.added_to_cart"),
      description: `${picked?.sku || ""} × ${qty}`,
    });
  }

  async function purchaseCart() {
    if (!orderSelectedStudent?.id) {
      toast.push({ title: t("toasts_orders.pick_student_first"), tone: "error" });
      return;
    }
    if (!cart.length) {
      toast.push({ title: t("toasts_orders.cart_empty"), tone: "error" });
      return;
    }

    const payMethod = paymentMethodFromUI(paymentType);
    let payer_phone = null,
      payment_proof_id = null,
      payment_proof_url = null;

    if (payMethod !== "cash") {
      if (!is11DigitLocal(payerPhone)) {
        toast.push({
          title: t("toasts_orders.invalid_number_title"),
          description: t("toasts_orders.invalid_number_desc"),
          tone: "error",
        });
        return;
      }
      if (!paymentFile) {
        toast.push({
          title: t("toasts_orders.missing_proof_title"),
          description: t("toasts_orders.missing_proof_desc"),
          tone: "error",
        });
        return;
      }
      try {
        setUploadingProof(true);
        const up = await uploadPaymentProof(apiBase, paymentFile);
        payer_phone = (payerPhone || "").replace(/\D/g, "");
        payment_proof_id = up?.id || null;
        payment_proof_url = up?.url || null;
      } catch (e) {
        toast.push({
          title: t("toasts_orders.upload_failed"),
          description: e.message,
          tone: "error",
        });
        setUploadingProof(false);
        return;
      } finally {
        setUploadingProof(false);
      }
    }

    try {
      for (const line of cart) {
        const r = await apiFetch(apiBase, "/reservations", {
          method: "POST",
          body: {
            branch_id: branchId,
            item_id: line.item_id,
            qty: Number(line.qty || 1),
            student_id: orderSelectedStudent.id,
            unit_price_cents: Number(line.unit_price_cents || 0),
            prepaid_cents:
              Number(line.unit_price_cents || 0) * Number(line.qty || 1),
            payment_method: payMethod,
            payer_phone,
            payment_proof_id,
            payment_proof_url,
          },
          authToken,
        });
        await apiFetch(apiBase, `/reservations/${r.id}/mark-ready`, {
          method: "POST",
          body: { notify: false },
          authToken,
        });
        await apiFetch(apiBase, `/reservations/${r.id}/fulfill`, {
          method: "POST",
          authToken,
        });
      }

      toast.push({
        title: t("toasts_orders.purchase_success"),
        description: `${cart.length} item(s)`,
      });
      resetCart();
      resetOrderSelections();
      setOrderSelectedStudent(null);
      setOrderRows([]);
    } catch (e) {
      toast.push({
        title: t("toasts_orders.purchase_failed"),
        description: e.message,
        tone: "error",
      });
    }
  }

  // Reserve only
  async function placeReservationOnly() {
    if (!orderSelectedStudent?.id) {
      toast.push({ title: t("toasts_orders.pick_student_first"), tone: "error" });
      return;
    }
    if (!orderItemId) {
      toast.push({ title: t("toasts_orders.pick_item"), tone: "error" });
      return;
    }

    const picked = items.find((i) => i.id === orderItemId);
    const unitPriceCents = Number(picked?.default_price_cents || 0);
    const qty = Math.max(1, Number(orderQty || 1));
    const total = unitPriceCents * qty;

    let prepaid_cents = Math.max(
      0,
      Math.round(Number(String(resDepositEGP || "0").replace(/[^\d.]/g, "")) * 100)
    );
    if (prepaid_cents > total) {
      prepaid_cents = total;
      toast.push({
        title: t("toasts_orders.deposit_capped"),
        description: (total / 100).toFixed(2) + " EGP",
      });
    }

    const payMethod = paymentMethodFromUI(resPaymentType);
    let payer_reference = null,
      payment_proof_id = null,
      payment_proof_url = null;

    if (
      prepaid_cents > 0 &&
      (resPaymentType === "vodafone_cash" || resPaymentType === "instapay")
    ) {
      if (!is11DigitLocal(resPayerPhone)) {
        toast.push({
          title: t("toasts_orders.invalid_number_title"),
          description: t("toasts_orders.invalid_number_desc"),
          tone: "error",
        });
        return;
      }
      if (!resPaymentFile) {
        toast.push({
          title: t("toasts_orders.missing_proof_title"),
          description: t("toasts_orders.missing_proof_desc"),
          tone: "error",
        });
        return;
      }
      try {
        setResUploadingProof(true);
        const uploaded = await uploadPaymentProof(apiBase, resPaymentFile);
        payment_proof_url = uploaded?.url || null;
        payment_proof_id = uploaded?.id || null;
        payer_reference = resPayerPhone;
      } catch (e) {
        toast.push({
          title: t("toasts_orders.upload_failed"),
          description: e.message,
          tone: "error",
        });
        setResUploadingProof(false);
        return;
      } finally {
        setResUploadingProof(false);
      }
    }

    try {
      const body = {
        branch_id: branchId,
        item_id: orderItemId,
        qty,
        student_id: orderSelectedStudent.id,
        unit_price_cents: unitPriceCents,
        prepaid_cents,
        ...(prepaid_cents > 0
          ? {
              payment_method: payMethod,
              payer_reference,
              payment_proof_id,
              payment_proof_url,
            }
          : {}),
      };

      const r = await apiFetch(apiBase, "/reservations", {
        method: "POST",
        body,
        authToken,
      });

      toast.push({
        title:
          r.status === "queued"
            ? t("toasts_orders.queued")
            : t("toasts_orders.reserved"),
        description: r.id || "OK",
      });

      setResDepositEGP("");
      setResPaymentType("cash");
      setResPayerPhone("");
      setResPaymentFile(null);
      setOrderItemId("");
      setOrderQty(1);
    } catch (e) {
      toast.push({
        title: t("toasts_orders.reserve_failed"),
        description: e.message,
        tone: "error",
      });
    }
  }

  // Delete tab: fetch today's fulfilled orders
  async function fetchTodaysOrders() {
    setLoadingToday(true);
    try {
      const rows = await apiFetch(apiBase, `/reservations/search?limit=250`, {
        authToken,
      });

      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDate = now.getDate();

      const filtered = (rows || []).filter((r) => {
        const status = (r.status || "").toLowerCase();
        const isFulfilled = status === "fulfilled" || !!r.fulfilled_at;
        if (!isFulfilled) return false;

        const ts = r.updated_at || r.created_at;
        if (!ts) return false;

        const when = parseDateSafe(ts);
        if (!when) return false;

        return (
          when.getFullYear() === todayYear &&
          when.getMonth() === todayMonth &&
          when.getDate() === todayDate
        );
      });

      const list = await Promise.all(
        filtered.map(async (r) => ({
          ...r,
          _studentPublicId: await ensureStudentPublicId(r.student_id),
        }))
      );

      setTodayOrders(list);
    } catch (e) {
      toast.push({
        title: t("toasts_orders.load_today_failed"),
        description: e.message,
        tone: "error",
      });
    } finally {
      setLoadingToday(false);
    }
  }

  async function deleteReservationById(resId) {
    if (!resId) return;
    try {
      await cancelReservationRobust(apiBase, authToken, resId);
      toast.push({ title: t("toasts_orders.order_deleted"), description: resId });
      await fetchTodaysOrders();
    } catch (e) {
      toast.push({
        title: t("toasts_orders.delete_failed"),
        description: String(e.message || e),
        tone: "error",
      });
    }
  }

  // Receive tab
  async function recvSearchStudents() {
    try {
      setRecvSearching(true);
      setRecvRows([]);
      setRecvSelectedStudent(null);
      setRecvReservations([]);
      const rows = await apiSearchStudent(apiBase, { term: recvSearchTerm.trim() });
      setRecvRows(Array.isArray(rows) ? rows : []);
      if (!rows || rows.length === 0) {
        toast.push({
          title: t("toasts_orders.no_match_title"),
          description: t("toasts_orders.no_match_desc"),
          tone: "error",
        });
      }
    } catch (e) {
      toast.push({
        title: t("toasts_orders.search_failed"),
        description: e.message,
        tone: "error",
      });
    } finally {
      setRecvSearching(false);
    }
  }

  const enrichReservation = (r) => {
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
  };

  async function loadReservedForStudent(st) {
    if (!st?.id) return;
    try {
      setRecvReservations([]);
      const rows = await apiFetch(
        apiBase,
        `/reservations/search?student_id=${encodeURIComponent(st.id)}&limit=200`,
        { authToken }
      );

      const active = (rows || []).filter((r) => {
        const s = (r.status || "").toLowerCase();
        return s !== "fulfilled" && s !== "cancelled";
      });
      const enriched = active.map(enrichReservation);
      setRecvReservations(enriched);
    } catch (e) {
      toast.push({
        title: t("toasts_orders.load_reservations_failed"),
        description: e.message,
        tone: "error",
      });
    }
  }

  async function receiveReservationFlow(resId) {
    try {
      await apiFetch(
        apiBase,
        `/reservations/${encodeURIComponent(resId)}/mark-ready`,
        {
          method: "POST",
          body: { notify: false },
          authToken,
        }
      );
      await apiFetch(apiBase, `/reservations/${encodeURIComponent(resId)}/fulfill`, {
        method: "POST",
        authToken,
      });
      toast.push({ title: t("toasts_orders.received"), description: resId });
      setRecvReservations((xs) => xs.filter((x) => x.id !== resId));
    } catch (e) {
      toast.push({
        title: t("toasts_orders.receive_failed"),
        description: e.message,
        tone: "error",
      });
    }
  }

  // Review tab (all open)
  async function fetchAllReservations() {
    setReviewLoading(true);
    try {
      const rows = await apiFetch(apiBase, `/reservations/search?limit=500`, {
        authToken,
      });
      const open = (rows || []).filter((r) => {
        const s = (r.status || "").toLowerCase();
        return s !== "fulfilled" && s !== "cancelled";
      });
      const enriched = open.map(enrichReservation);
      setReviewRows(enriched);

      const agg = new Map();
      for (const r of enriched) {
        const key = `${r._teacherName} | ${r._itemLabel}`;
        const row =
          agg.get(key) || {
            teacher: r._teacherName,
            item: r._itemLabel,
            qty: 0,
            total_remaining_cents: 0,
          };
        row.qty += r._qty;
        row.total_remaining_cents += r._remaining;
        agg.set(key, row);
      }
      setReviewAgg(Array.from(agg.values()));
    } catch (e) {
      toast.push({
        title: t("toasts_orders.load_reservations_failed"),
        description: e.message,
        tone: "error",
      });
    } finally {
      setReviewLoading(false);
    }
  }

  async function ensureStudentPublicId(student_id) {
    if (!student_id) return null;
    const cached = studentPublicById[student_id];
    if (cached != null) return cached;
    try {
      const st = await apiFetch(apiBase, `/students/${encodeURIComponent(student_id)}`, {
        authToken,
      });
      const pid = st?.public_id ?? st?.id ?? student_id;
      setStudentPublicById((m) => ({ ...m, [student_id]: pid }));
      return pid;
    } catch {
      try {
        const rows = await apiFetch(
          apiBase,
          `/students/search?id=${encodeURIComponent(student_id)}&limit=1`,
          { authToken }
        );
        const st = Array.isArray(rows) ? rows[0] : null;
        const pid = st?.public_id ?? student_id;
        setStudentPublicById((m) => ({ ...m, [student_id]: pid }));
        return pid;
      } catch {
        return student_id;
      }
    }
  }

  // Render
  return (
    <Card>
      <CardHead>
        <CardTitle>{t("title_orders")}</CardTitle>
      </CardHead>
      <CardBody>
        <SubTabs>
          <SubTabButton
            $active={ordersTab === "order"}
            onClick={() => setOrdersTab("order")}
          >
            {t("tabs_orders.order")}
          </SubTabButton>
          <SubTabButton
            $active={ordersTab === "reserve"}
            onClick={() => setOrdersTab("reserve")}
          >
            {t("tabs_orders.reserve")}
          </SubTabButton>
          <SubTabButton
            $active={ordersTab === "delete"}
            onClick={() => {
              setOrdersTab("delete");
              fetchTodaysOrders();
            }}
          >
            {t("tabs_orders.delete")}
          </SubTabButton>
          <SubTabButton
            $active={ordersTab === "receive"}
            onClick={() => setOrdersTab("receive")}
          >
            {t("tabs_orders.receive")}
          </SubTabButton>
          <SubTabButton
            $active={ordersTab === "review"}
            onClick={() => {
              setOrdersTab("review");
              fetchAllReservations();
            }}
          >
            {t("tabs_orders.review")}
          </SubTabButton>
        </SubTabs>

        {/* ORDER TAB */}
        {ordersTab === "order" && (
          <>
            <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
              {t("steps_orders.find_student")}
            </CardTitle>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}
            >
              <Input
                placeholder={t("placeholders.search_student")}
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ordersSearchStudents()}
              />
              <Button onClick={ordersSearchStudents} disabled={orderSearching}>
                {orderSearching ? t("buttons_orders.searching") : t("buttons_orders.search")}
              </Button>
            </div>

            {orderRows.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", fontSize: 14 }}>
                  <thead style={{ background: "var(--bg)" }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.id")}
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.name")}
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.phone")}
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.parent")}
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 12px" }}>
                        {t("tables.search.action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderRows.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px" }}>{r.public_id}</td>
                        <td style={{ padding: "8px 12px" }}>{r.full_name}</td>
                        <td style={{ padding: "8px 12px" }}>{r.phone || "-"}</td>
                        <td style={{ padding: "8px 12px" }}>{r.parent_phone || "-"}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <Button
                            $variant="success"
                            onClick={() => {
                              setOrderSelectedStudent(r);
                              resetOrderSelections();
                            }}
                          >
                            {t("buttons_orders.select")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {orderSelectedStudent && (
              <>
                <Helper style={{ marginTop: 10 }}>
                  {t("helpers_orders.selected_with_grade", {
                    name: orderSelectedStudent.full_name,
                    id: orderSelectedStudent.public_id ?? orderSelectedStudent.id,
                    grade: orderSelectedStudent.grade,
                  })}
                </Helper>

                <hr
                  style={{
                    border: 0,
                    borderTop: `1px solid ${"var(--border)"}`,
                    margin: "16px 0",
                  }}
                />

                <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
                  {t("steps_orders.choose_item")}
                </CardTitle>

                <Row cols={3}>
                  <div>
                    <Label>{t("labels.teacher")}</Label>
                    <Select
                      value={orderTeacherId}
                      onChange={(e) => {
                        setOrderTeacherId(e.target.value);
                        setOrderItemId("");
                      }}
                    >
                      <option value="">{t("placeholders.all_teachers")}</option>
                      {filteredTeachers.map((tch) => (
                        <option key={tch.id} value={tch.id}>
                          {tch.name} ({tch.subject})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label>{t("labels.item")}</Label>
                    <Select
                      value={orderItemId}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setOrderItemId(v);
                        if (v) await ensureAvailabilityForItemId(v);
                      }}
                    >
                      <option value="">{t("placeholders.select_item")}</option>
                      {teacherItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {t("labels.item_with_grade", {
                            sku: it.sku,
                            name: it.name,
                            grade: it.grade,
                          })}
                        </option>
                      ))}
                    </Select>
                    <Helper>
                      {orderItemId
                        ? (() => {
                            const it = items.find((i) => i.id === orderItemId);
                            const price = ((it?.default_price_cents ?? 0) / 100).toFixed(2);
                            const cacheKey = it
                              ? `${it.sku}_${it.grade}_${it.teacher_id || ""}`
                              : null;
                            const av =
                              cacheKey !== null
                                ? availBySku?.[cacheKey]?.available ?? "…"
                                : "…";
                            return t("helpers_orders.price_availability", {
                              price,
                              available: av,
                            });
                          })()
                        : t("helpers_orders.pick_teacher_first")}
                    </Helper>
                  </div>

                  <div>
                    <Label>{t("labels.qty")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={orderQty}
                      onChange={(e) => setOrderQty(Number(e.target.value || 1))}
                    />
                  </div>
                </Row>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Button
                    onClick={async () => {
                      if (!orderItemId) return;
                      const qty = Math.max(1, Number(orderQty || 1));
                      const it = itemById[orderItemId];
                      let available = 0;
                      if (it) {
                        const cacheKey = `${it.sku}_${it.grade}_${it.teacher_id || ""}`;
                        const cached = availBySku?.[cacheKey];
                        if (cached?.available == null) {
                          const fresh = await ensureAvailabilityForItemId(orderItemId);
                          available = fresh?.available ?? 0;
                        } else {
                          available = cached?.available ?? 0;
                        }
                      }
                      if (available < qty) {
                        toast.push({
                          title: t("toasts_orders.out_of_stock_title"),
                          description: t("toasts_orders.out_of_stock_desc"),
                          tone: "error",
                        });
                        return;
                      }
                      addToCart();
                    }}
                    disabled={
                      !orderItemId ||
                      (() => {
                        const it = itemById[orderItemId];
                        if (!it) return true;
                        const cacheKey = `${it.sku}_${it.grade}_${it.teacher_id || ""}`;
                        const av = availBySku?.[cacheKey]?.available;
                        if (av == null) return false; // allow click; we'll check with ensureAvailabilityForItemId
                        return av < Math.max(1, Number(orderQty || 1));
                      })()
                    }
                  >
                    {t("buttons_orders.add_to_cart")}
                  </Button>
                  <Button
                    $variant="ghost"
                    onClick={() => {
                      setOrderSelectedStudent(null);
                      setOrderRows([]);
                      resetCart();
                    }}
                  >
                    {t("buttons_orders.change_student")}
                  </Button>
                </div>

                {cart.length > 0 && (
                  <>
                    <hr
                      style={{
                        border: 0,
                        borderTop: `1px solid ${"var(--border)"}`,
                        margin: "16px 0",
                      }}
                    />
                    <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
                      {t("steps_orders.cart")}
                    </CardTitle>

                    <TableWrap>
                      <Table>
                        <thead>
                          <tr>
                            <th>{t("tables.cart.item")}</th>
                            <th>{t("tables.cart.qty")}</th>
                            <th>{t("tables.cart.unit")}</th>
                            <th>{t("tables.cart.subtotal")}</th>
                            <th>{t("tables.cart.blank")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((c, i) => {
                            const it = itemById[c.item_id] || {};
                            const unit = Number(c.unit_price_cents || 0);
                            const sub = unit * Number(c.qty || 0);
                            return (
                              <tr key={i}>
                                <td>
                                  {t("labels.item_with_grade", {
                                    sku: it.sku,
                                    name: it.name,
                                    grade: it.grade,
                                  })}
                                </td>
                                <td>{c.qty}</td>
                                <td>{(unit / 100).toFixed(2)} EGP</td>
                                <td>{(sub / 100).toFixed(2)} EGP</td>
                                <td style={{ textAlign: "right" }}>
                                  <Button
                                    $variant="ghost"
                                    onClick={() =>
                                      setCart((xs) => xs.filter((_, j) => j !== i))
                                    }
                                  >
                                    {t("buttons_orders.remove")}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </TableWrap>

                    <Helper style={{ marginTop: 8 }}>
                      {t("helpers_orders.cart_total", {
                        total: (cartTotalCents() / 100).toFixed(2),
                      })}
                    </Helper>

                    <hr
                      style={{
                        border: 0,
                        borderTop: `1px solid ${"var(--border)"}`,
                        margin: "16px 0",
                      }}
                    />

                    <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
                      {t("steps_orders.payment")}
                    </CardTitle>

                    <Row cols={3}>
                      <div>
                        <Label>{t("labels.payment_method")}</Label>
                        <Select
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value)}
                        >
                          <option value="cash">{t("methods.cash")}</option>
                          <option value="vodafone_cash">{t("methods.vodafone_cash")}</option>
                          <option value="instapay">{t("methods.instapay")}</option>
                        </Select>
                      </div>

                      {(paymentType === "vodafone_cash" ||
                        paymentType === "instapay") && (
                        <>
                          <div>
                            <Label>{t("labels.sender_phone")}</Label>
                            <Input
                              placeholder={t("placeholders.sender_phone")}
                              value={payerPhone}
                              onChange={(e) => setPayerPhone(e.target.value)}
                              onBlur={(e) => {
                                if (!is11DigitLocal(e.target.value)) {
                                  setPayerPhone("");
                                  toast.push({
                                    title: t("toasts_orders.invalid_number_title"),
                                    description: t("toasts_orders.invalid_number_desc"),
                                    tone: "error",
                                  });
                                }
                              }}
                            />
                          </div>
                        </>
                      )}
                    </Row>

                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <Button
                        onClick={purchaseCart}
                        disabled={
                          uploadingProof ||
                          cart.length === 0 ||
                          ((paymentType === "vodafone_cash" ||
                            paymentType === "instapay") &&
                            (!payerPhone ||
                              !is11DigitLocal(payerPhone) ||
                              !paymentFile))
                        }
                      >
                        {uploadingProof
                          ? t("buttons_orders.uploading")
                          : t("buttons_orders.purchase")}
                      </Button>
                      <Button $variant="ghost" onClick={resetCart}>
                        {t("buttons_orders.clear_cart")}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* RESERVE TAB */}
        {ordersTab === "reserve" && (
          <>
            <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
              {t("steps_orders.find_student")}
            </CardTitle>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}
            >
              <Input
                placeholder={t("placeholders.search_student")}
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ordersSearchStudents()}
              />
              <Button onClick={ordersSearchStudents} disabled={orderSearching}>
                {orderSearching ? t("buttons_orders.searching") : t("buttons_orders.search")}
              </Button>
            </div>

            {orderRows.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", fontSize: 14 }}>
                  <thead style={{ background: "var(--bg)" }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.id")}
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.name")}
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.phone")}
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.parent")}
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 12px" }}>
                        {t("tables.search.action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderRows.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px" }}>{r.public_id}</td>
                        <td style={{ padding: "8px 12px" }}>{r.full_name}</td>
                        <td style={{ padding: "8px 12px" }}>{r.phone || "-"}</td>
                        <td style={{ padding: "8px 12px" }}>{r.parent_phone || "-"}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <Button
                            $variant="success"
                            onClick={() => {
                              setOrderSelectedStudent(r);
                              resetOrderSelections();
                            }}
                          >
                            {t("buttons_orders.select")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {orderSelectedStudent && (
              <>
                <Helper style={{ marginTop: 10 }}>
                  {t("helpers_orders.selected", {
                    name: orderSelectedStudent.full_name,
                    id: orderSelectedStudent.public_id ?? orderSelectedStudent.id,
                  })}
                </Helper>

                <hr
                  style={{
                    border: 0,
                    borderTop: `1px solid ${"var(--border)"}`,
                    margin: "16px 0",
                  }}
                />

                <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
                  {t("steps_orders.choose_item")}
                </CardTitle>

                <Row cols={3}>
                  <div>
                    <Label>{t("labels.teacher")}</Label>
                    <Select
                      value={orderTeacherId}
                      onChange={(e) => {
                        setOrderTeacherId(e.target.value);
                        setOrderItemId("");
                      }}
                    >
                      <option value="">{t("placeholders.all_teachers")}</option>
                      {teachers.map((tch) => (
                        <option key={tch.id} value={tch.id}>
                          {tch.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label>{t("labels.item")}</Label>
                    <Select
                      value={orderItemId}
                      onChange={(e) => setOrderItemId(e.target.value)}
                    >
                      <option value="">{t("placeholders.select_item")}</option>
                      {teacherItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.sku} — {it.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label>{t("labels.qty")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={orderQty}
                      onChange={(e) => setOrderQty(Number(e.target.value || 1))}
                    />
                  </div>
                </Row>

                {!!orderItemId && (
                  <>
                    <hr
                      style={{
                        border: 0,
                        borderTop: `1px solid ${"var(--border)"}`,
                        margin: "16px 0",
                      }}
                    />
                    <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
                      {t("steps_orders.deposit_payment")}
                    </CardTitle>

                    <Row cols={3}>
                      <div>
                        <Label>{t("labels.deposit_egp")}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={t("placeholders.deposit_egp")}
                          value={resDepositEGP}
                          onChange={(e) => setResDepositEGP(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>{t("labels.payment_method")}</Label>
                        <Select
                          value={resPaymentType}
                          onChange={(e) => setResPaymentType(e.target.value)}
                        >
                          <option value="cash">{t("methods.cash")}</option>
                          <option value="vodafone_cash">{t("methods.vodafone_cash")}</option>
                          <option value="instapay">{t("methods.instapay")}</option>
                        </Select>
                      </div>

                      {(resPaymentType === "vodafone_cash" ||
                        resPaymentType === "instapay") && (
                        <>
                          <div>
                            <Label>{t("labels.sender_phone")}</Label>
                            <Input
                              placeholder={t("placeholders.sender_phone")}
                              value={resPayerPhone}
                              onChange={(e) => setResPayerPhone(e.target.value)}
                              onBlur={(e) => {
                                if (!is11DigitLocal(e.target.value)) {
                                  setResPayerPhone("");
                                  toast.push({
                                    title: t("toasts_orders.invalid_number_title"),
                                    description: t("toasts_orders.invalid_number_desc"),
                                    tone: "error",
                                  });
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Label>{t("labels.upload_proof")}</Label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setResPaymentFile(e.target.files?.[0] || null)
                              }
                              style={{ display: "block" }}
                            />
                          </div>
                        </>
                      )}
                    </Row>

                    {(() => {
                      const it = items.find((i) => i.id === orderItemId);
                      const unit = Number(it?.default_price_cents || 0);
                      const qty = Math.max(1, Number(orderQty || 1));
                      const total = unit * qty;
                      const deposit = Math.max(
                        0,
                        Math.round(
                          Number((resDepositEGP || "0").replace(/[^\d.]/g, "")) * 100
                        )
                      );
                      const remaining = Math.max(0, total - deposit);
                      return (
                        <Helper style={{ marginTop: 6 }}>
                          {t("helpers_orders.reserve_totals", {
                            total: (total / 100).toFixed(2),
                            paid: (deposit / 100).toFixed(2),
                            remaining: (remaining / 100).toFixed(2),
                          })}
                        </Helper>
                      );
                    })()}
                  </>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Button onClick={placeReservationOnly} disabled={resUploadingProof}>
                    {resUploadingProof
                      ? t("buttons_orders.uploading")
                      : t("buttons_orders.reserve")}
                  </Button>
                  <Button
                    $variant="ghost"
                    onClick={() => {
                      setOrderSelectedStudent(null);
                      setOrderRows([]);
                    }}
                  >
                    {t("buttons_orders.change_student")}
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {/* DELETE TAB */}
        {ordersTab === "delete" && (
          <>
            <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
              {t("steps_orders.orders_today")}
            </CardTitle>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Button onClick={fetchTodaysOrders} disabled={loadingToday}>
                {loadingToday ? t("buttons_orders.searching") : t("buttons_orders.refresh")}
              </Button>
            </div>

            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>{t("tables.today.time")}</th>
                    <th>{t("tables.today.student")}</th>
                    <th>{t("tables.today.item")}</th>
                    <th>{t("tables.today.qty")}</th>
                    <th>{t("tables.today.total")}</th>
                    <th>{t("tables.today.blank")}</th>
                  </tr>
                </thead>
                <tbody>
                  {todayOrders.map((r) => {
                    const it = (itemById && itemById[r.item_id]) || {};

                    const tRaw = r.fulfilled_at || r.start || r.created_at;
                    const dt = tRaw ? parseDateSafe(tRaw) : null;
                    const time12 = dt
                      ? dt.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "-";

                    const unitCents =
                      r.unit_price_cents_effective ??
                      r.unit_price_cents ??
                      r.item_default_price_cents ??
                      it.default_price_cents ??
                      0;

                    const qty = Number(r.qty || 0);
                    const totalCents = r.total_cents ?? unitCents * qty;

                    const baseName = r.item_name || it.name || "";
                    const itemLabel = baseName
                      ? `${baseName}${r.teacher_name ? ` — ${r.teacher_name}` : ""}`
                      : `${r.teacher_name ? `— ${r.teacher_name}` : "(Unknown item)"}`;

                    const studentLabel =
                      r.student_name ||
                      r._studentPublicId ||
                      r.student_public_id ||
                      r.student_id ||
                      "-";

                    return (
                      <tr key={r.id}>
                        <td>{time12}</td>
                        <td>{studentLabel}</td>
                        <td className="truncate">{itemLabel}</td>
                        <td>{qty}</td>
                        <td className="text-right">{money(totalCents)}</td>
                        <td style={{ textAlign: "right" }}>
                          <Button
                            $variant="danger"
                            onClick={() => {
                              const msg = t("confirm.delete", {
                                student: studentLabel,
                                item: itemLabel,
                                qty,
                                total: (totalCents / 100).toFixed(2),
                                time: time12,
                              });
                              if (!window.confirm(msg)) return;
                              deleteReservationById(r.id);
                            }}
                          >
                            {t("buttons_orders.delete")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
            <Helper>{t("helpers_orders.only_same_day")}</Helper>
          </>
        )}

        {/* RECEIVE TAB */}
        {ordersTab === "receive" && (
          <>
            <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
              {t("steps_orders.find_student")}
            </CardTitle>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}
            >
              <Input
                placeholder={t("placeholders.search_student")}
                value={recvSearchTerm}
                onChange={(e) => setRecvSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && recvSearchStudents()}
              />
              <Button onClick={recvSearchStudents} disabled={recvSearching}>
                {recvSearching ? t("buttons_orders.searching") : t("buttons_orders.search")}
              </Button>
            </div>

            {recvRows.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", fontSize: 14 }}>
                  <thead style={{ background: "var(--bg)" }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.id")}
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.name")}
                      </th>
                      <th style={{ textAlign: "left", padding: "8px 12px" }}>
                        {t("tables.search.phone")}
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 12px" }}>
                        {t("tables.search.action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recvRows.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--border)b" }}>
                        <td style={{ padding: "8px 12px" }}>{r.public_id}</td>
                        <td style={{ padding: "8px 12px" }}>{r.full_name}</td>
                        <td style={{ padding: "8px 12px" }}>{r.phone || "-"}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <Button
                            $variant="success"
                            onClick={() => {
                              setRecvSelectedStudent(r);
                              loadReservedForStudent(r);
                            }}
                          >
                            {t("buttons_orders.select")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {recvSelectedStudent && (
              <>
                <Helper style={{ marginTop: 10 }}>
                  {t("helpers_orders.selected", {
                    name: recvSelectedStudent.full_name,
                    id: recvSelectedStudent.public_id ?? recvSelectedStudent.id,
                  })}
                </Helper>

                <hr
                  style={{
                    border: 0,
                    borderTop: `1px solid ${"var(--border)"}`,
                    margin: "16px 0",
                  }}
                />

                <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
                  {t("steps_orders.reserved_for_student")}
                </CardTitle>

                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th>{t("tables.receive.student_id")}</th>
                        <th>{t("tables.receive.teacher")}</th>
                        <th>{t("tables.receive.item")}</th>
                        <th>{t("tables.receive.qty")}</th>
                        <th>{t("tables.receive.total")}</th>
                        <th>{t("tables.receive.paid")}</th>
                        <th>{t("tables.receive.remaining")}</th>
                        <th>{t("tables.receive.blank")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recvReservations.map((r) => (
                        <tr key={r.id}>
                          <td
                            style={{
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco",
                              fontSize: 12,
                            }}
                          >
                            {r.student_public_id || r.student_id || "—"}
                          </td>
                          <td>{r._teacherName}</td>
                          <td>{r._itemLabel}</td>
                          <td>{r._qty}</td>
                          <td>{money(r._total)}</td>
                          <td>{money(r._paid)}</td>
                          <td>{money(r._remaining)}</td>
                          <td style={{ textAlign: "right" }}>
                            <Button onClick={() => receiveReservationFlow(r.id)}>
                              {t("buttons_orders.receive")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
                {recvReservations.length === 0 && (
                  <Helper>{t("helpers_orders.no_active_reservations")}</Helper>
                )}
              </>
            )}
          </>
        )}

        {/* REVIEW TAB */}
        {ordersTab === "review" && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
                {t("steps_orders.open_reservations")}
              </CardTitle>
              <Button onClick={fetchAllReservations} disabled={reviewLoading}>
                {reviewLoading ? t("buttons_orders.searching") : t("buttons_orders.refresh")}
              </Button>
            </div>

            <TableWrap style={{ marginTop: 8 }}>
              <Table>
                <thead>
                  <tr>
                    <th>{t("tables.review_open.student_id")}</th>
                    <th>{t("tables.review_open.teacher")}</th>
                    <th>{t("tables.review_open.item")}</th>
                    <th>{t("tables.review_open.qty")}</th>
                    <th>{t("tables.review_open.paid")}</th>
                    <th>{t("tables.review_open.remaining")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((r) => (
                    <tr key={r.id}>
                      <td
                        style={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco",
                          fontSize: 12,
                        }}
                      >
                        {r._studentPublicId ??
                          r.student_public_id ??
                          r.student_id ??
                          "—"}
                      </td>
                      <td>{r._teacherName}</td>
                      <td>{r._itemLabel}</td>
                      <td>{r._qty}</td>
                      <td>{money(r._paid)}</td>
                      <td>{money(r._remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            <hr
              style={{
                border: 0,
                borderTop: `1px solid ${"var(--border)"}`,
                margin: "16px 0",
              }}
            />

            <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
              {t("steps_orders.summary")}
            </CardTitle>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>{t("tables.review_summary.teacher")}</th>
                    <th>{t("tables.review_summary.item")}</th>
                    <th>{t("tables.review_summary.qty")}</th>
                    <th>{t("tables.review_summary.total_branch")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewAgg.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.teacher}</td>
                      <td>{row.item}</td>
                      <td>{row.qty}</td>
                      <td>{money(row.total_remaining_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </>
        )}
      </CardBody>
    </Card>
  );
}
