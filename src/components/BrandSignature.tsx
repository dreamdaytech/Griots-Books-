/** Griots Books visual identity, based on the owner-provided logo. */
export const BRAND_LOGO_PATH = '/brand/griots-books-logo.webp';
export const BRAND_MOTTO = 'Stories. Memory. Legacy.';

export function BrandSignature({
  name = 'Griots Books',
  compact = false,
}: {
  name?: string;
  compact?: boolean;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5" aria-label={name}>
      {/* Crop only the upper emblem in small navigational contexts; the full logo is in the footer. */}
      <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#D9B36A]/60 bg-[#F3EEEC]">
        <img
          src={BRAND_LOGO_PATH}
          alt=""
          aria-hidden="true"
          width={58}
          height={56}
          className="absolute left-1/2 top-0 w-[58px] max-w-none -translate-x-1/2"
        />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-serif text-base sm:text-lg font-bold uppercase tracking-[0.035em] text-[#22170D] dark:text-[#F8F2EA]">
          {name}
        </span>
        {!compact && (
          <span className="hidden xl:block text-[10px] font-semibold tracking-[0.08em] text-[#946000] dark:text-amber-300">
            {BRAND_MOTTO}
          </span>
        )}
      </span>
    </span>
  );
}
