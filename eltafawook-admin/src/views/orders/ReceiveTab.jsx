import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import useAppStore from "../../store/useAppStore";
import { apiFetch, apiSearchStudent } from "../../api";
import Button from "../../components/Button";
import { CardTitle } from "../../components/Card";
import { Helper } from "../../components/Misc";
import { TableWrap, Table } from "../../components/Table";
import { money } from "../../utils/helpers";
import StudentSearch from "./StudentSearch";
import { enrichReservation } from "./helpers";

export default function ReceiveTab({ toast }) {
  const { t } = useTranslation();
  const { apiBase, authToken } = useAppStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reservations, setReservations] = useState([]);

  async function search() {
    try {
      setSearching(true);
      setRows([]);
      setSelectedStudent(null);
      setReservations([]);
      const res = await apiSearchStudent(apiBase, { term: searchTerm.trim() });
      const arr = res?.items ?? res ?? [];
      setRows(Array.isArray(arr) ? arr : []);
      if (!arr || arr.length === 0) {
        toast.push({ title: t("toasts_orders.no_match_title"), description: t("toasts_orders.no_match_desc"), tone: "error" });
      }
    } catch (e) {
      toast.push({ title: t("toasts_orders.search_failed"), description: e.message, tone: "error" });
    } finally {
      setSearching(false);
    }
  }

  async function loadReservedForStudent(st) {
    if (!st?.id) return;
    try {
      setReservations([]);
      const raw = await apiFetch(apiBase, `/reservations/search?student_id=${encodeURIComponent(st.id)}&limit=200`, { authToken });
      const rows = raw?.items ?? raw ?? [];
      const active = rows.filter((r) => {
        const s = (r.status || "").toLowerCase();
        return s !== "fulfilled" && s !== "cancelled";
      });
      setReservations(active.map(enrichReservation));
    } catch (e) {
      toast.push({ title: t("toasts_orders.load_reservations_failed"), description: e.message, tone: "error" });
    }
  }

  async function receiveReservation(resId) {
    try {
      await apiFetch(apiBase, `/reservations/${encodeURIComponent(resId)}/mark-ready`, { method: "POST", body: { notify: false }, authToken });
      await apiFetch(apiBase, `/reservations/${encodeURIComponent(resId)}/fulfill`, { method: "POST", authToken });
      toast.push({ title: t("toasts_orders.received"), description: resId });
      setReservations((xs) => xs.filter((x) => x.id !== resId));
    } catch (e) {
      toast.push({ title: t("toasts_orders.receive_failed"), description: e.message, tone: "error" });
    }
  }

  return (
    <>
      <StudentSearch
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searching={searching}
        onSearch={search}
        rows={rows}
        extraColumns={false}
        onSelect={(r) => {
          setSelectedStudent(r);
          loadReservedForStudent(r);
        }}
      />

      {selectedStudent && (
        <>
          <Helper style={{ marginTop: 10 }}>
            {t("helpers_orders.selected", { name: selectedStudent.full_name, id: selectedStudent.public_id ?? selectedStudent.id })}
          </Helper>

          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }} />

          <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>{t("steps_orders.reserved_for_student")}</CardTitle>

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
                {reservations.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco", fontSize: 12 }}>
                      {r.student_public_id || r.student_id || "—"}
                    </td>
                    <td>{r._teacherName}</td>
                    <td>{r._itemLabel}</td>
                    <td>{r._qty}</td>
                    <td>{money(r._total)}</td>
                    <td>{money(r._paid)}</td>
                    <td>{money(r._remaining)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Button onClick={() => receiveReservation(r.id)}>{t("buttons_orders.receive")}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
          {reservations.length === 0 && <Helper>{t("helpers_orders.no_active_reservations")}</Helper>}
        </>
      )}
    </>
  );
}
