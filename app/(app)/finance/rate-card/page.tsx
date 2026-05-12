import { connection } from "next/server";
import { getActiveVersion, getVersions, getVersionData, getChangeLog } from "./actions";
import { RateCardClient } from "./_client";

export default async function RateCardPage() {
  await connection();

  const [activeVersion, versions] = await Promise.all([
    getActiveVersion().catch(() => null),
    getVersions().catch(() => []),
  ]);

  let tiers: Awaited<ReturnType<typeof getVersionData>>["tiers"] = [];
  let items: Awaited<ReturnType<typeof getVersionData>>["items"] = [];
  let deliverables: Awaited<ReturnType<typeof getVersionData>>["deliverables"] = [];
  let changes: Awaited<ReturnType<typeof getChangeLog>> = [];

  if (activeVersion) {
    const [data, log] = await Promise.all([
      getVersionData(activeVersion.id).catch(() => ({ tiers: [], items: [], deliverables: [] })),
      getChangeLog(activeVersion.id).catch(() => []),
    ]);
    tiers = data.tiers;
    items = data.items;
    deliverables = data.deliverables;
    changes = log;
  }

  return (
    <RateCardClient
      initialVersion={activeVersion}
      initialVersions={versions}
      initialTiers={tiers}
      initialItems={items}
      initialDeliverables={deliverables}
      initialChanges={changes}
    />
  );
}
