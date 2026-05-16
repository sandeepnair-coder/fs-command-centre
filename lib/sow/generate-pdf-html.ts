type SowPdfData = {
  sowRef: string;
  clientName: string;
  brandName: string;
  buyerName: string;
  salesDri: string;
  tierName: string;
  currency: string;
  symbol: string;
  services: string;
  gmPlanType: string;
  mkPlanType: string;
  discount: number;
  upfront: number;
  months: number;
  netMonthly: number;
  annualValue: number;
  listMonthly?: number;
  bundleDiscount?: number;
  createdAt?: string;
};

function fmt(amount: number, symbol: string): string {
  if (symbol === "$") return `$${amount.toLocaleString("en-US")}`;
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

export function generateSowPdfHtml(data: SowPdfData): string {
  const {
    sowRef, clientName, brandName, buyerName, salesDri,
    tierName, currency, symbol, services,
    discount, upfront, months, netMonthly, annualValue,
    listMonthly, bundleDiscount,
  } = data;

  const date = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const list = listMonthly ?? netMonthly;
  const bundle = bundleDiscount ?? 0;
  const afterBundle = list - bundle;
  const discountAmt = afterBundle * (discount / 100);
  const afterDiscount = afterBundle - discountAmt;
  const upfrontAmt = afterDiscount * (upfront / 100);

  const upfrontLabel = upfront === 0 ? "Monthly (Net-15)" : upfront === 5 ? "Quarterly upfront (5% off)" : "Annual upfront (10% off)";

  return `<!DOCTYPE html><html><head><title>${sowRef} — ${clientName}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; margin: 0; max-width: 800px; margin: 0 auto; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td, th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
  th, .th { background: #f5f5f5; font-weight: 600; color: #1F497D; }
  h3 { color: #1a1a1a; margin-top: 28px; margin-bottom: 12px; }
  .primary { color: #059669; }
  .red { color: #dc2626; }
  .meta { color: #666; font-size: 12px; }
  .amt { font-weight: 800; }
  .highlight { background: #f0fdf4; }
  ul { padding-left: 20px; } li { margin-bottom: 4px; font-size: 13px; }
  @page { margin: 15mm; size: A4; }
  @media print { body { padding: 0; } }
</style></head><body>

<!-- Header -->
<div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px;">
  <div>
    <div style="font-size: 28px; font-weight: 900;">FYND STUDIO</div>
    <div class="meta">AI-native creative · Mumbai · Bangalore · Dubai</div>
  </div>
  <div style="text-align: right;">
    <div style="font-size: 18px; font-weight: 700; color: #059669;">${clientName}</div>
    <div class="meta">${brandName}</div>
  </div>
</div>

<div style="margin-bottom: 24px;">
  <div style="font-size: 22px; font-weight: 700;">Statement of Work</div>
  <div class="meta">Ref: ${sowRef} · Effective: ${date} · Term: ${months} months from effective date</div>
</div>

<!-- Parties -->
<table>
  <tr><td class="th" style="width: 25%;">Service Provider</td><td>Fynd Studio · a division of Shopsense Retail Technologies Ltd.</td></tr>
  <tr><td class="th">Customer</td><td>${clientName}</td></tr>
  <tr><td class="th">Buyer</td><td>${buyerName}</td></tr>
  <tr><td class="th">Sales DRI (Fynd)</td><td>${salesDri}</td></tr>
  <tr><td class="th">Market / Tier</td><td>${tierName} · ${currency}</td></tr>
  <tr><td class="th">Services</td><td>${services}</td></tr>
  <tr><td class="th">Term</td><td>${months} months from effective date</td></tr>
</table>

<!-- Commercials -->
<h3>1 · Commercials</h3>
<table>
  <tr><td class="meta">List price</td><td style="text-align: right; font-weight: 600;">${fmt(Math.round(list), symbol)} /mo</td></tr>
  ${bundle > 0 ? `<tr><td class="meta">Bundle discount (10%)</td><td style="text-align: right;" class="red">−${fmt(Math.round(bundle), symbol)}</td></tr>` : ""}
  ${discount > 0 ? `<tr><td class="meta">Negotiated discount (${discount}%)</td><td style="text-align: right;" class="red">−${fmt(Math.round(discountAmt), symbol)}</td></tr>` : ""}
  ${upfront > 0 ? `<tr><td class="meta">Upfront commitment (${upfront}% off)</td><td style="text-align: right;" class="red">−${fmt(Math.round(upfrontAmt), symbol)}</td></tr>` : ""}
  <tr class="highlight"><td style="font-weight: 700;" class="primary">Net monthly retainer</td><td style="text-align: right; font-weight: 800; font-size: 18px;" class="primary">${fmt(Math.round(netMonthly), symbol)}</td></tr>
</table>

<table>
  <tr>
    ${upfront >= 5
      ? `<th style="text-align: center;">Q1</th><th style="text-align: center;">Q2</th><th style="text-align: center;">Q3</th><th style="text-align: center;">Q4</th><th style="text-align: center; background: #f0fdf4; color: #059669;">Annual</th>`
      : `<th style="text-align: center;">Monthly</th><th style="text-align: center; background: #f0fdf4; color: #059669;">Annual</th>`}
  </tr>
  <tr>
    ${upfront >= 5
      ? `<td style="text-align: center; font-weight: 600;">${fmt(Math.round(netMonthly * 3), symbol)}</td><td style="text-align: center; font-weight: 600;">${fmt(Math.round(netMonthly * 3), symbol)}</td><td style="text-align: center; font-weight: 600;">${fmt(Math.round(netMonthly * 3), symbol)}</td><td style="text-align: center; font-weight: 600;">${fmt(Math.round(netMonthly * 3), symbol)}</td><td style="text-align: center; font-weight: 800; font-size: 16px; background: #f0fdf4; color: #059669;">${fmt(Math.round(annualValue), symbol)}</td>`
      : `<td style="text-align: center; font-weight: 600;">${fmt(Math.round(netMonthly), symbol)}</td><td style="text-align: center; font-weight: 800; font-size: 16px; background: #f0fdf4; color: #059669;">${fmt(Math.round(annualValue), symbol)}</td>`}
  </tr>
</table>
<p style="font-size: 13px;"><strong>Payment schedule:</strong> Monthly in advance on the 1st · Net-15.${upfront === 5 ? " Upfront commitment: quarterly." : upfront === 10 ? " Upfront commitment: annual." : ""}</p>

<!-- SLAs -->
<h3>2 · Service Level Agreements</h3>
<table>
  <tr><td class="meta">First delivery</td><td style="font-weight: 600;">48 hours from brief lock</td></tr>
  <tr><td class="meta">Revision turnaround</td><td style="font-weight: 600;">24 hours</td></tr>
  <tr><td class="meta">Monthly review</td><td style="font-weight: 600;">Included — Pod DRI + account lead</td></tr>
  <tr><td class="meta">Escalation</td><td style="font-weight: 600;">Account lead within 4 hours</td></tr>
</table>
<p class="meta">First-delivery SLA measured from receipt of complete customer inputs and signed PO.</p>

<!-- Customer Inputs -->
<h3>3 · Customer Inputs</h3>
<ul>
  <li>Brand brief · positioning · tonality references</li>
  <li>Brand assets (logo files, product imagery, colour palette, fonts)</li>
  <li>Target audience definition · market(s) · language(s) required</li>
  <li>Reference creatives (3–5 examples preferred)</li>
  <li>Performance benchmarks (current ROAS / CTR / engagement metrics)</li>
  <li>Approver and feedback turnaround SLA (24–48 hrs ideal)</li>
  <li>Access to brand's social handles / ad accounts (for posting)</li>
</ul>
<p class="meta">Delays in customer inputs may extend delivery SLA proportionally.</p>

<!-- Surcharges -->
<h3>4 · Surcharges & Standard Terms</h3>
<ul>
  <li>Same-day rush (&lt;12 hr SLA): <strong>+30%</strong> on list. Not discountable.</li>
  <li>Scope change after storyboard approval: up to <strong>+50%</strong> of asset cost.</li>
  <li>Major brief change after delivery: up to <strong>+100%</strong> of asset cost.</li>
  <li>Talent / branded music licensing: pass-through at <strong>cost +15%</strong> admin.</li>
  <li>Additional language packs: <strong>+25%</strong> of base per language beyond included.</li>
  <li>Payment: Net-15 retainers · Net-30 à la carte · 5% off quarterly upfront · 10% off annual upfront.</li>
  <li>Collection target: <strong>≤ 60 days</strong> PO-to-bank.</li>
</ul>

<!-- Signatures -->
<h3>5 · Signatures</h3>
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 16px;">
  <div>
    <div style="border-bottom: 2px solid #666; height: 64px; margin-bottom: 8px;"></div>
    <div style="font-weight: 600; font-size: 14px;">Fynd Studio</div>
    <div class="meta">Debajit Sardar · Founder</div>
  </div>
  <div>
    <div style="border-bottom: 2px solid #666; height: 64px; margin-bottom: 8px;"></div>
    <div style="font-weight: 600; font-size: 14px;">${clientName}</div>
    <div class="meta">Authorised representative</div>
  </div>
</div>

<div class="meta" style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px;">
  Internal reference · This SoW is governed by the Fynd Studio Master Services Agreement.
  Pricing derived from Rate Card FY 2026-27 · SoW Builder. Floor / walk-away logic per v12 Business Plan §8.4.
</div>

</body></html>`;
}
