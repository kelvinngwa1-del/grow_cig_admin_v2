import type {
  ReactNode,
} from "react";

import AdminRouteLayout from "@/components/admin/admin-route-layout";

export default function AdminModulesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminRouteLayout>
      {children}
    </AdminRouteLayout>
  );
}
