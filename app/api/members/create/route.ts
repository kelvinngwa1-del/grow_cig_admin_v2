import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request
) {
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

    // ============================================================
    // VERIFY STAFF
    // ============================================================

    const {
      data: staff,
      error: staffError,
    } =
      await supabase
        .from("staff_users")
        .select(
          "id, full_name, role, is_active"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      staffError ||
      !staff ||
      !staff.is_active
    ) {
      return NextResponse.json(
        {
          error:
            "Active staff account required.",
        },
        {
          status: 403,
        }
      );
    }

    // ============================================================
    // ALLOWED STAFF ROLES
    // ============================================================

    const allowedRoles = [
      "super_admin",
      "finance_admin",
      "pos_staff",
    ];

    if (
      !allowedRoles.includes(
        staff.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to create members.",
        },
        {
          status: 403,
        }
      );
    }

    // ============================================================
    // READ BODY
    // ============================================================

    const body =
      await request.json();

    const fullName =
      String(
        body.full_name ?? ""
      ).trim();

    const email =
      String(
        body.email ?? ""
      )
        .trim()
        .toLowerCase();

    const phone =
      String(
        body.phone ?? ""
      ).trim();

    const password =
      String(
        body.password ?? ""
      ).trim();

    const currentLocation =
      String(
        body.current_location ?? ""
      ).trim();

    const placeOfBirth =
      String(
        body.place_of_birth ?? ""
      ).trim();

    const occupation =
      String(
        body.occupation ?? ""
      ).trim();

    const dateOfBirth =
      String(
        body.date_of_birth ?? ""
      ).trim();

    const registrationFeePaid =
      Number(
        body.registration_fee_paid ??
          0
      );

    const requestedMembershipStartDate =
      String(
        body.membership_start_date ?? ""
      ).trim();


    // ============================================================
    // VALIDATION
    // ============================================================

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
      !email ||
      !email.includes("@")
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (
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

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Temporary password must contain at least 8 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      Number.isNaN(
        registrationFeePaid
      ) ||
      registrationFeePaid < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Registration fee paid is invalid.",
        },
        {
          status: 400,
        }
      );
    }
    // ============================================================
    // MEMBERSHIP START DATE
    // ============================================================

    let membershipStartDate:
      string | null = null;

    if (requestedMembershipStartDate) {

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          requestedMembershipStartDate
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

      const parsedMembershipDate =
        new Date(
          `${requestedMembershipStartDate}T00:00:00Z`
        );

      if (
        Number.isNaN(
          parsedMembershipDate.getTime()
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

      const today =
        new Date();

      today.setUTCHours(
        0,
        0,
        0,
        0
      );

      if (
        parsedMembershipDate.getTime() >
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

      const {
        data: canBackdateMembership,
        error: backdatePermissionError,
      } =
        await supabase.rpc(
          "can_backdate_member_start_date"
        );

      if (
        backdatePermissionError ||
        !canBackdateMembership
      ) {
        return NextResponse.json(
          {
            error:
              "You are not authorized to set a historical membership start date.",
          },
          {
            status: 403,
          }
        );
      }

      membershipStartDate =
        requestedMembershipStartDate;
    }
    // ============================================================
    // ADMIN CLIENT
    // ============================================================

    const admin =
      createAdminClient();

    // ============================================================
    // CHECK DUPLICATE EMAIL
    // ============================================================

    const {
      data:
        existingProfileByEmail,
    } =
      await admin
        .from("profiles")
        .select(
          "id, email"
        )
        .eq(
          "email",
          email
        )
        .maybeSingle();

    if (
      existingProfileByEmail
    ) {
      return NextResponse.json(
        {
          error:
            "A member with this email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // ============================================================
    // CHECK DUPLICATE PHONE
    // ============================================================

    const {
      data:
        existingProfileByPhone,
    } =
      await admin
        .from("profiles")
        .select(
          "id, phone"
        )
        .eq(
          "phone",
          phone
        )
        .maybeSingle();

    if (
      existingProfileByPhone
    ) {
      return NextResponse.json(
        {
          error:
            "A member with this phone number already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // ============================================================
    // CREATE AUTH USER
    //
    // Existing auth trigger:
    // on_auth_user_created
    //
    // Existing function:
    // handle_new_user()
    //
    // This automatically creates:
    // - profile
    // - account number
    // - referral code
    // - wallet
    // ============================================================

    const {
      data: createdUser,
      error: createUserError,
    } =
      await admin.auth.admin.createUser(
        {
          email,
          password,

          email_confirm: true,

          user_metadata: {
            full_name:
              fullName,

            registration_source:
              "pos",

            created_by_staff:
              user.id,
          },
        }
      );

    if (
      createUserError ||
      !createdUser.user
    ) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ??
            "Unable to create member.",
        },
        {
          status: 400,
        }
      );
    }

    const newUserId =
      createdUser.user.id;

    // ============================================================
    // UPDATE PROFILE WITH EXTRA POS DETAILS
    // ============================================================

    const profileUpdate: Record<
      string,
      unknown
    > = {
      full_name:
        fullName,

      email,

      phone,

      current_location:
        currentLocation ||
        null,

      place_of_birth:
        placeOfBirth ||
        null,

      occupation:
        occupation ||
        null,

      registration_fee_paid:
        registrationFeePaid,

      updated_at:
        new Date().toISOString(),
    };

    if (
      dateOfBirth
    ) {
      profileUpdate.date_of_birth =
        dateOfBirth;
    }

    if (membershipStartDate) {
      profileUpdate.membership_start_date =
        membershipStartDate;
    }


    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from("profiles")
        .update(
          profileUpdate
        )
        .eq(
          "id",
          newUserId
        )
        .select(
          "id, full_name, email, phone, account_number, referral_code, registration_fee_due, registration_fee_paid"
        )
        .single();

    if (
      profileError
    ) {
      // ==========================================================
      // CLEAN UP AUTH USER IF PROFILE UPDATE FAILS
      // ==========================================================

      await admin.auth.admin.deleteUser(
        newUserId
      );

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

    // ============================================================
    // SUCCESS
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        member:
          profile,

        created_by: {
          staff_id:
            staff.id,

          staff_name:
            staff.full_name,

          staff_role:
            staff.role,
        },
      },
      {
        status: 201,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "CREATE MEMBER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ??
          "Unable to create member.",
      },
      {
        status: 500,
      }
    );
  }
}

