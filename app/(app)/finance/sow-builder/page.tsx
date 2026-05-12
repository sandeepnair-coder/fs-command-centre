import { SoWBuilderClient } from "./_client";
import { MOCK_VERSION, MOCK_TIERS, MOCK_ITEMS } from "@/lib/rate-card/mock-data";

export default function SoWBuilderPage() {
  return (
    <SoWBuilderClient
      version={MOCK_VERSION}
      tiers={MOCK_TIERS}
      items={MOCK_ITEMS}
    />
  );
}
