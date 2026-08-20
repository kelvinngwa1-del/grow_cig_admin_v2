import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireSuperAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: staff,
    error: staffError,
  } =
    await supabase
      .from("staff_users")
      .select(
        "id, role, is_active"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    staffError ||
    !staff ||
    !staff.is_active ||
    staff.role !== "super_admin"
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            "Only the Super Admin can edit member information.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    user,
  };
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const authorization =
      await requireSuperAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const {
      id: memberId,
    } = await context.params;

    if (!memberId) {
      return NextResponse.json(
        {
          error:
            "Member ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone,
          account_number,
          date_of_birth,
          place_of_birth,
          current_location,
          occupation,
          membership_start_date
        `)
        .eq(
          "id",
          memberId
        )
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            profileError?.message ??
            "Member not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      member: profile,
    });
  } catch (error) {
    console.error(
      "Load member for edit error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load member.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const authorization =
      await requireSuperAdmin();

    if (authorization.error) {
      return authorization.error;
    }

    const {
      id: memberId,
    } = await context.params;

    if (!memberId) {
      return NextResponse.json(
        {
          error:
            "Member ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const fullName =
      String(
        body.full_name ?? ""
      ).trim();

    const phone =
      String(
        body.phone ?? ""
      ).trim();

    const dateOfBirth =
      String(
        body.date_of_birth ?? ""
      ).trim();

    const placeOfBirth =
      String(
        body.place_of_birth ?? ""
      ).trim();

    const currentLocation =
      String(
        body.current_location ?? ""
      ).trim();

    const occupation =
      String(
        body.occupation ?? ""
      ).trim();

    const membershipStartDate =
      String(
        body.membership_start_date ?? ""
      ).trim();

    if (
      fullName.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Enter the member's full name.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      phone &&
      phone.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid phone number.",
        },
        {
          status: 400,
        }
      );
    }

    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      dateOfBirth &&
      !datePattern.test(
        dateOfBirth
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Date of birth is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      membershipStartDate &&
      !datePattern.test(
        membershipStartDate
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Membership start date is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    if (membershipStartDate) {
      const membershipDate =
        new Date(
          `${membershipStartDate}T00:00:00Z`
        );

      const today =
        new Date();

      today.setUTCHours(
        0,
        0,
        0,
        0
      );

      if (
        Number.isNaN(
          membershipDate.getTime()
        ) ||
        membershipDate.getTime() >
          today.getTime()
      ) {
        return NextResponse.json(
          {
            error:
              "Membership start date cannot be in the future.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const admin =
      createAdminClient();

    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from("profiles")
        .update({
          full_name:
            fullName,

          phone:
            phone || null,

          date_of_birth:
            dateOfBirth || null,

          place_of_birth:
            placeOfBirth || null,

          current_location:
            currentLocation || null,

          occupation:
            occupation || null,

          membership_start_date:
            membershipStartDate || null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          memberId
        )
        .select(`
          id,
          full_name,
          email,
          phone,
          account_number,
          date_of_birth,
          place_of_birth,
          current_location,
          occupation,
          membership_start_date
        `)
        .single();

    if (profileError) {
      return NextResponse.json(
        {
          error:
            profileError.message,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,
      member: profile,
    });
  } catch (error) {
    console.error(
      "Edit member error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to edit member.",
      },
      {
        status: 500,
      }
    );
  }
}
