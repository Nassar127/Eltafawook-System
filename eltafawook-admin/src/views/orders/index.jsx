import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHead, CardTitle, CardBody } from "../../components/Card";
import { SubTabs, SubTabButton } from "../../components/Misc";
import DeleteTab from "./DeleteTab";
import ReceiveTab from "./ReceiveTab";
import ReviewTab from "./ReviewTab";

export default function Orders({ toast, ...legacyProps }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("order");

  return (
    <Card>
      <CardHead>
        <CardTitle>{t("title_orders")}</CardTitle>
      </CardHead>
      <CardBody>
        <SubTabs>
          <SubTabButton $active={tab === "order"} onClick={() => setTab("order")}>
            {t("tabs_orders.order")}
          </SubTabButton>
          <SubTabButton $active={tab === "reserve"} onClick={() => setTab("reserve")}>
            {t("tabs_orders.reserve")}
          </SubTabButton>
          <SubTabButton $active={tab === "delete"} onClick={() => setTab("delete")}>
            {t("tabs_orders.delete")}
          </SubTabButton>
          <SubTabButton $active={tab === "receive"} onClick={() => setTab("receive")}>
            {t("tabs_orders.receive")}
          </SubTabButton>
          <SubTabButton $active={tab === "review"} onClick={() => setTab("review")}>
            {t("tabs_orders.review")}
          </SubTabButton>
        </SubTabs>

        {/* Order and Reserve tabs still delegate to the legacy monolith for now —
            they share a lot of coupled state (cart, student selection, item picker).
            Delete, Receive, and Review are fully extracted. */}
        {(tab === "order" || tab === "reserve") && (
          <LegacyOrderReserve tab={tab} toast={toast} {...legacyProps} />
        )}
        {tab === "delete" && <DeleteTab toast={toast} />}
        {tab === "receive" && <ReceiveTab toast={toast} />}
        {tab === "review" && <ReviewTab toast={toast} />}
      </CardBody>
    </Card>
  );
}

/* Thin wrapper that lazy-imports the original Orders for the two tightly-coupled tabs */
import OriginalOrders from "../Orders";

function LegacyOrderReserve({ tab, toast, ...props }) {
  /* Render the original component but force it into the requested tab */
  return <OriginalOrders _forceTab={tab} toast={toast} {...props} />;
}
