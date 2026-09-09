import { Navigate, Route, Routes } from "react-router-dom";
import { Layout, type NavItem } from "../../components/Layout";
import { PatientAppointments } from "./PatientAppointments";
import { PatientDocuments } from "./PatientDocuments";
import { PatientProfile } from "./PatientProfile";
import { CareTeam } from "./CareTeam";

const nav: NavItem[] = [
  { to: "/patient", label: "Appointments", end: true },
  { to: "/patient/documents", label: "Documents" },
  { to: "/patient/profile", label: "My details" },
  { to: "/patient/care-team", label: "Care team" },
];

export function PatientView() {
  return (
    <Layout title="Patient portal" accent="patient" nav={nav}>
      <Routes>
        <Route index element={<PatientAppointments />} />
        <Route path="documents" element={<PatientDocuments />} />
        <Route path="profile" element={<PatientProfile />} />
        <Route path="care-team" element={<CareTeam />} />
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Routes>
    </Layout>
  );
}
