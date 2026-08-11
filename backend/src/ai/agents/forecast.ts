import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { ChatOpenAI } from "@langchain/openai";
import { createGetMonthlyCashFlowTool } from "../tools/report.tool.js";
import { createGetTopExpenseAccountsTool } from "../tools/expense-account.tool.js";
import { createGetTransactionsTool } from "../tools/transaction.tool.js";
import { FORECAST_SYSTEM_PROMPT } from "../prompts/report.prompt.js";

// Forecast Agent — spesialis perkiraan/proyeksi. Pakai data historis.
export function createForecastAgent(llm: ChatOpenAI, companyId: string) {
  return createReactAgent({
    llm,
    messageModifier: FORECAST_SYSTEM_PROMPT,
    tools: [
      createGetMonthlyCashFlowTool(companyId),
      createGetTopExpenseAccountsTool(companyId),
      createGetTransactionsTool(companyId),
    ],
  });
}
