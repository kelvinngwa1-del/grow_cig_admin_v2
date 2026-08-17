import type {
  ReactNode,
} from "react";

import AdminRouteLayout from "@/components/admin/admin-route-layout";

import {
  createPermissionLayout,
} from "@/lib/admin/create-permission-layout";

const PermissionLayout =
  createPermissionLayout(
    "withdrawals.view"
  );

export default function Layout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PermissionLayout>
      <AdminRouteLayout>
        {children}
      </AdminRouteLayout>
    </PermissionLayout>
  );
}
