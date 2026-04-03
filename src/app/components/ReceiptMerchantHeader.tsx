import { useLanguage } from "../contexts/LanguageContext";
import type { ReceiptBusinessProfile } from "../types/business";

const DEFAULT_BUSINESS = "AWC TRADING";

export function ReceiptMerchantHeader({
  profile,
  subtitle,
}: {
  profile: ReceiptBusinessProfile;
  /** Defaults to official receipt label */
  subtitle?: string;
}) {
  const { t } = useLanguage();
  const business = profile.businessName?.trim() || DEFAULT_BUSINESS;
  const lines: { label: string; value: string }[] = [];
  if (profile.username?.trim()) {
    lines.push({ label: t.settings.username, value: profile.username.trim() });
  }
  if (profile.phoneNumber?.trim()) {
    lines.push({
      label: t.settings.phoneNumber,
      value: profile.phoneNumber.trim(),
    });
  }
  if (profile.email?.trim()) {
    lines.push({ label: t.settings.email, value: profile.email.trim() });
  }

  return (
    <div className="text-center border-b-2 border-dashed border-black pb-4">
      <h2 className="text-xl font-bold mb-1">{business}</h2>
      <p className="text-xs">{subtitle ?? t.orders.officialReceipt}</p>
      {lines.length > 0 && (
        <div className="text-xs mt-2 space-y-0.5 text-left w-full">
          {lines.map((row) => (
            <div key={row.label} className="flex justify-between gap-2">
              <span className="shrink-0">{row.label}:</span>
              <span className="text-right break-all">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
