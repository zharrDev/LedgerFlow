import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { ChatOpenAI } from "@langchain/openai";
import { createGetCashFlowTool } from "../tools/cashflow.tool.js";
import { createGetMonthlyCashFlowTool } from "../tools/report.tool.js";
import { CASHFLOW_SYSTEM_PROMPT } from "../prompts/cashflow.prompt.js";

// Cash Flow Agent — spesialis arus kas. Hanya pakai tool arus kas.
export function createCashflowAgent(llm: ChatOpenAI, companyId: string) {
  return createReactAgent({
    llm,
    messageModifier: CASHFLOW_SYSTEM_PROMPT,
    tools: [createGetCashFlowTool(companyId), createGetMonthlyCashFlowTool(companyId)],
  });
}
