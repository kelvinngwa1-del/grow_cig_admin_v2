"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

import {
  Building2,
  FileSignature,
  ImageIcon,
  Loader2,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type DocumentSettings = {
  id: string;

  organization_name: string;

  ceo_full_name:
    | string
    | null;

  ceo_title:
    | string
    | null;

  logo_url:
    | string
    | null;

  ceo_signature_url:
    | string
    | null;

  official_stamp_url:
    | string
    | null;

  office_address:
    | string
    | null;

  phone:
    | string
    | null;

  whatsapp:
    | string
    | null;

  email:
    | string
    | null;

  website:
    | string
    | null;

  agreement_footer_text:
    | string
    | null;

  created_at: string;
  updated_at: string;
};

type Props = {
  initialSettings:
    DocumentSettings;

  initialLogoPreviewUrl:
    string | null;

  initialSignaturePreviewUrl:
    string | null;

  initialStampPreviewUrl:
    string | null;

  staffName: string;
  staffRole: string;
};

type AssetType =
  | "logo"
  | "signature"
  | "stamp";

export default function DocumentSettingsForm({
  initialSettings,
  initialLogoPreviewUrl,
  initialSignaturePreviewUrl,
  initialStampPreviewUrl,
  staffName,
  staffRole,
}: Props) {
  const supabase =
    createClient();

  const [saving, setSaving] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState<AssetType | null>(
      null
    );

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [
    organizationName,
    setOrganizationName,
  ] = useState(
    initialSettings
      .organization_name ?? ""
  );

  const [
    ceoFullName,
    setCeoFullName,
  ] = useState(
    initialSettings
      .ceo_full_name ?? ""
  );

  const [
    ceoTitle,
    setCeoTitle,
  ] = useState(
    initialSettings
      .ceo_title ?? ""
  );

  const [
    officeAddress,
    setOfficeAddress,
  ] = useState(
    initialSettings
      .office_address ?? ""
  );

  const [phone, setPhone] =
    useState(
      initialSettings.phone ?? ""
    );

  const [
    whatsapp,
    setWhatsapp,
  ] = useState(
    initialSettings.whatsapp ?? ""
  );

  const [email, setEmail] =
    useState(
      initialSettings.email ?? ""
    );

  const [website, setWebsite] =
    useState(
      initialSettings.website ?? ""
    );

  const [
    footerText,
    setFooterText,
  ] = useState(
    initialSettings
      .agreement_footer_text ?? ""
  );

  const [
    logoPath,
    setLogoPath,
  ] = useState(
    initialSettings.logo_url
  );

  const [
    signaturePath,
    setSignaturePath,
  ] = useState(
    initialSettings
      .ceo_signature_url
  );

  const [
    stampPath,
    setStampPath,
  ] = useState(
    initialSettings
      .official_stamp_url
  );

  const [
    logoPreviewUrl,
    setLogoPreviewUrl,
  ] = useState(
    initialLogoPreviewUrl
  );

  const [
    signaturePreviewUrl,
    setSignaturePreviewUrl,
  ] = useState(
    initialSignaturePreviewUrl
  );

  const [
    stampPreviewUrl,
    setStampPreviewUrl,
  ] = useState(
    initialStampPreviewUrl
  );

  const roleLabel =
    staffRole
      .replaceAll("_", " ")
      .toUpperCase();

  async function getSignedUrl(
    path: string
  ) {
    const { data, error } =
      await supabase.storage
        .from(
          "document-assets"
        )
        .createSignedUrl(
          path,
          60 * 60
        );

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }

  async function uploadAsset(
    type: AssetType,
    file: File
  ) {
    setMessage("");
    setError("");

    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Only PNG, JPEG and WebP images are allowed."
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Image must not exceed 5 MB."
      );

      return;
    }

    setUploading(type);

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ??
        "png";

      let path = "";

      if (type === "logo") {
        path =
          `branding/grow-logo.${extension}`;
      }

      if (
        type === "signature"
      ) {
        path =
          `branding/ceo-signature.${extension}`;
      }

      if (type === "stamp") {
        path =
          `branding/official-stamp.${extension}`;
      }

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "document-assets"
          )
          .upload(
            path,
            file,
            {
              upsert: true,
              cacheControl:
                "3600",
              contentType:
                file.type,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const signedUrl =
        await getSignedUrl(
          path
        );

      if (type === "logo") {
        setLogoPath(path);
        setLogoPreviewUrl(
          signedUrl
        );
      }

      if (
        type === "signature"
      ) {
        setSignaturePath(
          path
        );

        setSignaturePreviewUrl(
          signedUrl
        );
      }

      if (type === "stamp") {
        setStampPath(path);
        setStampPreviewUrl(
          signedUrl
        );
      }

      setMessage(
        `${assetLabel(
          type
        )} uploaded successfully. Click Save Settings to confirm the change.`
      );
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : "Unable to upload image.";

      setError(text);
    } finally {
      setUploading(null);
    }
  }

  function assetLabel(
    type: AssetType
  ) {
    if (type === "logo") {
      return "GROW logo";
    }

    if (
      type === "signature"
    ) {
      return "CEO signature";
    }

    return "Official stamp";
  }

  function handleFileChange(
    type: AssetType,
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    void uploadAsset(
      type,
      file
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setMessage("");
    setError("");

    if (
      !organizationName.trim()
    ) {
      setError(
        "Organization name is required."
      );

      return;
    }

    setSaving(true);

    try {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "document_settings"
          )
          .update({
            organization_name:
              organizationName.trim(),

            ceo_full_name:
              ceoFullName.trim() ||
              null,

            ceo_title:
              ceoTitle.trim() ||
              null,

            logo_url:
              logoPath,

            ceo_signature_url:
              signaturePath,

            official_stamp_url:
              stampPath,

            office_address:
              officeAddress.trim() ||
              null,

            phone:
              phone.trim() ||
              null,

            whatsapp:
              whatsapp.trim() ||
              null,

            email:
              email.trim() ||
              null,

            website:
              website.trim() ||
              null,

            agreement_footer_text:
              footerText.trim() ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            initialSettings.id
          );

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "Document and organization settings updated successfully."
      );
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : "Unable to update settings.";

      setError(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-700">
              GROW CIG ADMIN V2
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Document & Organization Settings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage the organization information
              used on receipts, loan agreements,
              contracts and other official GROW
              documents.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-400">
              Signed in as
            </p>

            <p className="mt-1 text-sm font-black text-slate-950">
              {staffName}
            </p>

            <p className="mt-1 text-xs font-bold text-blue-700">
              {roleLabel}
            </p>
          </div>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Building2
                  size={22}
                />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Organization Information
                </h2>

                <p className="text-sm text-slate-500">
                  Shared information used
                  across official documents.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <Field
                label="Organization Name"
                value={
                  organizationName
                }
                onChange={
                  setOrganizationName
                }
                required
              />

              <Field
                label="Office Address"
                value={
                  officeAddress
                }
                onChange={
                  setOfficeAddress
                }
              />

              <Field
                label="Phone"
                value={phone}
                onChange={
                  setPhone
                }
              />

              <Field
                label="WhatsApp"
                value={
                  whatsapp
                }
                onChange={
                  setWhatsapp
                }
              />

              <Field
                label="Email"
                value={email}
                onChange={
                  setEmail
                }
                type="email"
              />

              <Field
                label="Website"
                value={
                  website
                }
                onChange={
                  setWebsite
                }
              />

            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <FileSignature
                  size={22}
                />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Executive Information
                </h2>

                <p className="text-sm text-slate-500">
                  CEO information used
                  on agreements and
                  authorized documents.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <Field
                label="CEO Full Name"
                value={
                  ceoFullName
                }
                onChange={
                  setCeoFullName
                }
              />

              <Field
                label="CEO Title"
                value={
                  ceoTitle
                }
                onChange={
                  setCeoTitle
                }
              />

            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ImageIcon
                  size={22}
                />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Document Branding
                </h2>

                <p className="text-sm text-slate-500">
                  Images are stored
                  privately and used
                  on authorized GROW
                  documents.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">

              <ImageUploadCard
                title="GROW Logo"
                previewUrl={
                  logoPreviewUrl
                }
                loading={
                  uploading ===
                  "logo"
                }
                inputId="grow-logo-upload"
                onChange={(
                  event
                ) =>
                  handleFileChange(
                    "logo",
                    event
                  )
                }
              />

              <ImageUploadCard
                title="CEO Signature"
                previewUrl={
                  signaturePreviewUrl
                }
                loading={
                  uploading ===
                  "signature"
                }
                inputId="ceo-signature-upload"
                onChange={(
                  event
                ) =>
                  handleFileChange(
                    "signature",
                    event
                  )
                }
              />

              <ImageUploadCard
                title="Official Stamp"
                previewUrl={
                  stampPreviewUrl
                }
                loading={
                  uploading ===
                  "stamp"
                }
                inputId="official-stamp-upload"
                onChange={(
                  event
                ) =>
                  handleFileChange(
                    "stamp",
                    event
                  )
                }
              />

            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ShieldCheck
                  size={22}
                />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Document Footer
                </h2>

                <p className="text-sm text-slate-500">
                  Default legal or
                  informational note
                  printed on supported
                  documents.
                </p>
              </div>
            </div>

            <textarea
              rows={5}
              value={
                footerText
              }
              onChange={(
                event
              ) =>
                setFooterText(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              placeholder="Enter default document footer text..."
            />

          </section>

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              uploading !==
                null
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Saving Settings...
              </>
            ) : (
              <>
                <Save
                  size={18}
                />

                Save Document Settings
              </>
            )}
          </button>

        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        required={required}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
      />
    </div>
  );
}

function ImageUploadCard({
  title,
  previewUrl,
  loading,
  inputId,
  onChange,
}: {
  title: string;
  previewUrl:
    | string
    | null;
  loading: boolean;
  inputId: string;
  onChange: (
    event:
      ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-sm font-black text-slate-900">
        {title}
      </p>

      <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white p-3">

        {previewUrl ? (
          <img
            src={previewUrl}
            alt={title}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-center text-slate-400">
            <ImageIcon
              size={30}
              className="mx-auto"
            />

            <p className="mt-2 text-xs">
              No image uploaded
            </p>
          </div>
        )}

      </div>

      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={
          onChange
        }
      />

      <label
        htmlFor={inputId}
        className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
      >
        {loading ? (
          <>
            <Loader2
              size={17}
              className="animate-spin"
            />

            Uploading...
          </>
        ) : (
          <>
            <Upload
              size={17}
            />

            Upload / Replace
          </>
        )}
      </label>

      <p className="mt-2 text-center text-xs text-slate-400">
        PNG, JPG or WebP · Max 5 MB
      </p>

    </div>
  );
}