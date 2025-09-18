import { useMemo, useState } from "react";
import { apiFetch } from '../api';
import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Row, Label, Input, Select, Textarea, ToggleWrap } from '../components/Form';
import { Helper, Pill, SubTabs, SubTabButton } from '../components/Misc';
import { TableWrap, Table } from '../components/Table';
import { moneyEGPfromCents, centsFromEGP, fullItemName } from '../utils/helpers';
import { useTranslation, Trans } from "react-i18next";

export default function Items({ apiBase, authToken, toast, branchId, branchCode, teachers, setTeachers, items, setItems, itemById, teacherById, currentUser }) {
    const [itemsTab, setItemsTab] = useState("inventory");
    const [createForm, setCreateForm] = useState({teacher_id: "", resource_type: "Book", item_name: "", grade: 3, price_egp: "", profit_egp: ""});
    const [receive2, setReceive2] = useState({teacher_id: "", item_id: "", qty: 1,});
    const [invFilterTeacher, setInvFilterTeacher] = useState("");
    const [invFilterText, setInvFilterText] = useState("");
    const [invShowZero, setInvShowZero] = useState(false);
    const [invRows, setInvRows] = useState([]);
    const [invLoading, setInvLoading] = useState(false);
    const receiveItems = useMemo(()=>{const tid = receive2.teacher_id;
        return (items||[]).filter(i => !tid || i.teacher_id === tid);
    }, [items, receive2.teacher_id]);
    const { t } = useTranslation("items");

    async function firstTimeAdd() {
        if (!createForm.teacher_id) {
        toast.push({ title: t("toasts_items.teacher_required"), tone: "error" });
        return;
        }
        if (!createForm.item_name.trim()) {
        toast.push({ title: t("toasts_items.item_name_required"), tone: "error" });
        return;
        }
        const nameFull = fullItemName(createForm.resource_type, createForm.item_name);
        const body = {
        sku: nameFull.toUpperCase(),
        name: nameFull,
        description: "",
        resource_type: createForm.resource_type.toLowerCase(),
        grade: Number(createForm.grade || 3),
        teacher_id: createForm.teacher_id,
        default_price_cents: centsFromEGP(createForm.price_egp || 0),
        profit_cents: centsFromEGP(createForm.profit_egp || 0),
        };

        try {
        const it = await apiFetch(apiBase, "/items", {method: "POST", body, authToken,});
        setItems((xs)=>[it, ...xs.filter(x=>x.id!==it.id)]);
        toast.push({ title: t("toasts_items.resource_created"), description: t("toasts_items.resource_created_desc", { sku: it.sku, name: it.name }) });
        setCreateForm({
            teacher_id: "",
            resource_type: "Book",
            item_name: "",
            grade: 3,
            price_egp: "",
            profit_egp: "" 
        });
        } catch (e) {
        if (/exists|duplicate|already/i.test(e.message) && body.sku) {
            try {
            const it = await apiFetch(apiBase, `/items/${encodeURIComponent(body.sku)}`);
            setItems((xs)=>[it, ...xs.filter(x=>x.id!==it.id)]);
            toast.push({ title: t("toasts_items.fetched_existing"), description: t("toasts_items.fetched_existing_desc", { sku: it.sku }) });
            } catch (e2) { toast.push({ title: t("toasts_items.create_get_failed"), description: t("toasts_items.error_desc", { message: e2.message }), tone: "error" }); }
        } else {
            toast.push({ title: t("toasts_items.create_item_failed"), description: t("toasts_items.error_desc", { message: e.message }), tone: "error" });
        }
        }
    }

    async function receiveStock2() {
        if (!receive2.item_id) { toast.push({ title: t("toasts_items.pick_item"), tone: "error" }); return; }
        const qty = Number(receive2.qty||0);
        if (qty <= 0) { toast.push({ title: t("toasts_items.qty_gt_zero"), tone: "error" }); return; }
        try {
        const body = { branch_id: branchId, item_id: receive2.item_id, qty };
        const inv = await apiFetch(apiBase, "/adjustments/receive", { method: "POST", body, authToken });
        toast.push({ title: t("toasts_items.stock_received"), description: t("toasts_items.stock_received_desc", { onHand: inv.on_hand, available: inv.available })});
        if (itemsTab === "inventory") loadInventoryGrid();
        } catch (e) { toast.push({ title: t("toasts_items.receive_failed"), description: t("toasts_items.error_desc", { message: e.message }), tone: "error" }); }
    }

  async function loadInventoryGrid() {
    setInvLoading(true);
    try {
      const pool = (items||[]).filter(it => {
          const teacherOk = !invFilterTeacher || it.teacher_id === invFilterTeacher;
          const text = invFilterText.trim().toLowerCase();
          const textOk = !text || (it.name||"").toLowerCase().includes(text) || (it.sku||"").toLowerCase().includes(text);
          return teacherOk && textOk;
      });

      const rows = [];
      for (const it of pool) {
          if (!it.teacher_id) {
            continue;
          }

          let qty = 0;
          try {
              const url = `/inventory/summary-by-code?branch_code=${encodeURIComponent(branchCode)}&sku=${encodeURIComponent(it.sku)}&teacher_id=${encodeURIComponent(it.teacher_id)}&grade=${encodeURIComponent(it.grade)}`;
              const row = await apiFetch(apiBase, url, { authToken });
              qty = Number(row?.available ?? row?.on_hand ?? 0);
          } catch (e) {console.error(`Failed to load inventory for SKU ${it.sku}:`, e);}
          
          rows.push({
              teacher: teacherById[it.teacher_id]?.name || "—",
              resource: `${it.name || it.sku} (Grade ${it.grade})`,
              qty,
              price: moneyEGPfromCents(it.default_price_cents || 0),
              _item: it,
          });
      }

      setInvRows(invShowZero ? rows : rows.filter(r => r.qty > 0));
    } catch (e) {
      toast.push({ title: t("toasts_items.inv_load_failed"), description: t("toasts_items.error_desc", { message: e.message }), tone: "error" });
    } finally {
      setInvLoading(false);
    }
  }

    return (
        <Card>
        <CardHead><CardTitle>{t("title_items")}</CardTitle></CardHead>
        <CardBody>
        <SubTabs>
        {currentUser?.role === 'admin' && (
            <SubTabButton $active={itemsTab==="create"} onClick={()=>{
            setItemsTab("create");
            setCreateForm({ teacher_id: "", resource_type: "book", grade: 3, item_name: "", price_egp: "" });
            }}>
                {t("tabs_items.create")}
            </SubTabButton>
        )}
        <SubTabButton $active={itemsTab==="receive"} onClick={()=>setItemsTab("receive")}>
            {t("tabs_items.receive")}
        </SubTabButton>
        <SubTabButton $active={itemsTab==="inventory"} onClick={()=>{ setItemsTab("inventory"); loadInventoryGrid(); }}>
            {t("tabs_items.inventory")}
        </SubTabButton>
        </SubTabs>

        {itemsTab === "create" && currentUser?.role === 'admin' && (
            <>

                <Row cols={3} style={{marginTop:8}}>
                <div>
                    <Label>{t("create.teacher")}</Label>
                    <Select
                    value={createForm.teacher_id}
                    onChange={(e)=>setCreateForm({...createForm, teacher_id: e.target.value})}
                    >
                    <option value="">{t("create.teacher_ph")}</option>
                    {teachers.map(tch => <option key={tch.id} value={tch.id}>{tch.name}</option>)}
                    </Select>
                </div>

                <div>
                <Label>{t("create.resource_type")}</Label>
                <Select
                value={createForm.resource_type}
                onChange={(e)=>setCreateForm({...createForm, resource_type: e.target.value})}
                >
                <option>{t("create.resource_type_options.book")}</option>
                <option>{t("create.resource_type_options.code")}</option>
                <option>{t("create.resource_type_options.other")}</option>
                </Select>
                <Helper>
                <Trans
                    i18nKey="create.helper_displayed_as"
                    ns="items"
                    values={{ typeGrade: "Type (Grade)", example: "Book (3)" }}
                    components={{ 0: <Pill /> }}
                />
                </Helper>
                </div>

                <div>
                    <Label>{t("create.grade")}</Label>
                    <Select
                    value={createForm.grade}
                    onChange={(e)=>setCreateForm({...createForm, grade: Number(e.target.value)})}
                    >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    </Select>
                </div>
                </Row>

                <Row cols={3}>
                <div>
                    <Label>{t("create.item_name")}</Label>
                    <Input
                    placeholder={t("create.item_name_ph")}
                    value={createForm.item_name}
                    onChange={(e)=>setCreateForm({...createForm, item_name: e.target.value})}
                    />
                <Helper>
                <Trans
                    i18nKey="create.helper_saved_as"
                    ns="items"
                    values={{ fullName: fullItemName(createForm.resource_type, createForm.item_name) || "—" }}
                    components={{ 0: <Pill /> }}
                />
                </Helper>
                </div>

                <div>
                    <Label>{t("create.price")}</Label>
                    <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t("create.price_ph")}
                    value={createForm.price_egp}
                    onChange={(e)=>setCreateForm({...createForm, price_egp: e.target.value})}
                    />
                </div>

                <div>
                    <Label>{t("create.profit_egp")}</Label>
                    <Input
                        type="number"
                        placeholder={t("create.price_ph")}
                        value={createForm.profit_egp}
                        onChange={(e)=>setCreateForm({...createForm, profit_egp: e.target.value})}
                    />
                </div>

                <div style={{display:"flex", alignItems:"end"}}>
                    <Button onClick={firstTimeAdd}>{t("create.create_btn")}</Button>
                </div>
                </Row>
            </>
            )}

            {itemsTab === "receive" && (
            <>
                <Row cols={3} style={{marginTop:8}}>
                <div>
                    <Label>{t("receive.teacher_filter")}</Label>
                    <Select
                    value={receive2.teacher_id}
                    onChange={(e)=>setReceive2({...receive2, teacher_id: e.target.value, item_id: ""})}
                    >
                    <option value="">{t("receive.teacher_all")}</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                </div>

                <div>
                    <Label>{t("receive.item")}</Label>
                    <Select
                    value={receive2.item_id}
                    onChange={(e)=>setReceive2({...receive2, item_id: e.target.value})}
                    >
                    <option value="">{t("receive.item_ph")}</option>
                    {receiveItems.map(i => (
                        <option key={i.id} value={i.id}>
                        {t("receive.item_option_with_grade_price", {
                            name: i.name,
                            grade: i.grade,
                            price: moneyEGPfromCents(i.default_price_cents)
                        })}
                        </option>
                    ))}
                    </Select>
                </div>

                <div>
                    <Label>{t("receive.qty")}</Label>
                    <Input
                    type="number"
                    min={1}
                    value={receive2.qty}
                    onChange={(e)=>setReceive2({...receive2, qty: Number(e.target.value||1)})}
                    />
                </div>
                </Row>

                <div style={{marginTop:8}}>
                <Button onClick={receiveStock2} disabled={!receive2.item_id}>{t("receive.receive_btn")}</Button>
                </div>
            </>
            )}

            {itemsTab === "inventory" && (
            <>
                <Row cols={4} style={{marginTop:8}}>
                <div>
                    <Label>{t("inventory.filter_teacher")}</Label>
                    <Select value={invFilterTeacher} onChange={(e)=>setInvFilterTeacher(e.target.value)}>
                    <option value="">{t("inventory.filter_teacher_all")}</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                </div>
                <div>
                    <Label>{t("inventory.filter_item")}</Label>
                    <Input
                    placeholder={t("inventory.filter_item_ph")}
                    value={invFilterText}
                    onChange={(e)=>setInvFilterText(e.target.value)}
                    onKeyDown={(e)=> e.key==="Enter" && loadInventoryGrid()}
                    />
                </div>
                <div style={{display:"flex", alignItems:"end", gap:8}}>
                    <label style={{display:"flex", alignItems:"center", gap:6}}>
                    <input type="checkbox" checked={invShowZero} onChange={(e)=>setInvShowZero(e.target.checked)} />
                    {t("inventory.show_oos")}
                    </label>
                </div>
                <div style={{display:"flex", alignItems:"end", gap:8}}>
                    <Button onClick={loadInventoryGrid} disabled={invLoading}>
                    {invLoading ? t("inventory.loading") : t("inventory.refresh")}
                    </Button>
                </div>
                </Row>

                <TableWrap style={{marginTop:12}}>
                <Table>
                    <thead>
                        <tr>
                            <th>{t("inventory.table.teacher")}</th>
                            <th>{t("inventory.table.resource")}</th>
                            <th>{t("inventory.table.qty")}</th>
                            <th>{t("inventory.table.price")}</th>
                        </tr>
                    </thead>
                    <tbody>
                    {invRows.map((r, idx)=>(
                        <tr key={idx}>
                        <td>{r.teacher}</td>
                        <td>{r.resource}</td>
                        <td>{r.qty}</td>
                        <td>{r.price}</td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
                </TableWrap>
                {invRows.length === 0 && !invLoading && <Helper>{t("inventory.empty")}</Helper>}
            </>
            )}
        </CardBody>
        </Card>
    )
}