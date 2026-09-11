import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import DocumentSettingsForm from "@/components/settings/document-settings-form";

export default async function DocumentSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff || !staff.is_active) {
    redirect("/");
  }

  const { data: settings, error } = await supabase
    .from("document_settings")
    .select(`
      id,
      organization_name,
      ceo_full_name,
      ceo_title,
      logo_url,
      ceo_signature_url,
      official_stamp_url,
      office_address,
      phone,
      whatsapp,
      email,
      website,
      agreement_footer_text,
      created_at,
      updated_at
    `)
    .limit(1)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  async function getSignedImageUrl(
    path: string | null
  ) {
    if (!path) {
      return null;
    }

    const { data } = await supabase.storage
      .from("document-assets")
      .createSignedUrl(
        path,
        60 * 60
      );

    return data?.signedUrl ?? null;
  }

  const [
    logoPreviewUrl,
    signaturePreviewUrl,
    stampPreviewUrl,
  ] = await Promise.all([
    getSignedImageUrl(settings.logo_url),
    getSignedImageUrl(
      settings.ceo_signature_url
    ),
    getSignedImageUrl(
      settings.official_stamp_url
    ),
  ]);

  return (
    <DocumentSettingsForm
      initialSettings={settings}
      initialLogoPreviewUrl={
        logoPreviewUrl
      }
      initialSignaturePreviewUrl={
        signaturePreviewUrl
      }
      initialStampPreviewUrl={
        stampPreviewUrl
      }
      staffName={staff.full_name}
      staffRole={staff.role}
    />
  );
}