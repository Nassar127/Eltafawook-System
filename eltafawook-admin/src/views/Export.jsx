import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../components/Button";
import { Card, CardHead, CardTitle, CardBody } from "../components/Card";
import { Row, Label, Input, Select } from "../components/Form";
import { Helper } from "../components/Misc";

export default function Export({ apiBase, authToken, toast, branches }) {
  const { t } = useTranslation();

  const [exportType, setExportType] = useState("students");
  const [branchFilter, setBranchFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.set("branch_id", branchFilter);
      if (exportType === "sales") {
        if (!startDate || !endDate) {
          toast.push({ title: "Date range required for sales export", tone: "error" });
          setDownloading(false);
          return;
        }
        params.set("start_date", startDate);
        params.set("end_date", endDate);
      }

      const qs = params.toString() ? `?${params.toString()}` : "";
      const url = `${apiBase}/export/${exportType}${qs}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        const txt = await res.text();
        let detail;
        try { detail = JSON.parse(txt)?.detail || txt; } catch { detail = txt; }
        throw new Error(detail);
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${exportType}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.push({ title: "Export downloaded" });
    } catch (e) {
      toast.push({ title: "Export failed", description: e.message, tone: "error" });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHead>
        <CardTitle>Export Data</CardTitle>
      </CardHead>
      <CardBody>
        <Row cols={2}>
          <div>
            <Label>Export type</Label>
            <Select value={exportType} onChange={(e) => setExportType(e.target.value)}>
              <option value="students">Students</option>
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
            </Select>
          </div>
          <div>
            <Label>Branch (optional)</Label>
            <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="">All branches</option>
              {(branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </Select>
          </div>
        </Row>

        {exportType === "sales" && (
          <Row cols={2} style={{ marginTop: 12 }}>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </Row>
        )}

        <div style={{ marginTop: 16 }}>
          <Button onClick={download} disabled={downloading}>
            {downloading ? "Downloading..." : "Download CSV"}
          </Button>
        </div>

        <Helper style={{ marginTop: 12 }}>
          Exports are generated as CSV files. Open them in Excel, Google Sheets, or any spreadsheet app.
        </Helper>
      </CardBody>
    </Card>
  );
}
