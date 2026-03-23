import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useAppStore from "../../store/useAppStore";
import { apiFetch } from "../../api";
import Button from "../../components/Button";
import { CardTitle } from "../../components/Card";
import { TableWrap, Table } from "../../components/Table";
import { money } from "../../utils/helpers";
import { enrichReservation } from "./helpers";

export default function ReviewTab({ toast }) {
  const { t } = useTranslation();
  const { apiBase, authToken } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [agg, setAgg] = useState([]);

  async function fetchAll() {
    setLoading(true);
    try {
      const raw = await apiFetch(apiBase, `/reservations/search?limit=500`, { authToken });
      const allRows = raw?.items ?? raw ?? [];
      const open = allRows.filter((r) => {
        const s = (r.status || "").toLowerCase();
        return s !== "fulfilled" && s !== "cancelled";
      });
      const enriched = open.map(enrichReservation);
      setRows(enriched);

      const aggMap = new Map();
      for (const r of enriched) {
        const key = `${r._teacherName} | ${r._itemLabel}`;
        const row = aggMap.get(key) || { teacher: r._teacherName, item: r._itemLabel, qty: 0, total_remaining_cents: 0 };
        row.qty += r._qty;
        row.total_remaining_cents += r._remaining;
        aggMap.set(key, row);
      }
      setAgg(Array.from(aggMap.values()));
    } catch (e) {
      toast.push({ title: t("toasts_orders.load_reservations_failed"), description: e.message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>{t("steps_orders.open_reservations")}</CardTitle>
        <Button onClick={fetchAll} disabled={loading}>
          {loading ? t("buttons_orders.searching") : t("buttons_orders.refresh")}
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
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco", fontSize: 12 }}>
                  {r._studentPublicId ?? r.student_public_id ?? r.student_id ?? "—"}
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

      <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>{t("steps_orders.summary")}</CardTitle>
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
            {agg.map((row, idx) => (
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
  );
}
