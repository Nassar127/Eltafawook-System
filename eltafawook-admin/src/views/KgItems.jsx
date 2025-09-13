import React, { useState, useMemo } from "react";
import { apiFetch } from '../api';
import { centsFromEGP, money } from '../utils/helpers';
import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select } from '../components/Form';
import { Helper, SubTabs, SubTabButton, Pill } from '../components/Misc';
import { useTranslation, Trans } from "react-i18next";

export default function KgItems({ apiBase, authToken, toast, branchId, kgItems, setKgItems }) {
    const [tab, setTab] = useState("create");
    const [createForm, setCreateForm] = useState({ name: "", price_egp: "", item_type: "service" });
    const [receiveForm, setReceiveForm] = useState({ kg_item_id: "", qty: 1 });
    const { t, i18n } = useTranslation();
    const physicalItems = useMemo(() => kgItems.filter(i => i.item_type === 'good'), [kgItems]);

    const handleCreateItem = async () => {
        const itemName = createForm.name.trim();
        if (!itemName || !createForm.price_egp) {
            toast.push({ title: t("toasts_kg_reports.name_price_required"), tone: "error" });
            return;
        }

        const generatedSku = itemName.replace(/\s+/g, '_').toUpperCase();

        try {
            const payload = {
                name: itemName,
                sku: generatedSku,
                item_type: createForm.item_type,
                branch_id: branchId,
                default_price_cents: centsFromEGP(createForm.price_egp),
            };
            const newItem = await apiFetch(apiBase, "/kg-items", { method: "POST", body: payload, authToken });
            setKgItems(prev => [newItem, ...prev]);
            toast.push({ title: t("toasts_kg_reports.created"), description: t("toasts_kg_reports.created_desc", { name: newItem.name }), tone: "success" });
            setCreateForm({ name: "", price_egp: "", item_type: "service" });
        } catch (e) {
            toast.push({ title: t("toasts_kg_reports.creation_failed"), description: t("toasts_kg_reports.error_desc", { message: e.message }), tone: "error" });
        }
    };

    const handleReceiveStock = async () => {
        if (!receiveForm.kg_item_id || receiveForm.qty <= 0) {
            toast.push({ title: t("toasts_kg_reports.select_and_qty"), tone: "error" });
            return;
        }
        try {
            const payload = { ...receiveForm, branch_id: branchId };
            await apiFetch(apiBase, "/kg-inventory/receive", { method: "POST", body: payload, authToken });
            toast.push({ title: t("toasts_kg_reports.stock_received"), description: t("toasts_kg_reports.stock_received_desc", { qty: receiveForm.qty }), tone: "success" });
            setReceiveForm({ kg_item_id: "", qty: 1 });
        } catch (e) {
            toast.push({ title: t("toasts_kg_reports.receive_failed"), description: t("toasts_kg_reports.error_desc", { message: e.message }), tone: "error" });
        }
    };

    return (
        <Card>
            <CardHead><CardTitle>{t("title_kg_reports")}</CardTitle></CardHead>
            <CardBody>
                <SubTabs>
                <SubTabButton $active={tab === 'create'} onClick={() => setTab('create')}>
                    {t("tabs_kg_reports.create")}
                </SubTabButton>
                <SubTabButton $active={tab === 'receive'} onClick={() => setTab('receive')}>
                    {t("tabs_kg_reports.receive")}
                </SubTabButton>
                </SubTabs>

                {tab === 'create' && (
                    <>
                        <Row cols={2}>
                            <div>
                                <Label>{t("create_kg_reports.item_name")}</Label>
                                <Input placeholder={t("create_kg_reports.item_name_ph")} value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                                <Helper>
                                    <Trans
                                        i18nKey="create_kg_reports.sku_helper"
                                        ns="kgItems"
                                        values={{ sku: createForm.name.trim().replace(/\s+/g, "_").toUpperCase() || "..." }}
                                        components={{ 0: <Pill /> }}
                                    />
                                    </Helper>
                            </div>
                            <div>
                                <Label>{t("create_kg_reports.price")}</Label>
                                <Input type="number" placeholder={t("create_kg_reports.price_ph")} value={createForm.price_egp} onChange={e => setCreateForm({...createForm, price_egp: e.target.value})} />
                            </div>
                            <div>
                                <Label>{t("create_kg_reports.item_type")}</Label>
                                    <Select
                                    value={createForm.item_type}
                                    onChange={e => setCreateForm({ ...createForm, item_type: e.target.value })}
                                    >
                                    <option value="service">{t("create_kg_reports.item_type_options.service")}</option>
                                    <option value="good">{t("create_kg_reports.item_type_options.good")}</option>
                                    </Select>
                            </div>
                        </Row>
                        <Button onClick={handleCreateItem} style={{marginTop: '12px'}}>{t("create_kg_reports.create_btn")}</Button>
                    </>
                )}

                {tab === 'receive' && (
                     <>
                        <Row cols={2}>
                            <div>
                                <Label>{t("receive_kg_reports.item_to_receive")}</Label>
                                <Select
                                    value={receiveForm.kg_item_id}
                                    onChange={e => setReceiveForm({ ...receiveForm, kg_item_id: e.target.value })}
                                    >
                                    <option value="">{t("receive_kg_reports.item_ph")}</option>
                                    {physicalItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </Select>
                                <Helper>{t("receive_kg_reports.helper_physical_only")}</Helper>
                            </div>
                             <div>
                                <Label>{t("receive_kg_reports.qty_received")}</Label>
                                <Input type="number" min="1" value={receiveForm.qty} onChange={e => setReceiveForm({...receiveForm, qty: Number(e.target.value)})} />
                            </div>
                        </Row>
                        <Button onClick={handleReceiveStock} style={{marginTop: '12px'}}>{t("receive_kg_reports.receive_btn")}</Button>
                    </>
                )}
            </CardBody>
        </Card>
    );
}