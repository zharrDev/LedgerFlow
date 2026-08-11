import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { ChatOpenAI } from "@langchain/openai";
import { createGetCashFlowTool } from "../tools/cashflow.tool.js";
import { createGetMonthlyCashFlowTool } from "../tools/report.tool.js";
import { createGetTopExpenseAccountsTool } from "../tools/expense-account.tool.js";
import { createGetTransactionsTool } from "../tools/transaction.tool.js";
import { RISK_SYSTEM_PROMPT } from "../prompts/report.prompt.js";

// Risk Agent — spesialis deteksi risiko keuangan. Punya akses ke semua data.
export function createRiskAgent(llm: ChatOpenAI, companyId: string) {
  return createReactAgent({
    llm,
    messageModifier: RISK_SYSTEM_PROMPT,
    tools: [
      createGetCashFlowTool(companyId),
      createGetMonthlyCashFlowTool(companyId),
      createGetTopExpenseAccountsTool(companyId),
      createGetTransactionsTool(companyId),
    ],
  });
}
