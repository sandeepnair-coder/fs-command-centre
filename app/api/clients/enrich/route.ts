import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichClient } from "@/lib/openclaw/client";

const CLEARBIT_URL = "https://autocomplete.clearbit.com/v1/companies/suggest";

type EnrichmentLog = {
  fields_updated: string[];
  facts_written: number;
  sources_checked: string[];
  skipped: string[];
  errors: string[];
};

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 8000) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

// ─── Web discovery: Wikipedia, Clearbit, Website scraping ────────────────────

async function discoverFromWeb(name: string, website?: string | null) {
  const result: Record<string, { value: string; source: string; confidence: "high" | "medium" | "low" }> = {};
  const sources: string[] = [];
  const errors: string[] = [];

  // 1) Clearbit company suggest
  try {
    sources.push("clearbit");
    const res = await fetchWithTimeout(`${CLEARBIT_URL}?query=${encodeURIComponent(name)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const match = data[0];
        if (match.domain && !website) {
          result.website = { value: `https://${match.domain}`, source: "clearbit", confidence: "high" };
        }
        if (match.logo) {
          result.logo_url = { value: match.logo, source: "clearbit", confidence: "high" };
        }
        if (match.name) {
          result.company_name = { value: match.name, source: "clearbit", confidence: "medium" };
        }
      }
    }
  } catch (e) {
    errors.push(`clearbit: ${(e as Error).message}`);
  }

  // 2) Wikipedia summary
  try {
    sources.push("wikipedia");
    const wikiRes = await fetchWithTimeout(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
    );
    if (wikiRes.ok) {
      const wiki = await wikiRes.json();
      if (wiki.extract && wiki.type !== "disambiguation") {
        result.client_summary = { value: wiki.extract.substring(0, 600), source: "wikipedia", confidence: "high" };
        if (wiki.description) {
          result.wikipedia_description = { value: wiki.description, source: "wikipedia", confidence: "high" };
        }
      }
    }
  } catch (e) {
    errors.push(`wikipedia: ${(e as Error).message}`);
  }

  // 3) Website scraping (meta tags, social links, brand clues)
  const siteUrl = website || result.website?.value;
  if (siteUrl) {
    try {
      sources.push("website");
      const siteRes = await fetchWithTimeout(siteUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FyndStudioBot/1.0)" },
        redirect: "follow",
      }, 10000);
      if (siteRes.ok) {
        const html = await siteRes.text();

        // Meta tags
        const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
        const metaDesc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
        const ogTitle = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i);
        const title = html.match(/<title>([^<]+)<\/title>/i);

        if (ogDesc?.[1] && !result.client_summary) {
          result.brand_description = { value: ogDesc[1].substring(0, 500), source: "website:og", confidence: "high" };
        }
        if (metaDesc?.[1] && !result.brand_description) {
          result.brand_description = { value: metaDesc[1].substring(0, 500), source: "website:meta", confidence: "high" };
        }
        if (ogTitle?.[1]) {
          result.display_name = { value: ogTitle[1], source: "website:og", confidence: "medium" };
        }

        // Social links
        const socialPatterns: Record<string, RegExp> = {
          instagram: /https?:\/\/(?:www\.)?instagram\.com\/([^"'\s/?#]+)/i,
          facebook: /https?:\/\/(?:www\.)?facebook\.com\/([^"'\s/?#]+)/i,
          twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([^"'\s/?#]+)/i,
          linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([^"'\s/?#]+)/i,
          youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/|user\/)?([^"'\s/?#]+)/i,
        };
        for (const [platform, regex] of Object.entries(socialPatterns)) {
          const match = html.match(regex);
          if (match) {
            const handle = platform === "instagram" || platform === "twitter" ? `@${match[1]}` : match[0];
            result[platform] = { value: handle, source: "website:scrape", confidence: "high" };
          }
        }

        // Brand colors
        const colors = [...new Set((html.match(/#[0-9a-fA-F]{6}/g) || []))].slice(0, 3);
        if (colors.length > 0) {
          result.brand_color_primary = { value: colors[0], source: "website:css", confidence: "medium" };
          if (colors.length > 1) result.brand_color_secondary = { value: colors[1], source: "website:css", confidence: "low" };
        }

        // Tagline from title
        if (title?.[1]) {
          const tagline = title[1].replace(name, "").replace(/[-|–—]/g, "").trim();
          if (tagline.length > 3 && tagline.length < 200) {
            result.tagline = { value: tagline, source: "website:title", confidence: "medium" };
          }
        }
      }
    } catch (e) {
      errors.push(`website: ${(e as Error).message}`);
    }
  }

  // 4) Industry inference from description/summary
  if (!result.industry) {
    const text = Object.values(result).map(v => v.value).join(" ");
    const industryMap: [RegExp, string][] = [
      [/beverage|drink|cola|soda|juice|water|energy drink/i, "Beverages"],
      [/food|restaurant|dining|cuisine|snack|cereal/i, "Food & Beverage"],
      [/tech|software|digital|platform|app|SaaS|cloud|AI/i, "Technology"],
      [/fashion|clothing|apparel|luxury|wear|denim/i, "Fashion & Apparel"],
      [/auto|car|motor|vehicle|mobility/i, "Automotive"],
      [/bank|finance|invest|insurance|fintech/i, "Financial Services"],
      [/health|pharma|medical|wellness|fitness/i, "Healthcare & Wellness"],
      [/media|entertainment|music|film|streaming/i, "Media & Entertainment"],
      [/retail|store|shop|e-commerce|marketplace/i, "Retail"],
      [/telecom|mobile|network|5G|broadband/i, "Telecommunications"],
      [/sport|athletic|outdoor|adventure/i, "Sports & Outdoors"],
      [/beauty|cosmetic|skincare|makeup/i, "Beauty & Cosmetics"],
      [/education|school|university|learning/i, "Education"],
      [/real.estate|property|housing/i, "Real Estate"],
      [/travel|hotel|tourism|airline|hospitality/i, "Travel & Hospitality"],
      [/wholesale|cash.and.carry|B2B/i, "Wholesale"],
      [/luggage|travel.*accessor|bag/i, "Luggage & Travel Accessories"],
      [/electronics|gadget|device|appliance/i, "Electronics"],
      [/pizza|burger|fast.food|QSR/i, "Quick Service Restaurants"],
    ];
    for (const [regex, industry] of industryMap) {
      if (regex.test(text)) {
        result.industry = { value: industry, source: "inferred", confidence: "medium" };
        break;
      }
    }
  }

  return { discoveries: result, sources, errors };
}

// ─── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { client_id, name, email, website } = await req.json();
    if (!client_id || !name) {
      return NextResponse.json({ error: "client_id and name required" }, { status: 400 });
    }

    const supabase = await createClient();
    const log: EnrichmentLog = { fields_updated: [], facts_written: 0, sources_checked: [], skipped: [], errors: [] };

    // Get current client state (to avoid overwriting manually-entered values)
    const { data: currentClient } = await supabase.from("clients").select("*").eq("id", client_id).single();
    if (!currentClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // ── Phase 1: Web discovery (Clearbit, Wikipedia, website scraping) ────────
    const { discoveries, sources, errors } = await discoverFromWeb(name, website || currentClient.website);
    log.sources_checked.push(...sources);
    log.errors.push(...errors);

    // ── Phase 2: OpenClaw AI enrichment ──────────────────────────────────────
    let openclawSuggestions: { key: string; value: string; confidence: string; source?: string }[] = [];
    try {
      log.sources_checked.push("openclaw-ai");
      const domain = (website || currentClient.website || "")
        .replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      const result = await enrichClient({
        name,
        email: email || currentClient.primary_email || undefined,
        website: website || currentClient.website || undefined,
        domain: domain || undefined,
      });
      openclawSuggestions = result.suggestions || [];
    } catch (e) {
      log.errors.push(`openclaw: ${(e as Error).message}`);
    }

    // ── Phase 3: Update client overview fields (only empty ones) ─────────────
    const clientUpdates: Record<string, unknown> = {};

    const fieldMap: Record<string, string> = {
      company_name: "company_name",
      display_name: "display_name",
      website: "website",
      logo_url: "logo_url",
      industry: "industry",
    };

    for (const [discoveryKey, dbField] of Object.entries(fieldMap)) {
      const found = discoveries[discoveryKey];
      if (found && !currentClient[dbField]) {
        clientUpdates[dbField] = found.value;
        log.fields_updated.push(dbField);
      } else if (found && currentClient[dbField]) {
        log.skipped.push(`${dbField} (already set)`);
      }
    }

    if (Object.keys(clientUpdates).length > 0) {
      clientUpdates.updated_at = new Date().toISOString();
      await supabase.from("clients").update(clientUpdates).eq("id", client_id);
    }

    // ── Phase 4: Write client_facts (from web discovery + OpenClaw AI) ───────
    const factKeys = [
      "client_summary", "brand_description", "wikipedia_description", "tagline",
      "instagram", "facebook", "twitter", "linkedin", "youtube",
      "brand_color_primary", "brand_color_secondary",
    ];

    // Web-discovered facts
    for (const key of factKeys) {
      const found = discoveries[key];
      if (!found) continue;

      const { data: existing } = await supabase
        .from("client_facts")
        .select("id, verification_status")
        .eq("client_id", client_id)
        .eq("key", key)
        .maybeSingle();

      if (existing?.verification_status === "verified") {
        log.skipped.push(`fact:${key} (verified)`);
        continue;
      }

      await supabase.from("client_facts").upsert({
        client_id,
        key,
        value: found.value,
        verification_status: "inferred",
        confidence: found.confidence,
        source_count: 1,
        last_observed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "client_id,key", ignoreDuplicates: false });
      log.facts_written++;
    }

    // OpenClaw AI suggestions
    for (const s of openclawSuggestions) {
      if (!s.key?.trim() || !s.value?.trim()) continue;

      const { data: existing } = await supabase
        .from("client_facts")
        .select("id, verification_status")
        .eq("client_id", client_id)
        .eq("key", s.key.trim())
        .maybeSingle();

      if (existing?.verification_status === "verified") {
        log.skipped.push(`fact:${s.key} (verified)`);
        continue;
      }

      await supabase.from("client_facts").upsert({
        client_id,
        key: s.key.trim(),
        value: s.value.trim(),
        verification_status: "inferred",
        confidence: (s.confidence as "high" | "medium" | "low") || "medium",
        source_count: 1,
        last_observed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "client_id,key", ignoreDuplicates: false });
      log.facts_written++;
    }

    // ── Phase 5: Audit log ───────────────────────────────────────────────────
    const totalEnriched = log.fields_updated.length + log.facts_written;
    const status = totalEnriched > 0
      ? (log.errors.length > 0 ? "partial" : "completed")
      : (log.errors.length > 0 ? "failed" : "no_data_found");

    await supabase.from("audit_log_events").insert({
      actor_type: "system",
      actor_id: null,
      event_type: "client_auto_enriched",
      entity_type: "client",
      entity_id: client_id,
      metadata_json: JSON.stringify({
        status,
        fields_updated: log.fields_updated,
        facts_written: log.facts_written,
        sources_checked: log.sources_checked,
        skipped: log.skipped,
        errors: log.errors.length > 0 ? log.errors : undefined,
      }),
    });

    return NextResponse.json({
      enriched: totalEnriched,
      status,
      fields_updated: log.fields_updated,
      facts_written: log.facts_written,
      sources_checked: log.sources_checked,
    });
  } catch (err) {
    console.error("[enrich-client]", err);
    return NextResponse.json({ enriched: 0, error: (err as Error).message }, { status: 200 });
  }
}
