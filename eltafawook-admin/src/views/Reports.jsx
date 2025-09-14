import React, { useEffect, useState } from "react";
import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select } from '../components/Form';
import { Helper, SubTabs, SubTabButton } from '../components/Misc';
import { TableWrap, Table } from '../components/Table';
import { apiFetch } from '../api';
import { money, centsFromEGP } from '../utils/helpers';
import { startOfIsoWeek, endOfIsoWeek } from '../utils/dates';
import { useTranslation } from "react-i18next";

const getTodayLocal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function KgReports({ apiBase, authToken, toast, branchId, currentUser }) {
    const [tab, setTab] = useState("summary");
    const [loading, setLoading] = useState(false);
    const [reportMode, setReportMode] = useState("day");
    const [reportDay, setReportDay] = useState(getTodayLocal);
    const [reportWeekAnchor, setReportWeekAnchor] = useState(getTodayLocal);
    const [summaryData, setSummaryData] = useState(null);
    const [adjAmount, setAdjAmount] = useState("");
    const [adjReason, setAdjReason] = useState("");
    const [adjustments, setAdjustments] = useState([]);
    const [detailedData, setDetailedData] = useState(null);
    const { t } = useTranslation("kgReports");

    const getReportDateRange = () => {
        const fmt = dd => `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
        if (reportMode === "day") {
            return { startDate: reportDay, endDate: reportDay };
        } else {
            const start = startOfIsoWeek(reportWeekAnchor);
            const end = endOfIsoWeek(reportWeekAnchor);
            end.setDate(end.getDate() - 1);
            return { startDate: fmt(start), endDate: fmt(end) };
        }
    };

    const fetchSummaryData = async () => {
        if (!branchId) return;
        setLoading(true);
        try {
            const { startDate, endDate } = getReportDateRange();
            const [sales, adjustmentsData] = await Promise.all([
                apiFetch(apiBase, `/kg-reports/daily-sales?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`, { authToken }),
                apiFetch(apiBase, `/adjustments/revenue?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}&context=kindergarten`, { authToken })
            ]);
            setSummaryData(sales);
            setAdjustments(adjustmentsData || []);
        } catch (e) {
            toast.push({ title: t("toasts_kg_items.summary_failed_title"), description: t("toasts_kg_items.error_desc", { message: e.message }), tone: "error" });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
    if (tab === 'summary' && branchId) {
        fetchSummaryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportDay, reportWeekAnchor, reportMode, tab, branchId]);

    const handleCreateAdjustment = async (multiplier) => {
        const amount = centsFromEGP(adjAmount) * multiplier;
        if (amount === 0 || !adjReason.trim()) {
            toast.push({ title: t("toasts_kg_items.invalid_adj_title"), description: t("toasts_kg_items.invalid_adj_desc"), tone: "error"});
            return;
        }
        try {
            await apiFetch(apiBase, "/adjustments/revenue", {
                method: "POST",
                body: {
                    branch_id: branchId,
                    context: 'kindergarten',
                    adjustment_date: reportDay,
                    amount_cents: amount,
                    reason: adjReason,
                    created_by: currentUser?.sub || 'unknown',
                },
                authToken
            });
            toast.push({ title: t("toasts_kg_items.adj_saved_title"), tone: "success" });
            setAdjAmount("");
            setAdjReason("");
            fetchSummaryData();
        } catch (e) {
            toast.push({ title: t("toasts_kg_items.save_adj_failed_title"), description: t("toasts_kg_items.error_desc", { message: e.message }), tone: "error" });
        }
    };

    const handleGenerateDetailedReport = async () => {
        if (!branchId) return;
        setLoading(true);
        setDetailedData(null);
        try {
            const { startDate, endDate } = getReportDateRange();
            const data = await apiFetch(apiBase, `/kg-reports/detailed-sales?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`, { authToken });
            setDetailedData(data);
        } catch (e) {
            toast.push({ title: t("toasts_kg_items.detailed_failed_title"), description: t("toasts_kg_items.error_desc", { message: e.message }), tone: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHead><CardTitle>{t("title")}</CardTitle></CardHead>
            <CardBody>
                <SubTabs>
                <SubTabButton $active={tab === 'summary'} onClick={() => setTab('summary')}>
                    {t("tabs.summary")}
                </SubTabButton>
                <SubTabButton $active={tab === 'detailed'} onClick={() => setTab('detailed')}>
                    {t("tabs.detailed")}
                </SubTabButton>
                </SubTabs>
                
                <CardTitle style={{fontSize:16, marginBottom:8, marginTop:16}}>{t("period.title")}</CardTitle>
                <Row cols={4}>
                    <div>
                        <Label>{t("period.mode")}</Label>
                        <Select value={reportMode} onChange={(e) => setReportMode(e.target.value)}>
                            <option value="day">{t("period.mode_day")}</option>
                            <option value="week">{t("period.mode_week")}</option>
                        </Select>
                    </div>
                    {reportMode === "day" ? (
                        <div>
                            <Label>{t("period.select_day")}</Label>
                            <Input type="date" value={reportDay} onChange={(e)=>setReportDay(e.target.value)} />
                        </div>
                    ) : (
                        <div>
                            <Label>{t("period.pick_any_day_in_week")}</Label>
                            <Input type="date" value={reportWeekAnchor} onChange={(e)=>setReportWeekAnchor(e.target.value)} />
                        </div>
                    )}
                </Row>

                <hr style={{border:0, borderTop:`1px solid var(--border)`, margin:"24px 0 16px"}} />

                {tab === 'summary' && (
                    <>
                        <CardTitle style={{fontSize:16, marginBottom:8}}>{t("adjustments.title")}</CardTitle>
                        <Row cols={4}>
                            <div>
                                <Label>{t("adjustments.amount_label")}</Label>
                                <Input type="number" placeholder={t("adjustments.amount_ph")} value={adjAmount} onChange={e => setAdjAmount(e.target.value)} />
                            </div>
                            <div style={{gridColumn: "span 2"}}>
                                <Label>{t("adjustments.reason_label")}</Label>
                                <Input placeholder={t("adjustments.reason_ph")} value={adjReason} onChange={e => setAdjReason(e.target.value)} />
                            </div>
                            <div style={{display:"flex", alignItems:"end", gap:8}}>
                                <Button onClick={() => handleCreateAdjustment(1)}>{t("adjustments.add")}</Button>
                                <Button $variant="danger" onClick={() => handleCreateAdjustment(-1)}>{t("adjustments.subtract")}</Button>
                            </div>
                        </Row>
                        
                        {adjustments.length > 0 && (
                            <TableWrap style={{marginTop: 16, maxHeight: 150}}>
                                <Table>
                                    <thead><tr><th>{t("adjustments.table.time")}</th><th>{t("adjustments.table.amount")}</th><th>{t("adjustments.table.reason")}</th></tr></thead>
                                    <tbody>
                                        {adjustments.map(adj => (
                                            <tr key={adj.id}>
                                                <td>{new Date(adj.created_at).toLocaleTimeString()}</td>
                                                <td style={{color: adj.amount_cents < 0 ? 'var(--danger)' : '#059669'}}>{money(adj.amount_cents)}</td>
                                                <td>{adj.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </TableWrap>
                        )}

                        <CardTitle style={{fontSize:16, marginBottom:8, marginTop: 24}}>
                            {t("summary.title")}
                            <Button onClick={fetchSummaryData} disabled={loading} style={{marginLeft: 12, padding: '4px 10px', fontSize: 12}}>
                                {loading ? "..." : t("summary.refresh")}
                            </Button>
                        </CardTitle>

                        {loading && <p>{t("summary.loading")}</p>}
                        {summaryData && !loading && (
                            <Row cols={4} style={{marginTop: 16}}>
                                <StatBox label={t("stats.gross")} value={money(summaryData.sales_total_cents)} />
                                <StatBox label={t("stats.adjustments")} value={money(summaryData.adjustments_total_cents)} positive={summaryData.adjustments_total_cents > 0} negative={summaryData.adjustments_total_cents < 0} />
                                <StatBox label={t("stats.net")} value={money(summaryData.net_total_cents)} isTotal />
                                <StatBox label={t("stats.transactions")} value={summaryData.sales_count} />
                            </Row>
                        )}
                    </>
                )}

                {tab === 'detailed' && (
                     <>
                        <CardTitle style={{fontSize:16, marginBottom:8}}>{t('detailed.title')}</CardTitle>
                        <div style={{display:"flex", alignItems:"end"}}>
                             <Button onClick={handleGenerateDetailedReport} disabled={loading}>{loading ? t('detailed.loading') : t('detailed.generate')}</Button>
                        </div>

                        {detailedData && (
                            <TableWrap style={{marginTop: 16}}>
                                <Table>
                                    <thead><tr><th>{t('detailed.table.teacher')}</th><th>{t('detailed.table.item_grade')}</th><th>{t('detailed.table.payment_method')}</th><th>{t('detailed.table.qty')}</th><th>{t('detailed.table.total_egp')}</th></tr></thead>
                                    <tbody>
                                        {detailedData.rows.map((row, i) => (
                                            <tr key={i}>
                                                <td>{row.teacher_name}</td>
                                                <td>{t('detailed.table.item_with_grade', { item: row.item_name, grade: row.item_grade })}</td>
                                                <td style={{textTransform:"capitalize"}}>{row.payment_method.replace('_', ' ')}</td>
                                                <td>{row.total_qty}</td>
                                                <td>{money(row.total_amount_cents)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </TableWrap>
                        )}
                     </>
                )}
            </CardBody>
        </Card>
    )
}
const StatBox = ({ label, value, isTotal, positive, negative }) => (
    <div style={{border:"1px solid var(--border)", borderRadius:12, padding:12, background: isTotal ? 'var(--bg)' : 'var(--card)'}}>
        <div style={{fontSize:12, color:"var(--muted)"}}>{label}</div>
        <div style={{ fontWeight: isTotal ? 800 : 700, fontSize: 22, color: negative ? 'var(--danger)' : (positive ? '#059669' : 'var(--text)') }}>{value}</div>
    </div>
);