import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "admin_recover_registration_fees"
      );

    if (error) {
      const message =
        error.message ||
        "Unable to recover registration fees.";

      const lower =
        message.toLowerCase();

      const forbidden =
        lower.includes(
          "not authorized"
        ) ||
        lower.includes(
          "active staff"
        ) ||
        lower.includes(
          "permission"
        );

      return NextResponse.json(
        {
          error: message,
        },
        {
          status:
            forbidden
              ? 403
              : 400,
        }
      );
    }

    return NextResponse.json(
      data ?? {
        success: true,
      }
    );
  } catch (
    error: unknown
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to recover registration fees.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}