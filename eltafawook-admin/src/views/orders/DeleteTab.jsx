import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import useAppStore from "../../store/useAppStore";
import { apiFetch, cancelReservationRobust } from "../../api";
import Button from "../../components/Button";
import { CardTitle } from "../../components/Card";
import { Helper } from "../../components/Misc";
import { TableWrap, Table } from "../../components/Table";
import { parseDateSafe } from "../../utils/dates";
import { money } from "../../utils/helpers";

export default function DeleteTab({ toast }) {
  const { t } = useTranslation();
  const { apiBase, authToken } = useAppStore();
  const itemById = useAppStore((s) => s.itemById());

  const [todayOrders, setTodayOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchTodaysOrders() {
    setLoading(true);
    try {
      const raw = await apiFetch(apiBase, `/reservations/search?limit=250`, { authToken });
      const rows = raw?.items ?? raw ?? [];

      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDate = now.getDate();

      const filtered = rows.filter((r) => {
        const isFulfilled = (r.status || "").toLowerCase() === "fulfilled" || !!r.fulfilled_at;
        if (!isFulfilled) return false;
        const ts = r.updated_at || r.created_at;
        if (!ts) return false;
        const when = parseDateSafe(ts);
        if (!when) return false;
        return when.getFullYear() === todayYear && when.getMonth() === todayMonth && when.getDate() === todayDate;
      });

      setTodayOrders(filtered);
    } catch (e) {
      toast.push({ title: t("toasts_orders.load_today_failed"), description: e.message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function deleteReservation(resId) {
    try {
      await cancelReservationRobust(apiBase, authToken, resId);
      toast.push({ title: t("toasts_orders.order_deleted"), description: resId });
      await fetchTodaysOrders();
    } catch (e) {
      toast.push({ title: t("toasts_orders.delete_failed"), description: String(e.message || e), tone: "error" });
    }
  }

  return (
    <>
      <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>{t("steps_orders.orders_today")}</CardTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Button onClick={fetchTodaysOrders} disabled={loading}>
          {loading ? t("buttons_orders.searching") : t("buttons_orders.refresh")}
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
              const it = itemById[r.item_id] || {};
              const tRaw = r.fulfilled_at || r.start || r.created_at;
              const dt = tRaw ? parseDateSafe(tRaw) : null;
              const time12 = dt ? dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }) : "-";
              const unitCents = r.unit_price_cents_effective ?? r.unit_price_cents ?? r.item_default_price_cents ?? it.default_price_cents ?? 0;
              const qty = Number(r.qty || 0);
              const totalCents = r.total_cents ?? unitCents * qty;
              const baseName = r.item_name || it.name || "";
              const itemLabel = baseName ? `${baseName}${r.teacher_name ? ` — ${r.teacher_name}` : ""}` : r.teacher_name ? `— ${r.teacher_name}` : "(Unknown item)";
              const studentLabel = r.student_name || r.student_public_id || r.student_id || "-";

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
                        const msg = t("confirm.delete", { student: studentLabel, item: itemLabel, qty, total: (totalCents / 100).toFixed(2), time: time12 });
                        if (!window.confirm(msg)) return;
                        deleteReservation(r.id);
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
  );
}
