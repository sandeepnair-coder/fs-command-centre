import { connection } from "next/server";
import { getInvoices, getActiveProjects } from "../actions";
import { InvoicesClient } from "./_client";

export default async function InvoicesPage() {
  await connection();

  const [invoices, projects] = await Promise.all([
    getInvoices().catch(() => []),
    getActiveProjects().catch(() => []),
  ]);

  return (
    <InvoicesClient
      initialInvoices={invoices}
      initialProjects={projects}
    />
  );
}
