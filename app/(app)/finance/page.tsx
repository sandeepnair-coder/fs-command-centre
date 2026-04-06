import { connection } from "next/server";
import { getFinanceKPIs, getRecentActivity, getExpenseSummary, getProjectFinancials } from "./actions";
import { FinanceOverviewClient } from "./_overview-client";

export default async function FinanceOverviewPage() {
  await connection();

  const [kpis, activity, expenseSummary, projectFinancials] = await Promise.all([
    getFinanceKPIs().catch(() => ({
      totalRevenue: 0, totalExpenses: 0, netProfit: 0,
      outstandingReceivables: 0, outstandingPayables: 0,
      revenueChange: 0, expenseChange: 0,
    })),
    getRecentActivity().catch(() => []),
    getExpenseSummary().catch(() => null),
    getProjectFinancials().catch(() => []),
  ]);

  return (
    <FinanceOverviewClient
      kpis={kpis}
      activity={activity}
      expenseSummary={expenseSummary}
      projectFinancials={projectFinancials}
    />
  );
}
