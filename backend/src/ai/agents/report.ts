import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { ChatOpenAI } from "@langchain/openai";
import { createGetCashFlowTool } from "../tools/cashflow.tool.js";
import { createGetTopExpenseAccountsTool } from "../tools/expense-account.tool.js";
import { createGetTransactionsTool } from "../tools/transaction.tool.js";
import { REPORT_SYSTEM_PROMPT } from "../prompts/report.prompt.js";

// Report Agent — spesialis laporan & transaksi umum.
export function createReportAgent(llm: ChatOpenAI, companyId: string) {
  return createReactAgent({
    llm,
    messageModifier: REPORT_SYSTEM_PROMPT,
    tools: [
      createGetCashFlowTool(companyId),
      createGetTopExpenseAccountsTool(companyId),
      createGetTransactionsTool(companyId),
    ],
  });
}
