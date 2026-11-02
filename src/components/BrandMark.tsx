/** Shared approved skull mark; the editable source lives in build-brand-assets.mjs. */
export default function BrandMark({ size = 28 }: { size?: number }) {
  return <img className="brand-mark" src="/brand/mark.svg" width={size} height={size} alt="" aria-hidden="true" decoding="async"/>;
}
