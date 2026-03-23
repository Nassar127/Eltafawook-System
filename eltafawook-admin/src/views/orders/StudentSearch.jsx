import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../../components/Button";
import { CardTitle } from "../../components/Card";
import { Input } from "../../components/Form";

export default function StudentSearch({
  searchTerm,
  setSearchTerm,
  searching,
  onSearch,
  rows,
  onSelect,
  extraColumns,
}) {
  const { t } = useTranslation();

  return (
    <>
      <CardTitle style={{ fontSize: 14, marginBottom: 6 }}>
        {t("steps_orders.find_student")}
      </CardTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
        <Input
          placeholder={t("placeholders.search_student")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <Button onClick={onSearch} disabled={searching}>
          {searching ? t("buttons_orders.searching") : t("buttons_orders.search")}
        </Button>
      </div>

      {rows.length > 0 && (
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
                <th style={{ textAlign: "left", padding: "8px 12px" }}>{t("tables.search.id")}</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>{t("tables.search.name")}</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>{t("tables.search.phone")}</th>
                {extraColumns !== false && (
                  <th style={{ textAlign: "left", padding: "8px 12px" }}>{t("tables.search.parent")}</th>
                )}
                <th style={{ textAlign: "right", padding: "8px 12px" }}>{t("tables.search.action")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px" }}>{r.public_id}</td>
                  <td style={{ padding: "8px 12px" }}>{r.full_name}</td>
                  <td style={{ padding: "8px 12px" }}>{r.phone || "-"}</td>
                  {extraColumns !== false && (
                    <td style={{ padding: "8px 12px" }}>{r.parent_phone || "-"}</td>
                  )}
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    <Button $variant="success" onClick={() => onSelect(r)}>
                      {t("buttons_orders.select")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
