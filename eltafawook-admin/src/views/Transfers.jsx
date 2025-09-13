import { useState, useMemo, useEffect } from "react";
import { apiFetch } from "../api";
import Button from "../components/Button";
import { Card, CardHead, CardTitle, CardBody } from "../components/Card";
import { Row, Label, Input, Select } from "../components/Form";
import { Helper } from "../components/Misc";
import { useTranslation, Trans } from "react-i18next";

export default function Transfers({ apiBase, authToken, toast, branches, teachers }) {
  const [form, setForm] = useState({
    from_branch_id: "",
    to_branch_id: "",
    teacher_id: "",
    item_id: "",
    qty: 1,
  });

  const [branchInventory, setBranchInventory] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const { t } = useTranslation("transfers");

  useEffect(() => {
    const fetchBranchInventory = async () => {
      if (!form.from_branch_id || branches.length === 0) {
        setBranchInventory([]);
        return;
      }
      setIsLoadingInventory(true);
      try {
        const branch = branches.find(b => b.id === form.from_branch_id);
        if (!branch) {
          setBranchInventory([]);
          return;
        }
        const data = await apiFetch(apiBase, `/reports/branch-inventory?branch_code=${branch.code}`, { authToken });
        
        console.log("Branch Inventory Loaded:", data?.items);

        setBranchInventory(data?.items || []);
      } catch (e) {
        toast.push({
          title: t("toasts_transfers.inv_load_failed_title"),
          description: t("toasts_transfers.error_desc", { message: e.message }),
          tone: "error"
        });
        setBranchInventory([]);
      } finally {
        setIsLoadingInventory(false);
      }
    };
    fetchBranchInventory();
  }, [form.from_branch_id, apiBase, authToken, branches, toast]);

  const filteredItems = useMemo(() => {
    if (!form.teacher_id || branchInventory.length === 0) {
      return [];
    }
    
    console.log("Filtering with Teacher ID:", form.teacher_id, "and Inventory:", branchInventory);
    
    return branchInventory.filter(
      (item) => item.teacher_id === form.teacher_id && item.available > 0
    );
  }, [branchInventory, form.teacher_id]);
  
  const selectedItemDetails = useMemo(() => {
    if (!form.item_id) return null;
    return branchInventory.find(item => item.item_id === form.item_id);
  }, [branchInventory, form.item_id]);
  
  const remainingQty = selectedItemDetails ? selectedItemDetails.available - form.qty : 0;

  const handleFromBranchChange = (e) => {
    setForm({ ...form, from_branch_id: e.target.value, to_branch_id: "", teacher_id: "", item_id: "", qty: 1 });
  };
  const handleTeacherChange = (e) => {
    setForm({ ...form, teacher_id: e.target.value, item_id: "", qty: 1 });
  };
  
  async function handleTransfer() {
    if (!form.from_branch_id || !form.to_branch_id || !form.item_id || !form.qty) {
      toast.push({ title: t("toasts_transfers.all_required"), tone: "error" });
      return;
    }
    const quantity = Number(form.qty);
    if (quantity <= 0) {
      toast.push({ title: t("toasts_transfers.qty_positive"), tone: "error" });
      return;
    }
    if (quantity > selectedItemDetails?.available) {
      toast.push({ title: t("toasts_transfers.qty_exceeds"), tone: "error" });
      return;
    }

    setIsTransferring(true);
    try {
      const body = {
        from_branch_id: form.from_branch_id,
        to_branch_id: form.to_branch_id,
        item_id: form.item_id,
        qty: quantity,
      };
      await apiFetch(apiBase, "/transfers", { method: "POST", body, authToken });
      toast.push({
        title: t("toasts.transfer_success_title"),
        description: t("toasts_transfers.transfer_success_desc", { qty: quantity, item: selectedItemDetails.name }),
        tone: "success"
      });
      
      const originalFromBranch = form.from_branch_id;
      setForm({ from_branch_id: originalFromBranch, to_branch_id: "", teacher_id: "", item_id: "", qty: 1 });
      setForm(f => ({...f, from_branch_id: ""}));
      setTimeout(() => setForm(f => ({...f, from_branch_id: originalFromBranch})), 0);

    } catch (e) {
      toast.push({
        title: t("toasts_transfers.transfer_failed_title"),
        description: t("toasts_transfers.error_desc", { message: e.message }),
        tone: "error"
      });
    } finally {
      setIsTransferring(false);
    }
  }

  return (
    <Card>
      <CardHead>
        <CardTitle>{t("title_transfers")}</CardTitle>
      </CardHead>
      <CardBody>
        <Row cols={2}>
          <div>
          <Label>{t("fields.from_branch")}</Label>
          <Select value={form.from_branch_id} onChange={handleFromBranchChange}>
            <option value="">{t("selects.source_ph")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {t("options.branch_label", { name: b.name, code: b.code })}
              </option>
            ))}
          </Select>
          </div>
          <div>
          <Label>{t("fields.to_branch")}</Label>
          <Select
            value={form.to_branch_id}
            onChange={(e) => setForm({ ...form, to_branch_id: e.target.value })}
            disabled={!form.from_branch_id}
          >
            <option value="">{t("selects.destination_ph")}</option>
            {branches.filter(b => b.id !== form.from_branch_id).map((b) => (
              <option key={b.id} value={b.id}>
                {t("options.branch_label", { name: b.name, code: b.code })}
              </option>
            ))}
          </Select>
          </div>
        </Row>
        <Row cols={1}>
          <div>
          <Label>{t("fields.teacher")}</Label>
          <Select value={form.teacher_id} onChange={handleTeacherChange} disabled={!form.from_branch_id || isLoadingInventory}>
            <option value="">{t("selects.teacher_ph")}</option>
            {teachers.map((tch) => <option key={tch.id} value={tch.id}>{tch.name}</option>)}
          </Select>
          </div>
        </Row>
        <Row cols={2}>
          <div>
          <Label>{isLoadingInventory ? t("fields.item_loading") : t("fields.item")}</Label>
          <Select
            value={form.item_id}
            onChange={(e) => setForm({ ...form, item_id: e.target.value, qty: 1 })}
            disabled={!form.teacher_id || isLoadingInventory}
          >
            <option value="">{t("selects.item_ph")}</option>
            {filteredItems.map((i) => (
              <option key={i.item_id} value={i.item_id}>
                {t("options.item_with_grade", { name: i.name, grade: i.grade })}
              </option>
            ))}
          </Select>
            {selectedItemDetails && (
              <Helper>
                <span dangerouslySetInnerHTML={{ __html: t("helpers.available", { count: selectedItemDetails.available }) }} />
              </Helper>
            )}
          </div>
          <div>
            <Label>{t("fields.qty_to_transfer")}</Label>
            <Input
              type="number"
              min="1"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
              disabled={!form.item_id}
            />
            {selectedItemDetails && (
              <Helper>
                <span dangerouslySetInnerHTML={{ __html: t("helpers.remaining", { count: remainingQty }) }} />
              </Helper>
            )}
          </div>
        </Row>
        <div style={{ marginTop: 16 }}>
        <Button onClick={handleTransfer} disabled={isTransferring || !form.item_id || !form.to_branch_id}>
          {isTransferring ? t("buttons.transferring") : t("buttons.execute")}
        </Button>
        </div>
      </CardBody>
    </Card>
  );
}