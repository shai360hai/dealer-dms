import { useState } from "react";
import { formatPrice } from "../lib/format";

const TERMS = [24, 36, 48, 60, 72, 84];

/**
 * Estimated monthly payment for a car loan.
 *
 * Uses the standard amortisation formula. Deliberately labelled as an
 * estimate throughout — real terms depend on credit checks and the
 * lender, and quoting a hard number would be misleading.
 */
function monthlyPayment(principal: number, annualRatePercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function FinancingCalculator({ price }: { price: number }) {
  // A 20% down payment is the common starting point in the Israeli
  // market, so the calculator opens somewhere realistic.
  const [downPayment, setDownPayment] = useState(Math.round(price * 0.2));
  const [months, setMonths] = useState(60);
  const [rate, setRate] = useState(6.5);

  const principal = Math.max(0, price - downPayment);
  const payment = monthlyPayment(principal, rate, months);
  const totalPaid = payment * months + downPayment;
  const totalInterest = Math.max(0, totalPaid - price);

  const downPaymentPercent = price > 0 ? Math.round((downPayment / price) * 100) : 0;

  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-steel)] bg-white p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl">מחשבון מימון</h2>
      <p className="mt-1 text-sm text-[var(--color-steel-dark)]">
        הערכה בלבד להתרשמות ראשונית. התנאים בפועל נקבעים מול חברת המימון.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="down" className="text-sm font-medium">מקדמה</label>
            <span className="font-[family-name:var(--font-mono)] text-sm">
              {formatPrice(downPayment)} <span className="text-xs text-[var(--color-steel-dark)]">({downPaymentPercent}%)</span>
            </span>
          </div>
          <input
            id="down"
            type="range"
            min={0}
            max={price}
            step={1000}
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--color-navy)]"
          />
        </div>

        <div>
          <label className="text-sm font-medium">תקופת ההלוואה</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TERMS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMonths(t)}
                className={`rounded-[var(--radius-card)] border px-3 py-1.5 text-sm transition-colors ${
                  months === t
                    ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                    : "border-[var(--color-steel)] hover:bg-[var(--color-porcelain-dim)]"
                }`}
              >
                {t} חודשים
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="rate" className="text-sm font-medium">ריבית שנתית משוערת</label>
            <span className="font-[family-name:var(--font-mono)] text-sm">{rate.toFixed(1)}%</span>
          </div>
          <input
            id="rate"
            type="range"
            min={0}
            max={15}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--color-navy)]"
          />
        </div>
      </div>

      <div className="mt-5 rounded-[var(--radius-card)] bg-[var(--color-porcelain-dim)] p-4">
        <p className="text-xs text-[var(--color-steel-dark)]">תשלום חודשי משוער</p>
        <p className="font-[family-name:var(--font-mono)] text-3xl font-semibold text-[var(--color-navy)]">
          {formatPrice(Math.round(payment))}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-[var(--color-steel-dark)]">סכום המימון</dt>
            <dd className="font-[family-name:var(--font-mono)]">{formatPrice(principal)}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-steel-dark)]">סה״כ ריבית</dt>
            <dd className="font-[family-name:var(--font-mono)]">{formatPrice(Math.round(totalInterest))}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-steel-dark)]">סה״כ תשלום</dt>
            <dd className="font-[family-name:var(--font-mono)]">{formatPrice(Math.round(totalPaid))}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
