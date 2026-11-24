"use client";
import { useFormStatus } from "react-dom";

/** Submit button for the checkout form: shows a processing state and blocks double submits. */
export function PayButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary checkout-pay-btn" disabled={pending} aria-busy={pending || undefined} data-testid="checkout-pay">
      {pending ? "Processing test payment…" : label}
    </button>
  );
}
