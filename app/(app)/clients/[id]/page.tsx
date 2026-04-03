import { notFound } from "next/navigation";
import { getClientById } from "@/app/(app)/clients/actions";
import { ClientProfile } from "@/components/modules/clients/ClientProfile";

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let client;
  try {
    client = await getClientById(id);
  } catch {
    notFound();
  }

  return <ClientProfile client={client} />;
}
