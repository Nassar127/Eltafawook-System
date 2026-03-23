import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../api";
import Button from "../components/Button";
import { Card, CardHead, CardTitle, CardBody } from "../components/Card";
import { TableWrap, Table } from "../components/Table";
import { Helper, Pill } from "../components/Misc";
import { Row, Label, Select } from "../components/Form";

const money = (cents) => `${(Number(cents || 0) / 100).toFixed(2)} EGP`;

const KpiCard = ({ label, value, sub }) => (
  <div
    style={{
      background: "var(--card-bg, #fff)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "20px 16px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent, #4f46e5)" }}>{value}</div>
    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div>}
  </div>
);

export default function Dashboard({ apiBase, authToken, toast, branches }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branchFilter, setBranchFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const qs = branchFilter ? `?branch_id=${encodeURIComponent(branchFilter)}` : "";
      const res = await apiFetch(apiBase, `/dashboard/summary${qs}`, { authToken });
      setData(res);
    } catch (e) {
      toast.push({ title: "Failed to load dashboard", description: e.message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchFilter]);

  const resStatuses = data?.reservations_by_status || {};

  return (
    <Card>
      <CardHead>
        <CardTitle>Dashboard</CardTitle>
      </CardHead>
      <CardBody>
        <Row cols={2}>
          <div>
            <Label>Filter by branch</Label>
            <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="">All branches</option>
              {(branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </Select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </Row>

        {data && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              <KpiCard label="Total Students" value={data.total_students} />
              <KpiCard label="KG Students" value={data.total_kg_students} />
              <KpiCard
                label="Sales Today"
                value={data.sales_today?.count || 0}
                sub={money(data.sales_today?.revenue_cents)}
              />
              <KpiCard
                label="Sales This Month"
                value={data.sales_month?.count || 0}
                sub={money(data.sales_month?.revenue_cents)}
              />
              {data.low_stock_items != null && (
                <KpiCard label="Low Stock Items" value={Array.isArray(data.low_stock_items) ? data.low_stock_items.length : data.low_stock_items} sub="Available ≤ 0" />
              )}
            </div>

            {/* Reservation breakdown */}
            <div style={{ marginTop: 24 }}>
              <CardTitle style={{ fontSize: 14, marginBottom: 8 }}>Reservations by Status</CardTitle>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(resStatuses).map(([status, count]) => (
                  <Pill key={status} style={{ fontSize: 13 }}>
                    {status}: <strong>{count}</strong>
                  </Pill>
                ))}
                {Object.keys(resStatuses).length === 0 && <Helper>No reservation data</Helper>}
              </div>
            </div>

            {/* Branch breakdown */}
            {data.branches_today?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <CardTitle style={{ fontSize: 14, marginBottom: 8 }}>Branch Sales Today</CardTitle>
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Sales</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.branches_today.map((b) => (
                        <tr key={b.code}>
                          <td>
                            {b.name} ({b.code})
                          </td>
                          <td>{b.sales_count}</td>
                          <td>{money(b.revenue_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
