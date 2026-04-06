import { connection } from "next/server";
import { getExpenses, getActiveProjects, getExpenseSummary } from "../actions";
import { ExpensesClient } from "./_client";

export default async function ExpensesPage() {
  await connection();

  const [expenses, projects, summary] = await Promise.all([
    getExpenses().catch(() => []),
    getActiveProjects().catch(() => []),
    getExpenseSummary().catch(() => null),
  ]);

  return (
    <ExpensesClient
      initialExpenses={expenses}
      initialProjects={projects}
      initialSummary={summary}
    />
  );
}
