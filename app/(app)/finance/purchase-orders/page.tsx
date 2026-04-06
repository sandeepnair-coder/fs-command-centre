import { connection } from "next/server";
import { getPurchaseOrders, getVendors, getActiveProjects } from "../actions";
import { PurchaseOrdersClient } from "./_client";

export default async function PurchaseOrdersPage() {
  await connection();

  const [pos, vendors, projects] = await Promise.all([
    getPurchaseOrders().catch(() => []),
    getVendors().catch(() => []),
    getActiveProjects().catch(() => []),
  ]);

  return (
    <PurchaseOrdersClient
      initialPOs={pos}
      initialVendors={vendors}
      initialProjects={projects}
    />
  );
}
