import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

export function createPermissionLayout(
  permission: string
) {
  return async function PermissionLayout({
    children,
  }: {
    children: ReactNode;
  }) {
    const supabase =
      await createClient();

    // =========================================================
    // AUTH
    // =========================================================

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      redirect("/");
    }

    // =========================================================
    // PERMISSION
    // =========================================================

    const {
      data: allowed,
      error,
    } = await supabase.rpc(
      "staff_has_permission",
      {
        p_permission_key:
          permission,
      }
    );

    if (
      error ||
      !allowed
    ) {
      if (
        permission ===
        "dashboard.view"
      ) {
        redirect("/");
      }

      redirect(
        "/dashboard"
      );
    }

    return (
      <>
        {children}
      </>
    );
  };
}