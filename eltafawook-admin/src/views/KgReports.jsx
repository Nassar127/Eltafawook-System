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

const formatDateTime = (dateStr, lang) => {
    const d = new Date(dateStr);
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(d);
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
    const [subscriptions, setSubscriptions] = useState([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [subsSearchTerm, setSubsSearchTerm] = useState("");
    const { t, i18n } = useTranslation("kgReports");

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

    const fetchSubscriptions = async () => {
        if (!branchId) return;
        setLoadingSubs(true);
        try {
            let url = `/kg-reports/subscriptions?branch_id=${branchId}`;
            if (subsSearchTerm.trim()) {
                url += `&search=${encodeURIComponent(subsSearchTerm.trim())}`;
            }
            const data = await apiFetch(apiBase, url, { authToken });
            setSubscriptions(data.rows || []);
        } catch (e) {
            toast.push({ title: "Failed to load subscriptions", description: e.message, tone: "error" });
        } finally {
            setLoadingSubs(false);
        }
    };
    
    useEffect(() => {
        if (tab === 'subscriptions') {
            fetchSubscriptions();
        }
    }, [tab]);

    return (
        <Card>
            <CardHead><CardTitle>{t("title_kg_items")}</CardTitle></CardHead>
            <CardBody>
                <SubTabs>
                <SubTabButton $active={tab === 'summary'} onClick={() => setTab('summary')}>
                    {t("tabs_kg_items.summary")}
                </SubTabButton>
                <SubTabButton $active={tab === 'detailed'} onClick={() => setTab('detailed')}>
                    {t("tabs_kg_items.detailed")}
                </SubTabButton>
                <SubTabButton $active={tab === 'subscriptions'} onClick={() => setTab('subscriptions')}>
                    {t("tabs_kg_items.subscription")}
                </SubTabButton>
                </SubTabs>
                
                <CardTitle style={{fontSize:16, marginBottom:8, marginTop:16}}>{t("period_kg_items.title")}</CardTitle>
                <Row cols={4}>
                    <div>
                        <Label>{t("period_kg_items.mode")}</Label>
                        <Select value={reportMode} onChange={(e) => setReportMode(e.target.value)}>
                        <option value="day">{t("period_kg_items.mode_day")}</option>
                        <option value="week">{t("period_kg_items.mode_week")}</option>
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
                                <StatBox label={t("stats.gross_cash")} value={money(summaryData.sales_total_cents)} />
                                <StatBox label={t("stats.adjustments")} value={money(summaryData.adjustments_total_cents)} positive={summaryData.adjustments_total_cents > 0} negative={summaryData.adjustments_total_cents < 0} />
                                <StatBox label={t("stats.net")} value={money(summaryData.net_total_cents)} isTotal />
                                <StatBox label={t("stats.transactions")} value={summaryData.sales_count} />
                            </Row>
                        )}
                    </>
                )}

                {tab === 'detailed' && (
                    <>
                        <CardTitle style={{fontSize:16, marginBottom:8}}>{t("detailed.title")}</CardTitle>
                        <div style={{display:"flex", alignItems:"end"}}>
                            <Button onClick={handleGenerateDetailedReport} disabled={loading}>{loading ? t("detailed.loading") : t("detailed.generate")}</Button>
                        </div>
                        {detailedData && (
                            <TableWrap style={{marginTop: 16}}>
                                <Table>
                                    <thead><tr><th>{t("detailed_kg_items.table.item")}</th><th>{t("detailed_kg_items.table.qty")}</th><th>{t("detailed_kg_items.table.total_egp")}</th></tr></thead>
                                    <tbody>
                                        {detailedData.rows.map((row, i) => (
                                            <tr key={i}>
                                                <td>{row.item_name}</td>
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

                {tab === 'subscriptions' && (
                    <>
                        <Row cols={3} style={{marginTop: '16px'}}>
                            <div style={{gridColumn: 'span 2'}}>
                                <Label>{t('subscriptions_kg_items.search_statment')}</Label>
                                <Input 
                                    value={subsSearchTerm}
                                    onChange={(e) => setSubsSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchSubscriptions()}
                                    placeholder={t('subscriptions_kg_items.type_search')}
                                />
                            </div>
                            <div style={{display: 'flex', alignItems: 'end'}}>
                                <Button onClick={fetchSubscriptions} disabled={loadingSubs}>
                                    {loadingSubs ? t('subscriptions_kg_items.searching') : t('subscriptions_kg_items.search')}
                                </Button>
                            </div>
                        </Row>

                        <TableWrap style={{marginTop: '16px'}}>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>{t('subscriptions_kg_items.name')}</th>
                                        <th>{t('subscriptions_kg_items.parent_phone')}</th>
                                        <th>{t('subscriptions_kg_items.last_payment')}</th>
                                        <th>{t('subscriptions_kg_items.next_payment')}</th>
                                        <th>{t('subscriptions_kg_items.last_plan')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscriptions.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.student_name}</td>
                                            <td>{row.parent_phone || 'N/A'}</td>
                                            <td>{formatDateTime(row.last_payment_date, i18n.language)}</td>
                                            <td>{new Date(row.next_payment_date).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-CA')}</td>
                                            <td>{row.last_used_plan}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </TableWrap>
                        {subscriptions.length === 0 && !loadingSubs && <Helper>{t('subscriptions_kg_items.no_sub')}</Helper>}
                    </>
                )}
            </CardBody>
        </Card>
    )
}

const StatBox = ({ label, value, isTotal, positive, negative }) => (
    <div style={{border:"1px solid var(--border)", borderRadius:12, padding:12, background: isTotal ? 'var(--bg)' : 'var(--card)'}}>
        <div style={{fontSize:12, color:"#64748b"}}>{label}</div>
        <div style={{ fontWeight: isTotal ? 800 : 700, fontSize: 22, color: negative ? 'var(--danger)' : (positive ? '#059669' : 'inherit') }}>{value}</div>
    </div>
);