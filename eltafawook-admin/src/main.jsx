import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import App from "./App.jsx";
import KgApplicationForm from "./views/KgApplicationForm.jsx";

const router = createBrowserRouter([
  {
    path: "/apply",
    element: <KgApplicationForm />,
  },
  {
    path: "/*",
    element: <App />,
  },
]);

createRoot(document.getElementById("root")).render(
  <Suspense fallback="Loading...">
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  </Suspense>
);