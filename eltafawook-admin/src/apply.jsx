import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import KgApplicationForm from "./views/KgApplicationForm.jsx";
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback="Loading...">
      <I18nextProvider i18n={i18n}>
        <KgApplicationForm />
      </I18nextProvider>
    </Suspense>
  </React.StrictMode>
);