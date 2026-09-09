import { Navigate, Route, Routes } from "react-router-dom";
import { Layout, type NavItem } from "../../components/Layout";
import { ProviderSchedule } from "./ProviderSchedule";
import { ProviderPatients } from "./ProviderPatients";

const nav: NavItem[] = [
  { to: "/provider", label: "Schedule", end: true },
  { to: "/provider/patients", label: "Patients" },
];

export function ProviderView() {
  return (
    <Layout title="Provider" accent="provider" nav={nav}>
      <Routes>
        <Route index element={<ProviderSchedule />} />
        <Route path="patients" element={<ProviderPatients />} />
        <Route path="*" element={<Navigate to="/provider" replace />} />
      </Routes>
    </Layout>
  );
}
