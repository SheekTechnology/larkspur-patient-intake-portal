import { Navigate, Route, Routes } from "react-router-dom";
import { Layout, type NavItem } from "../../components/Layout";
import { AdminAppointments } from "./AdminAppointments";
import { AdminPeople } from "./AdminPeople";
import { AdminDocuments } from "./AdminDocuments";
import { AdminAccess } from "./AdminAccess";

const nav: NavItem[] = [
  { to: "/admin", label: "Appointments", end: true },
  { to: "/admin/people", label: "People" },
  { to: "/admin/documents", label: "Documents" },
  { to: "/admin/access", label: "Access" },
];

export function AdminView() {
  return (
    <Layout title="Clinic admin" accent="admin" nav={nav}>
      <Routes>
        <Route index element={<AdminAppointments />} />
        <Route path="people" element={<AdminPeople />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="access" element={<AdminAccess />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Layout>
  );
}
