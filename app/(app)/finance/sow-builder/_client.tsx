"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import type {
  RateCardVersion,
  RateCardTier,
  RateCardItem,
} from "@/lib/types/rate-card";
import { computeTierPrice, computeFloor } from "@/lib/rate-card/compute";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Props = {
  version: RateCardVersion;
  tiers: RateCardTier[];
  items: RateCardItem[];
};

type GmPlanType = "volume" | "alacarte" | "pilot";
type MkPlanType = "brand" | "campaign" | "strategic";

const GM_PLAN_LABELS: Record<GmPlanType, string> = {
  volume: "Volume Retainer",
  alacarte: "A La Carte",
  pilot: "14 Day Pilot",
};
const MK_PLAN_LABELS: Record<MkPlanType, string> = {
  brand: "Brand Retainer",
  campaign: "Per-Campaign",
  strategic: "Strategic Projects",
};

const UPFRONT_OPTIONS = [
  { label: "Monthly (Net-15)", value: 0 },
  { label: "Quarterly upfront (5% off)", value: 5 },
  { label: "Annual upfront (10% off)", value: 10 },
] as const;

const SURCHARGES = [
  { label: "Same-day rush (<12 hr)", value: "+30%" },
  { label: "Scope change after storyboard", value: "+50%" },
  { label: "Brief change after delivery", value: "+100%" },
  { label: "Talent / music licensing", value: "cost +15%" },
  { label: "Language pack (per lang beyond included)", value: "+25%" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtPrice(amount: number, symbol: string): string {
  if (symbol === "$") return `$${amount.toLocaleString("en-US")}`;
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

function StepHeader({
  label,
  meta,
}: {
  label: string;
  meta?: string;
}) {
  return (
    <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between">
      <span>{label}</span>
      {meta && (
        <span className="text-[11px] font-normal opacity-70">{meta}</span>
      )}
    </div>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SoWBuilderClient({ version, tiers, items }: Props) {
  // Step 1: Customer
  const [clientName, setClientName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [salesDri, setSalesDri] = useState("");

  // Step 2: Market
  const [selectedTierKey, setSelectedTierKey] = useState("india");

  // Step 3: Services
  const [gmEnabled, setGmEnabled] = useState(true);
  const [mkEnabled, setMkEnabled] = useState(false);

  // Step 4: Configure
  const [activeService, setActiveService] = useState<"gm" | "mk">("gm");
  const [gmPlanType, setGmPlanType] = useState<GmPlanType>("volume");
  const [mkPlanType, setMkPlanType] = useState<MkPlanType>("brand");
  const [selectedGmTier, setSelectedGmTier] = useState("vol_pro");
  const [selectedMkTier, setSelectedMkTier] = useState("br_starter");
  const [alacarteQtys, setAlacarteQtys] = useState<Record<string, number>>({});
  const [campaignQtys, setCampaignQtys] = useState<Record<string, number>>({});
  const [strategicQtys, setStrategicQtys] = useState<Record<string, number>>(
    {},
  );

  // Step 5: Commercials
  const [discount, setDiscount] = useState(10);
  const [upfront, setUpfront] = useState(5);
  const [months, setMonths] = useState(12);

  // Derived
  const selectedTier = tiers.find((t) => t.tier_key === selectedTierKey)!;
  const { symbol, currency, multiplier } = selectedTier;

  function price(baseInr: number) {
    return computeTierPrice(baseInr, multiplier, version.fx_rate);
  }

  const volumeItems = useMemo(
    () =>
      items
        .filter((i) => i.section === "volume_retainer")
        .sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );
  const alacarteItems = useMemo(
    () =>
      items
        .filter((i) => i.section === "alacarte")
        .sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );
  const pilotItem = useMemo(
    () => items.find((i) => i.section === "pilot_sprint"),
    [items],
  );
  const brandRetainerItems = useMemo(
    () =>
      items
        .filter((i) => i.section === "brand_retainer")
        .sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );
  const campaignItems = useMemo(
    () =>
      items
        .filter((i) => i.section === "per_campaign")
        .sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );
  const strategicItems = useMemo(
    () =>
      items
        .filter((i) => i.section === "strategic")
        .sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );

  // ---- Price computation ----
  const gmMonthly = useMemo(() => {
    if (!gmEnabled) return 0;
    if (gmPlanType === "volume") {
      const item = items.find((i) => i.item_key === selectedGmTier);
      return item ? price(item.base_inr) : 0;
    }
    if (gmPlanType === "alacarte") {
      return alacarteItems.reduce((sum, item) => {
        const qty = alacarteQtys[item.item_key] ?? 0;
        return sum + qty * price(item.base_inr);
      }, 0);
    }
    if (gmPlanType === "pilot") {
      return pilotItem ? price(pilotItem.base_inr) : 0;
    }
    return 0;
  }, [
    gmEnabled,
    gmPlanType,
    selectedGmTier,
    alacarteQtys,
    items,
    alacarteItems,
    pilotItem,
    multiplier,
  ]);

  const mkMonthly = useMemo(() => {
    if (!mkEnabled) return 0;
    if (mkPlanType === "brand") {
      const item = items.find((i) => i.item_key === selectedMkTier);
      return item ? price(item.base_inr) : 0;
    }
    if (mkPlanType === "campaign") {
      return campaignItems.reduce((sum, item) => {
        const qty = campaignQtys[item.item_key] ?? 0;
        return sum + qty * price(item.base_inr);
      }, 0);
    }
    if (mkPlanType === "strategic") {
      return strategicItems.reduce((sum, item) => {
        const qty = strategicQtys[item.item_key] ?? 0;
        return sum + qty * price(item.base_inr);
      }, 0);
    }
    return 0;
  }, [
    mkEnabled,
    mkPlanType,
    selectedMkTier,
    campaignQtys,
    strategicQtys,
    items,
    campaignItems,
    strategicItems,
    multiplier,
  ]);

  // Bundle discount: 10% off the smaller line when both enabled
  const bundleDiscount = useMemo(() => {
    if (!gmEnabled || !mkEnabled) return 0;
    return Math.min(gmMonthly, mkMonthly) * 0.1;
  }, [gmEnabled, mkEnabled, gmMonthly, mkMonthly]);

  const listMonthly = gmMonthly + mkMonthly;
  const afterBundle = listMonthly - bundleDiscount;
  const discountAmt = afterBundle * (discount / 100);
  const afterDiscount = afterBundle - discountAmt;
  const upfrontAmt = afterDiscount * (upfront / 100);
  const netMonthly = afterDiscount - upfrontAmt;
  const totalDiscount = listMonthly > 0
    ? ((listMonthly - netMonthly) / listMonthly) * 100
    : 0;
  const annualValue = netMonthly * months;
  const quarterly = netMonthly * 3;
  const savings = (listMonthly - netMonthly) * months;

  // Guardrail position: 0% discount = 100% (right), 50% = 0% (left)
  const guardrailPos = Math.max(0, Math.min(100, 100 - totalDiscount * 2));

  function guardrailStatus(): {
    label: string;
    color: string;
    bg: string;
  } {
    if (totalDiscount <= 10)
      return {
        label: "List price band. Any DRI can approve.",
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
      };
    if (totalDiscount <= 20)
      return {
        label: "Manager approval band. Pod DRI sign-off required.",
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
      };
    if (totalDiscount <= 30)
      return {
        label: "Floor zone. Senior manager sign-off required.",
        color: "text-amber-700",
        bg: "bg-amber-50 border-amber-200",
      };
    return {
      label: "Below floor. Walk away or offer 14 Day Pilot Sprint.",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
    };
  }

  const status = guardrailStatus();

  // ---- Scope label ----
  const gmScopeLabel = gmEnabled
    ? `Gen Media · ${GM_PLAN_LABELS[gmPlanType]}${gmPlanType === "volume" ? ` · ${items.find((i) => i.item_key === selectedGmTier)?.name ?? ""}` : ""}`
    : "";
  const mkScopeLabel = mkEnabled
    ? `Marketing · ${MK_PLAN_LABELS[mkPlanType]}${mkPlanType === "brand" ? ` · ${items.find((i) => i.item_key === selectedMkTier)?.name ?? ""}` : ""}`
    : "";

  // ---- Render ----
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ========== LEFT: CONFIG ========== */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 border-r bg-slate-50/50">
        {/* Step 1: Customer */}
        <section className="bg-card rounded-lg border overflow-hidden">
          <StepHeader label="1 · Customer" meta="Linked to Clients module" />
          <div className="p-4 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="sow-client" required>
                Client
              </FieldLabel>
              <Input
                id="sow-client"
                className="mt-1"
                placeholder="Client company name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="sow-brand">Brand name</FieldLabel>
              <Input
                id="sow-brand"
                className="mt-1"
                placeholder="Brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="sow-buyer" required>
                Buyer (CMO / Performance lead)
              </FieldLabel>
              <Input
                id="sow-buyer"
                className="mt-1"
                placeholder="Buyer name and title"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="sow-dri" required>
                Sales DRI (Fynd)
              </FieldLabel>
              <Input
                id="sow-dri"
                className="mt-1"
                placeholder="Sales DRI name"
                value={salesDri}
                onChange={(e) => setSalesDri(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Step 2: Market */}
        <section className="bg-card rounded-lg border overflow-hidden">
          <StepHeader label="2 · Market" />
          <div className="p-4 space-y-3">
            <div>
              <FieldLabel htmlFor="sow-tier" required>
                Region / Tier
              </FieldLabel>
              <div className="relative mt-1">
                <select
                  id="sow-tier"
                  className="h-9 w-full border rounded-md px-3 text-sm bg-transparent appearance-none pr-8"
                  value={selectedTierKey}
                  onChange={(e) => setSelectedTierKey(e.target.value)}
                >
                  {tiers.map((t) => (
                    <option key={t.tier_key} value={t.tier_key}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md flex items-center gap-4 text-sm">
              <span className="text-slate-600 font-semibold">Currency:</span>
              <span className="font-bold text-emerald-700">
                {currency} ({symbol})
              </span>
              <span className="text-slate-300">&middot;</span>
              <span className="text-slate-600">Multiplier:</span>
              <span className="font-bold text-emerald-700">
                {multiplier}&times;
              </span>
              <span className="text-slate-300">&middot;</span>
              <span className="text-slate-600">FX:</span>
              <span className="font-bold text-emerald-700">
                {symbol === "$"
                  ? `$1 = ₹${version.fx_rate}`
                  : `₹${version.fx_rate} / $1`}
              </span>
            </div>
          </div>
        </section>

        {/* Step 3: Services */}
        <section className="bg-card rounded-lg border overflow-hidden">
          <StepHeader label="3 · Services" />
          <div className="p-4">
            <p className="text-[11px] text-slate-500 mb-3">
              Pick one or both. When both are selected, 10% bundle discount is
              auto-applied on the smaller line.
            </p>
            <div className="flex gap-3">
              <ServiceChip
                active={gmEnabled}
                onToggle={() => {
                  setGmEnabled(!gmEnabled);
                  if (!gmEnabled) setActiveService("gm");
                }}
                title="Gen Media"
                subtitle="AI-native production · per-asset / retainer / pilot"
              />
              <ServiceChip
                active={mkEnabled}
                onToggle={() => {
                  setMkEnabled(!mkEnabled);
                  if (!mkEnabled) setActiveService("mk");
                }}
                title="Marketing"
                subtitle="Brand + performance · retainer / per-campaign"
              />
            </div>
            {gmEnabled && mkEnabled && (
              <div className="mt-3 bg-amber-50 border border-amber-300 px-3 py-2 rounded text-[11px] text-amber-800">
                <strong>Bundle active:</strong> 10% discount auto-applied on the
                smaller of Gen Media or Marketing line.
              </div>
            )}
          </div>
        </section>

        {/* Step 4: Configure Plan */}
        <section className="bg-card rounded-lg border overflow-hidden">
          <StepHeader
            label="4 · Configure plan"
            meta={[gmScopeLabel, mkScopeLabel].filter(Boolean).join(" + ")}
          />

          {/* Service tab switcher */}
          {gmEnabled && mkEnabled && (
            <div className="flex bg-white">
              <button
                className={cn(
                  "flex-1 py-2.5 text-[13px] font-bold text-center border-b-[3px] transition-all",
                  activeService === "gm"
                    ? "text-emerald-600 border-emerald-600 bg-emerald-50"
                    : "text-slate-500 border-slate-200 hover:text-emerald-600",
                )}
                onClick={() => setActiveService("gm")}
              >
                Gen Media
              </button>
              <button
                className={cn(
                  "flex-1 py-2.5 text-[13px] font-bold text-center border-b-[3px] transition-all",
                  activeService === "mk"
                    ? "text-emerald-600 border-emerald-600 bg-emerald-50"
                    : "text-slate-500 border-slate-200 hover:text-emerald-600",
                )}
                onClick={() => setActiveService("mk")}
              >
                Marketing
              </button>
            </div>
          )}

          {/* GM Config */}
          {gmEnabled && (activeService === "gm" || !mkEnabled) && (
            <>
              <PlanTabs
                tabs={Object.entries(GM_PLAN_LABELS).map(([k, v]) => ({
                  key: k,
                  label: v,
                }))}
                active={gmPlanType}
                onSelect={(k) => setGmPlanType(k as GmPlanType)}
              />
              {gmPlanType === "volume" && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {volumeItems.slice(0, 3).map((item) => (
                      <TierCard
                        key={item.item_key}
                        name={item.name}
                        price={fmtPrice(price(item.base_inr), symbol)}
                        unit={item.unit ?? "/mo"}
                        sla={item.sla ?? ""}
                        active={selectedGmTier === item.item_key}
                        onClick={() => setSelectedGmTier(item.item_key)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {gmPlanType === "alacarte" && (
                <div className="p-4">
                  <p className="text-[11px] text-slate-500 mb-3">
                    Select formats and quantities. Prices from active rate card{" "}
                    {version.version_label}.
                  </p>
                  <AlacarteTable
                    items={alacarteItems}
                    qtys={alacarteQtys}
                    setQtys={setAlacarteQtys}
                    symbol={symbol}
                    priceFn={price}
                  />
                </div>
              )}
              {gmPlanType === "pilot" && pilotItem && (
                <div className="p-4">
                  <div className="border-2 border-emerald-400 bg-emerald-50 rounded-lg p-4">
                    <div className="text-sm font-bold text-slate-900">
                      14 Day Pilot Sprint
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700 mt-1">
                      {fmtPrice(price(pilotItem.base_inr), symbol)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Floor:{" "}
                      {fmtPrice(
                        computeFloor(
                          price(pilotItem.base_inr),
                          pilotItem.floor_percent,
                        ),
                        symbol,
                      )}{" "}
                      &middot; If pilot misses customer baseline, customer pays
                      ~{symbol}50K direct cost only
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      <li>&bull; 1 short-form campaign vs customer baseline</li>
                      <li>&bull; 14 day window, brief-to-delivery</li>
                      <li>&bull; 60% retainer-conversion target</li>
                      <li>
                        &bull; Full production quality &mdash; not a
                        &ldquo;test&rdquo;
                      </li>
                    </ul>
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-[11px] text-amber-700">
                      <strong>Sales playbook:</strong> Use as a wedge when
                      customer won&apos;t commit to retainer. 60% convert to
                      Professional or higher within 60 days.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MK Config */}
          {mkEnabled && (activeService === "mk" || !gmEnabled) && (
            <>
              <PlanTabs
                tabs={Object.entries(MK_PLAN_LABELS).map(([k, v]) => ({
                  key: k,
                  label: v,
                }))}
                active={mkPlanType}
                onSelect={(k) => setMkPlanType(k as MkPlanType)}
              />
              {mkPlanType === "brand" && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {brandRetainerItems.slice(0, 3).map((item) => (
                      <TierCard
                        key={item.item_key}
                        name={item.name}
                        price={fmtPrice(price(item.base_inr), symbol)}
                        unit={item.unit ?? "/mo"}
                        sla={item.sla ?? ""}
                        notes={item.notes ?? undefined}
                        active={selectedMkTier === item.item_key}
                        onClick={() => setSelectedMkTier(item.item_key)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {mkPlanType === "campaign" && (
                <div className="p-4">
                  <p className="text-[11px] text-slate-500 mb-3">
                    Add campaigns on top of retainer or standalone. Price ranges
                    &mdash; final scoped per brief.
                  </p>
                  <QtyItemList
                    items={campaignItems}
                    qtys={campaignQtys}
                    setQtys={setCampaignQtys}
                    symbol={symbol}
                    priceFn={price}
                  />
                </div>
              )}
              {mkPlanType === "strategic" && (
                <div className="p-4">
                  <p className="text-[11px] text-slate-500 mb-3">
                    One-off strategic projects. Fixed pricing.
                  </p>
                  <QtyItemList
                    items={strategicItems}
                    qtys={strategicQtys}
                    setQtys={setStrategicQtys}
                    symbol={symbol}
                    priceFn={price}
                  />
                </div>
              )}
            </>
          )}

          {!gmEnabled && !mkEnabled && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Enable at least one service in Step 3 to configure a plan.
            </div>
          )}
        </section>

        {/* Step 5: Commercials */}
        <section className="bg-card rounded-lg border overflow-hidden">
          <StepHeader label="5 · Commercials & Negotiation guardrails" />
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel htmlFor="sow-discount" required>
                  Discount %
                </FieldLabel>
                <Input
                  id="sow-discount"
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  className="mt-1"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(
                      Math.min(50, Math.max(0, Number(e.target.value))),
                    )
                  }
                />
                {discount > 30 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Warning: Discount exceeds 30%. Requires VP approval.
                  </p>
                )}
              </div>
              <div>
                <FieldLabel htmlFor="sow-upfront">
                  Upfront commitment
                </FieldLabel>
                <div className="relative mt-1">
                  <select
                    id="sow-upfront"
                    className="h-9 w-full border rounded-md px-3 text-sm bg-transparent appearance-none pr-8"
                    value={upfront}
                    onChange={(e) => setUpfront(Number(e.target.value))}
                  >
                    {UPFRONT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="sow-months" required>
                  Months committed
                </FieldLabel>
                <Input
                  id="sow-months"
                  type="number"
                  min={1}
                  max={36}
                  className="mt-1"
                  value={months}
                  onChange={(e) =>
                    setMonths(
                      Math.min(36, Math.max(1, Number(e.target.value))),
                    )
                  }
                />
              </div>
            </div>

            {/* Guardrail bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 font-semibold">
                  Negotiation position
                </span>
                <span className="font-bold text-emerald-700">
                  {totalDiscount.toFixed(1)}% total
                </span>
              </div>
              <div className="h-9 rounded-lg relative flex overflow-hidden bg-gradient-to-r from-red-600 via-amber-500 via-50% via-lime-500 to-green-700">
                <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-white/90">
                  Walk-away
                </div>
                <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-white/90">
                  Floor
                </div>
                <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-white/90">
                  Manager
                </div>
                <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-white/90">
                  List
                </div>
                <div
                  className="absolute top-[-6px] bottom-[-6px] w-1 bg-slate-900 rounded"
                  style={{
                    left: `${guardrailPos}%`,
                    boxShadow: "0 0 0 2px white",
                  }}
                />
              </div>
              <div className="flex text-[11px] text-slate-500 font-semibold mt-1">
                <div className="flex-1 text-center">
                  Below floor
                  <br />
                  <span className="text-slate-400">walk-away</span>
                </div>
                <div className="flex-1 text-center">
                  Floor
                  <br />
                  <span className="text-slate-400">25-30%</span>
                </div>
                <div className="flex-1 text-center">
                  Manager band
                  <br />
                  <span className="text-slate-400">10-20%</span>
                </div>
                <div className="flex-1 text-center">
                  List
                  <br />
                  <span className="text-slate-400">0-10%</span>
                </div>
              </div>
            </div>

            {/* Authority status */}
            <div
              className={cn(
                "border rounded-md px-3 py-2 text-xs",
                status.bg,
                status.color,
              )}
            >
              <strong>
                {totalDiscount <= 10
                  ? "List price band."
                  : totalDiscount <= 20
                    ? "Manager approval band."
                    : totalDiscount <= 30
                      ? "Floor zone."
                      : "Below floor."}
              </strong>{" "}
              {status.label}
            </div>

            {/* Surcharges */}
            <div className="border-t pt-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase mb-2">
                Surcharges (not discountable)
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                {SURCHARGES.map((s) => (
                  <div
                    key={s.label}
                    className="flex justify-between bg-slate-50 rounded px-2 py-1.5"
                  >
                    <span>{s.label}</span>
                    <span className="font-semibold text-red-600">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={() => toast.info("Draft saved (mock)")}
          >
            Save Draft
          </Button>
          <Button
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => toast.success("Statement of Work generated (mock)")}
          >
            Generate Statement of Work &rarr;
          </Button>
        </div>
      </div>

      {/* ========== RIGHT: LIVE PREVIEW ========== */}
      <div className="w-[400px] shrink-0 bg-white flex flex-col overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0">
          <span>Live preview</span>
          <span className="font-normal opacity-70">
            {selectedTier.name} &middot; {currency} &middot; {multiplier}&times;
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Customer */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Customer
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {clientName || "—"}
            </div>
            <div className="text-[11px] text-slate-500">
              {[buyerName, salesDri].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>

          {/* Scope */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">
              Scope &middot;{" "}
              {[gmScopeLabel, mkScopeLabel].filter(Boolean).join(" + ") ||
                "No services selected"}
            </div>
            {gmEnabled && gmPlanType === "volume" && (
              <div className="bg-slate-50 rounded-lg border p-3 text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-900 text-xs mb-1">
                  {items.find((i) => i.item_key === selectedGmTier)?.name} plan
                  deliverables
                </div>
                <p className="text-slate-500 italic">
                  {items.find((i) => i.item_key === selectedGmTier)?.notes}
                </p>
              </div>
            )}
            {gmEnabled && gmPlanType === "alacarte" && (
              <div className="bg-slate-50 rounded-lg border overflow-hidden">
                {alacarteItems
                  .filter((item) => (alacarteQtys[item.item_key] ?? 0) > 0)
                  .map((item) => {
                    const qty = alacarteQtys[item.item_key] ?? 0;
                    const total = qty * price(item.base_inr);
                    return (
                      <div
                        key={item.item_key}
                        className="flex justify-between px-3 py-1.5 border-b last:border-0 text-[11px]"
                      >
                        <span className="text-slate-700">{item.name}</span>
                        <span className="font-semibold">
                          {qty} &times; {fmtPrice(price(item.base_inr), symbol)}{" "}
                          = {fmtPrice(total, symbol)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Commercials */}
          {listMonthly > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">
                Commercials
              </div>
              <div className="space-y-1.5">
                <PreviewLine
                  label="List price"
                  value={`${fmtPrice(listMonthly, symbol)} /mo`}
                />
                {bundleDiscount > 0 && (
                  <PreviewLine
                    label="Bundle discount (10%)"
                    value={`-${fmtPrice(Math.round(bundleDiscount), symbol)}`}
                    negative
                  />
                )}
                {discount > 0 && (
                  <PreviewLine
                    label={`Discount (${discount}%)`}
                    value={`-${fmtPrice(Math.round(discountAmt), symbol)}`}
                    negative
                  />
                )}
                {upfront > 0 && (
                  <PreviewLine
                    label={`${UPFRONT_OPTIONS.find((o) => o.value === upfront)?.label ?? ""} (${upfront}%)`}
                    value={`-${fmtPrice(Math.round(upfrontAmt), symbol)}`}
                    negative
                  />
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-900">Net monthly</span>
                    <span className="text-emerald-700">
                      {fmtPrice(Math.round(netMonthly), symbol)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment schedule */}
          {listMonthly > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">
                Payment schedule &middot; {months} months &middot;{" "}
                {UPFRONT_OPTIONS.find((o) => o.value === upfront)?.label}
              </div>
              {upfront === 5 && months >= 3 ? (
                <div className="bg-slate-50 rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-4 text-center text-[11px] font-semibold text-slate-500 bg-slate-100 py-1.5">
                    {Array.from(
                      { length: Math.min(4, Math.ceil(months / 3)) },
                      (_, i) => (
                        <div key={i}>Q{i + 1}</div>
                      ),
                    )}
                  </div>
                  <div className="grid grid-cols-4 text-center text-xs font-bold text-slate-900 py-2">
                    {Array.from(
                      { length: Math.min(4, Math.ceil(months / 3)) },
                      (_, i) => (
                        <div key={i}>
                          {fmtPrice(Math.round(quarterly), symbol)}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg border p-3 text-xs text-slate-700">
                  {fmtPrice(Math.round(netMonthly), symbol)} &times; {months}{" "}
                  months
                </div>
              )}
            </div>
          )}

          {/* Total summary */}
          {listMonthly > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    {months >= 12
                      ? "Annual contract value"
                      : `${months}-month value`}
                  </div>
                  <div className="text-xl font-extrabold text-emerald-800">
                    {fmtPrice(Math.round(annualValue), symbol)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    Effective monthly
                  </div>
                  <div className="text-xl font-extrabold text-emerald-800">
                    {fmtPrice(Math.round(netMonthly), symbol)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-200 text-[11px] text-emerald-700">
                <span>
                  <strong>Total discount:</strong> {totalDiscount.toFixed(1)}%
                  off list
                </span>
                <span>&middot;</span>
                <span>
                  <strong>Savings:</strong>{" "}
                  {fmtPrice(Math.round(savings), symbol)} /{months >= 12 ? "yr" : `${months}mo`}
                </span>
                <span>&middot;</span>
                <span>
                  <strong>Rate card:</strong> {version.version_label}
                </span>
              </div>
            </div>
          )}

          {/* SLA summary */}
          {gmEnabled && gmPlanType === "volume" && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">
                SLA summary
              </div>
              <div className="space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>First delivery</span>
                  <span className="font-semibold">
                    {items.find((i) => i.item_key === selectedGmTier)?.sla ??
                      "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Revision turnaround</span>
                  <span className="font-semibold">24 hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly review call</span>
                  <span className="font-semibold">Included</span>
                </div>
                <div className="flex justify-between">
                  <span>Pod DRI response</span>
                  <span className="font-semibold">Same business day</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview footer */}
        <div className="border-t px-4 py-3 bg-slate-50 shrink-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => toast.info("PDF export (mock)")}
          >
            Export PDF
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => toast.info("SoW preview (mock)")}
          >
            Preview SoW Document
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ServiceChip({
  active,
  onToggle,
  title,
  subtitle,
}: {
  active: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex-1 px-4 py-3 border-2 rounded-lg flex items-center gap-3 text-left transition-all",
        active
          ? "border-emerald-500 bg-emerald-50"
          : "border-slate-200 hover:border-emerald-500",
      )}
      onClick={onToggle}
      role="checkbox"
      aria-checked={active}
    >
      <div
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold shrink-0",
          active
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300",
        )}
      >
        {active && <Check className="size-3" />}
      </div>
      <div>
        <div className="text-[11px] text-slate-500 uppercase font-semibold">
          Line of business
        </div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500">{subtitle}</div>
      </div>
    </button>
  );
}

function PlanTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="px-3 pt-3 flex gap-1 border-b">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={cn(
            "px-4 py-2 text-xs font-semibold border-b-2 transition-colors",
            active === t.key
              ? "text-emerald-600 border-emerald-600"
              : "text-slate-500 border-transparent hover:text-slate-900",
          )}
          onClick={() => onSelect(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TierCard({
  name,
  price: priceStr,
  unit,
  sla,
  notes,
  active,
  onClick,
}: {
  name: string;
  price: string;
  unit: string;
  sla: string;
  notes?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative border-2 rounded-lg p-3 text-left transition-all",
        active
          ? "border-emerald-500 bg-emerald-50 shadow-[0_0_0_1px_#059669]"
          : "border-slate-200 hover:border-emerald-500",
      )}
      onClick={onClick}
    >
      {active && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
          <Check className="size-3" />
        </div>
      )}
      <div className="text-xs font-bold text-slate-900">{name}</div>
      <div className="text-lg font-extrabold text-emerald-700 mt-1">
        {priceStr}
        <span className="text-[11px] font-normal text-slate-500 ml-1">
          {unit}
        </span>
      </div>
      <div className="text-[11px] text-slate-500 italic mt-1">{sla}</div>
      {notes && (
        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{notes}</p>
      )}
    </button>
  );
}

function AlacarteTable({
  items: alacarteItems,
  qtys,
  setQtys,
  symbol,
  priceFn,
}: {
  items: RateCardItem[];
  qtys: Record<string, number>;
  setQtys: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  symbol: string;
  priceFn: (baseInr: number) => number;
}) {
  const total = alacarteItems.reduce((sum, item) => {
    const qty = qtys[item.item_key] ?? 0;
    return sum + qty * priceFn(item.base_inr);
  }, 0);

  return (
    <>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2fr_0.6fr_0.8fr_80px_1fr] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase">
          <div>Format</div>
          <div className="text-center">Length</div>
          <div className="text-right">Unit price</div>
          <div className="text-center">Qty</div>
          <div className="text-right">Line total</div>
        </div>
        {alacarteItems.map((item) => {
          const qty = qtys[item.item_key] ?? 0;
          const lineTotal = qty * priceFn(item.base_inr);
          return (
            <div
              key={item.item_key}
              className="grid grid-cols-[2fr_0.6fr_0.8fr_80px_1fr] gap-2 items-center px-3 py-2 border-t text-xs hover:bg-slate-50/50"
            >
              <div>
                <div className="font-medium text-slate-900">{item.name}</div>
                {item.sla && (
                  <div className="text-[11px] text-slate-500">
                    {item.sla} SLA
                  </div>
                )}
              </div>
              <div className="text-center text-slate-500">
                {item.length ?? "—"}
              </div>
              <div className="text-right font-semibold text-emerald-700">
                {fmtPrice(priceFn(item.base_inr), symbol)}
              </div>
              <div className="text-center">
                <input
                  type="number"
                  min={0}
                  className="w-14 h-7 px-1.5 text-xs text-center border rounded bg-white text-emerald-700 font-bold focus:outline-emerald-500"
                  value={qty}
                  onChange={(e) =>
                    setQtys((prev) => ({
                      ...prev,
                      [item.item_key]: Math.max(0, Number(e.target.value)),
                    }))
                  }
                />
              </div>
              <div className="text-right font-bold text-slate-900">
                {qty > 0 ? fmtPrice(lineTotal, symbol) : "—"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end">
        <div className="text-right">
          <div className="text-[11px] text-slate-500">Subtotal</div>
          <div className="text-lg font-extrabold text-slate-900">
            {fmtPrice(Math.round(total), symbol)}
          </div>
        </div>
      </div>
    </>
  );
}

function QtyItemList({
  items: listItems,
  qtys,
  setQtys,
  symbol,
  priceFn,
}: {
  items: RateCardItem[];
  qtys: Record<string, number>;
  setQtys: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  symbol: string;
  priceFn: (baseInr: number) => number;
}) {
  return (
    <div className="space-y-2">
      {listItems.map((item) => {
        const qty = qtys[item.item_key] ?? 0;
        return (
          <div
            key={item.item_key}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50"
          >
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-900">
                {item.name}
              </div>
              {item.description && (
                <div className="text-[11px] text-slate-500">
                  {item.description}
                </div>
              )}
              {item.sla && (
                <div className="text-[11px] text-slate-500">{item.sla}</div>
              )}
              {item.notes && (
                <div className="text-[11px] text-emerald-600 font-medium">
                  {item.notes}
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-emerald-700">
              {fmtPrice(priceFn(item.base_inr), symbol)}
            </div>
            <input
              type="number"
              min={0}
              className="w-14 h-7 px-1.5 text-xs text-center border rounded bg-white text-emerald-700 font-bold focus:outline-emerald-500"
              value={qty}
              onChange={(e) =>
                setQtys((prev) => ({
                  ...prev,
                  [item.item_key]: Math.max(0, Number(e.target.value)),
                }))
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function PreviewLine({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <span className={cn("font-semibold", negative ? "text-red-600" : "text-slate-900")}>
        {value}
      </span>
    </div>
  );
}
