import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../api";
import Button from "../components/Button";
import { Card, CardHead, CardTitle, CardBody } from "../components/Card";
import { Row, Label, Input, Select } from "../components/Form";
import { Helper, Pill } from "../components/Misc";
import { TableWrap, Table } from "../components/Table";

export default function AuditTrail({ apiBase, authToken, toast }) {
  const { t } = useTranslation();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const [opTypes, setOpTypes] = useState([]);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    apiFetch(apiBase, "/audit/types", { authToken })
      .then((res) => setOpTypes(res?.types || []))
      .catch(() => {});
  }, []);

  async function load(newOffset = 0) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("offset", String(newOffset));
      params.set("limit", String(limit));
      if (filterType) params.set("op_type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await apiFetch(apiBase, `/audit?${params.toString()}`, { authToken });
      setRows(res?.items || []);
      setTotal(res?.total || 0);
      setOffset(newOffset);
    } catch (e) {
      toast.push({ title: "Failed to load audit logs", description: e.message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0);
  }, [filterType, filterStatus, startDate, endDate]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <Card>
      <CardHead>
        <CardTitle>Audit Trail</CardTitle>
      </CardHead>
      <CardBody>
        <Row cols={4}>
          <div>
            <Label>Operation type</Label>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {opTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </Select>
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </Row>

        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <Button onClick={() => load(0)} disabled={loading}>
            {loading ? "Loading..." : "Search"}
          </Button>
          <Helper style={{ margin: 0 }}>
            {total} record{total !== 1 ? "s" : ""} — Page {currentPage} of {totalPages || 1}
          </Helper>
        </div>

        <TableWrap style={{ marginTop: 12 }}>
          <Table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Status</th>
                <th>Error</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr>
                    <td style={{ fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td>
                      <Pill>{r.op_type}</Pill>
                    </td>
                    <td>
                      <Pill
                        style={{
                          background: r.status === "success" ? "#dcfce7" : "#fee2e2",
                          borderColor: r.status === "success" ? "#86efac" : "#fca5a5",
                          color: r.status === "success" ? "#166534" : "#991b1b",
                        }}
                      >
                        {r.status}
                      </Pill>
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.error || "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Button
                        $variant="ghost"
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        style={{ fontSize: 12 }}
                      >
                        {expanded === r.id ? "Hide" : "Details"}
                      </Button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr>
                      <td colSpan={5} style={{ background: "var(--bg, #f8fafc)", padding: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <strong style={{ fontSize: 12 }}>Request</strong>
                            <pre
                              style={{
                                fontSize: 11,
                                background: "var(--card-bg, #fff)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: 8,
                                maxHeight: 200,
                                overflow: "auto",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {JSON.stringify(r.request, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <strong style={{ fontSize: 12 }}>Response</strong>
                            <pre
                              style={{
                                fontSize: 11,
                                background: "var(--card-bg, #fff)",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                padding: 8,
                                maxHeight: 200,
                                overflow: "auto",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {JSON.stringify(r.response, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                    No audit records found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </TableWrap>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <Button
              $variant="ghost"
              disabled={offset === 0}
              onClick={() => load(Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <Button
              $variant="ghost"
              disabled={offset + limit >= total}
              onClick={() => load(offset + limit)}
            >
              Next
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
