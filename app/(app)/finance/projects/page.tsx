import { connection } from "next/server";
import { getProjectFinancials } from "../actions";
import { ProjectFinancialsClient } from "./_client";

export default async function ProjectFinancialsPage() {
  await connection();

  const data = await getProjectFinancials().catch(() => []);
  return <ProjectFinancialsClient initialData={data} />;
}
