"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const {
        data,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error(
          "Unable to sign in."
        );
      }

      const {
        data: staff,
        error: staffError,
      } = await supabase
        .from("staff_users")
        .select(
          "id, full_name, email, role, is_active"
        )
        .eq("id", data.user.id)
        .maybeSingle();

      if (staffError) {
        await supabase.auth.signOut();
        throw staffError;
      }

      if (!staff) {
        await supabase.auth.signOut();

        throw new Error(
          "This account is not authorized to access GROW CIG Admin."
        );
      }

      if (!staff.is_active) {
        await supabase.auth.signOut();

        throw new Error(
          "Your staff account has been disabled."
        );
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">

        <section className="hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <ShieldCheck
                  size={27}
                  strokeWidth={2.2}
                />
              </div>

              <div>
                <div className="text-xl font-black">
                  GROW CIG
                </div>

                <div className="text-xs text-blue-100">
                  Administration System
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.22em] text-blue-200">
              GROW COMMON INITIATIVE GROUP
            </p>

            <h1 className="text-5xl font-black leading-tight">
              Secure financial
              administration built
              around your members.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-blue-100">
              Manage members, savings,
              goals, withdrawals, loans,
              repayments, interest,
              referrals, staff and
              operational reports from
              one secure system.
            </p>
          </div>

          <p className="text-xs text-blue-200">
            Empowering People,
            Businesses and Communities
            Together.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">

            <div className="mb-9 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
                  <ShieldCheck size={26} />
                </div>

                <div>
                  <div className="text-xl font-black text-slate-950">
                    GROW CIG
                  </div>

                  <div className="text-xs text-slate-500">
                    Administration System
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div className="mb-8">
                <p className="text-sm font-bold text-blue-700">
                  STAFF ACCESS
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in with your
                  authorized GROW CIG
                  staff account.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="admin@growcig.com"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter password"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Signing in...
                    </>
                  ) : (
                    <>
                      <LockKeyhole
                        size={18}
                      />

                      Sign In to Admin
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Access restricted to
              authorized GROW CIG staff.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}