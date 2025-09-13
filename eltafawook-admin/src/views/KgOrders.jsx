import React, { useState, useMemo } from "react";
import styled from 'styled-components';
import { apiFetch, apiSearchKgStudent } from '../api';
import { money } from '../utils/helpers';
import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select } from '../components/Form';
import { Helper, Pill } from '../components/Misc';
import { Table, TableWrap } from "../components/Table";
import { useTranslation } from "react-i18next";

const CartActionButton = styled.button`
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    font-weight: bold;
    cursor: pointer;
    border-radius: 6px;
    width: 24px;
    height: 24px;
    line-height: 22px;
    text-align: center;
    &:hover {
        background: #e2e8f0;
    }
`;

export default function KgOrders({ apiBase, authToken, toast, branchId, kgItems }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [cart, setCart] = useState([]);
    const { t, i18n } = useTranslation();
    
    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setSearchLoading(true);
        try {
            const results = await apiSearchKgStudent(apiBase, { term: searchTerm, branchId, authToken });
            setSearchResults(results);
            if(results.length === 0) toast.push({ title: t("toasts_kg_orders.no_students") });
        } catch(e) {
            toast.push({ title: t("toasts_kg_orders.search_failed"), description: e.message, tone: "error" });
        } finally {
            setSearchLoading(false);
        }
    };

    const addToCart = (item) => {
        setCart(prevCart => {
            const existing = prevCart.find(i => i.kg_item_id === item.id);
            if (existing) {
                return prevCart.map(i => i.kg_item_id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...prevCart, { kg_item_id: item.id, name: item.name, qty: 1, unit_price_cents: item.default_price_cents }];
        });
    };
    
    const removeFromCart = (itemId) => {
        setCart(prevCart => {
            const existing = prevCart.find(i => i.kg_item_id === itemId);
            if (existing && existing.qty > 1) {
                return prevCart.map(i => i.kg_item_id === itemId ? { ...i, qty: i.qty - 1 } : i);
            }
            return prevCart.filter(i => i.kg_item_id !== itemId);
        });
    };
    
    const deleteFromCart = (itemId) => {
        setCart(prevCart => prevCart.filter(i => i.kg_item_id !== itemId));
    };

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.unit_price_cents * item.qty), 0), [cart]);

    const handlePurchase = async () => {
        if (cart.length === 0) return;
        try {
            const payload = {
                branch_id: branchId,
                kg_student_id: selectedStudent.id,
                lines: cart.map(({ kg_item_id, qty }) => ({ kg_item_id, qty })),
            };
            await apiFetch(apiBase, "/kg-sales", { method: "POST", body: payload, authToken });
            toast.push({ title: t("toasts_kg_orders.purchase_complete"), description: t("order.total_with_currency", { amount: money(cartTotal), currency: t("order.currency") }), tone: "success" });
            setCart([]);
            setSelectedStudent(null);
            setSearchTerm("");
            setSearchResults([]);
        } catch (e) {
            toast.push({ title: t("toasts_kg_orders.purchase_failed"), description: e.message, tone: "error" });
        }
    };

    if (selectedStudent) {
        return (
            <Card>
                <CardHead>
                <CardTitle>{t("order.new_for", { name: selectedStudent.full_name })}</CardTitle>
                <Button $variant="ghost" onClick={() => setSelectedStudent(null)}>
                    {t("order.change_student")}
                </Button>
                </CardHead>
                <CardBody style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px'}}>
                    <div>
                        <Label>{t("order.available_items")}</Label>
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px'}}>
                            {kgItems.map(item => (
                                <button key={item.id} onClick={() => addToCart(item)} style={{padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'left', cursor: 'pointer'}}>
                                    <div style={{fontWeight: '600'}}>{item.name}</div>
                                    <div style={{fontSize: '14px', color: '#475569'}}>{t("order.price_with_currency", { amount: money(item.default_price_cents), currency: t("order.currency") })}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label>{t("order.cart")}</Label>
                        {cart.length === 0 ? <Helper>{t("order.cart_empty")}</Helper> : (
                            <TableWrap style={{maxHeight: 'none'}}>
                                <Table>
                                    <thead><tr><th>{t("order.table.item")}</th><th>{t("order.table.qty")}</th><th>{t("order.table.price")}</th><th></th></tr></thead>
                                    <tbody>
                                        {cart.map(item => (
                                            <tr key={item.kg_item_id}>
                                                <td>{item.name}</td>
                                                <td style={{textAlign: 'center', whiteSpace: 'nowrap'}}>
                                                    <CartActionButton onClick={() => removeFromCart(item.kg_item_id)}>-</CartActionButton>
                                                    <span style={{margin: '0 8px'}}>{item.qty}</span>
                                                    <CartActionButton onClick={() => addToCart({id: item.kg_item_id, ...item})}>+</CartActionButton>
                                                </td>
                                                <td>{t("order.price_with_currency", { amount: money(item.unit_price_cents * item.qty), currency: t("order.currency") })}</td>
                                                <td>
                                                    <CartActionButton style={{borderColor: '#fecaca', background: '#fef2f2', color: '#dc2626'}} onClick={() => deleteFromCart(item.kg_item_id)}>✕</CartActionButton>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </TableWrap>
                        )}
                        <hr style={{margin: '16px 0'}}/>
                        <div style={{fontWeight: 'bold', fontSize: '18px', textAlign: 'right'}}>{t("order.total_with_currency", { amount: money(cartTotal), currency: t("order.currency") })}</div>
                        <Button onClick={handlePurchase} disabled={cart.length === 0} style={{width: '100%', marginTop: '12px'}}>{t("order.complete_cash")}</Button>
                    </div>
                </CardBody>
            </Card>
        )
    }

    return (
        <Card>
            <CardHead><CardTitle>{t("title_kg_orders")}</CardTitle></CardHead>
            <CardBody>
                <Label>{t("steps.find")}</Label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                    <Input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder={t("search_kg_orders.ph")}
                    />
                    <Button onClick={handleSearch} disabled={searchLoading}>
                        {searchLoading ? t("search_kg_orders.loading") : t("search_kg_orders.btn")}
                    </Button>
                    </div>
                {searchResults.length > 0 && (
                    <div style={{marginTop: '16px'}}>
                        <Label>{t("steps.select")}</Label>
                        {searchResults.map(student => (
                            <button key={student.id} onClick={() => setSelectedStudent(student)} style={{display: 'block', width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', marginBottom: '8px'}}>
                                <span style={{fontWeight: '600'}}>{student.full_name}</span> - <span style={{fontSize: '13px', color: '#64748b'}}>{t("student.father", { name: student.father_name })}</span>
                            </button>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}