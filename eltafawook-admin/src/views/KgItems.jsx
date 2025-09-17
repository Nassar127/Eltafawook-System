import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { apiFetch } from '../api';
import { centsFromEGP, money } from '../utils/helpers';
import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select } from '../components/Form';
import { Helper, SubTabs, SubTabButton, Pill, } from '../components/Misc';
import { useTranslation, Trans } from "react-i18next";
import { InventoryGrid, InventoryItem, ItemName, StockCount, ItemMeta } from '../components/Table';

export default function KgItems({ apiBase, authToken, toast, branchId, kgItems, setKgItems, currentUser }) {
    const [tab, setTab] = useState("inventory");
    const [createForm, setCreateForm] = useState({ name: "", price_egp: "", item_type: "service" });
    const [receiveForm, setReceiveForm] = useState({ kg_item_id: "", qty: 1 });
    const { t, i18n } = useTranslation();
    const [inventory, setInventory] = useState([]);
    const [loadingInv, setLoadingInv] = useState(false);
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

    const loadInventory = async () => {
        if (!branchId) return;
        setLoadingInv(true);
        try {
            const itemsToStock = kgItems.filter(i => i.item_type === 'good');
            const stockData = await Promise.all(
                itemsToStock.map(async (item) => {
                    try {
                        const stock = await apiFetch(apiBase, `/kg-inventory/summary?branch_id=${branchId}&kg_item_id=${item.id}`, { authToken });
                        return { ...item, on_hand: stock.on_hand };
                    } catch (e) {
                        return { ...item, on_hand: 0 };
                    }
                })
            );
            setInventory(stockData);
        } catch (e) {
            toast.push({ title: "Failed to load inventory", description: e.message, tone: "error" });
        } finally {
            setLoadingInv(false);
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
                    {currentUser?.role === 'admin' && (
                        <SubTabButton $active={tab === 'create'} onClick={() => setTab('create')}>
                            {t("tabs_kg_reports.create")}
                        </SubTabButton>
                    )}
                    <SubTabButton $active={tab === 'receive'} onClick={() => setTab('receive')}>
                        {t("tabs_kg_reports.receive")}
                    </SubTabButton>
                    <SubTabButton $active={tab === 'inventory'} onClick={() => { setTab('inventory'); loadInventory(); }}>
                        {t("tabs_kg_reports.inventory")}
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
                                        i18nKey={t("create_kg_reports.sku_helper")}
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
                                    <option value="morning_service">{t("create_kg_reports.item_type_options.morning_service")}</option>
                                    <option value="evening_service">{t("create_kg_reports.item_type_options.evening_service")}</option>
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

                {tab === 'inventory' && (
                    <div>
                        <Button onClick={loadInventory} disabled={loadingInv} style={{marginBottom: '16px'}}>
                            {loadingInv ? t('inventory_kg_reports.loading'): t('inventory_kg_reports.refresh_inventory')}
                        </Button>
                        <Helper>{t('inventory_kg_reports.helper_message')}</Helper>
                        
                        <InventoryGrid>
                            {inventory.map(item => (
                                <InventoryItem key={item.id}>
                                    <ItemName>{item.name}</ItemName>
                                    <StockCount>{item.on_hand}</StockCount>
                                    <ItemMeta>{t('inventory_kg_reports.in_stock')}</ItemMeta>
                                </InventoryItem>
                            ))}
                        </InventoryGrid>
                    </div>
                )}
            </CardBody>
        </Card>
    );
}