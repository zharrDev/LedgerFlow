import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { createChatModel } from "../models/provider.js";
import { createCashflowAgent } from "../agents/cashflow.js";
import { createForecastAgent } from "../agents/forecast.js";
import { createReportAgent } from "../agents/report.js";
import { createRiskAgent } from "../agents/risk.js";
import { routeMessage, type AgentKind } from "./router.js";

// ─── State ────────────────────────────────────────────────────────────
// Hanya menyimpan riwayat pesan; companyId TIDAK pernah masuk ke state graph
// (tools sudah di-bind companyId saat agent dibuat per-request).
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  agent: Annotation<AgentKind>({
    reducer: (_left, right) => right,
    default: () => "report" as AgentKind,
  }),
});

// ─── Graph per-request ────────────────────────────────────────────────
// companyId dari JWT (endpoint), di-bind ke tools via closure. Graph dibuat
// fresh tiap request karena tenant berbeda → tools berbeda.
export async function createAIGraph(companyId: string) {
  const llm = createChatModel();

  const cashflowAgent = createCashflowAgent(llm, companyId);
  const forecastAgent = createForecastAgent(llm, companyId);
  const reportAgent = createReportAgent(llm, companyId);
  const riskAgent = createRiskAgent(llm, companyId);

  async function runAgent(agent: ReturnType<typeof createReportAgent>, state: typeof GraphState.State) {
    const result = await agent.invoke({ messages: state.messages });
    return { messages: result.messages };
  }

  const graph = new StateGraph(GraphState)
    .addNode("router", (state) => ({
      agent: routeMessage(state.messages[state.messages.length - 1]?.content?.toString() || ""),
    }))
    .addNode("cashflow_agent", (state) => runAgent(cashflowAgent, state))
    .addNode("forecast_agent", (state) => runAgent(forecastAgent, state))
    .addNode("report_agent", (state) => runAgent(reportAgent, state))
    .addNode("risk_agent", (state) => runAgent(riskAgent, state))
    .addEdge(START, "router")
    .addConditionalEdges("router", (state) => state.agent, {
      cashflow: "cashflow_agent",
      forecast: "forecast_agent",
      report: "report_agent",
      risk: "risk_agent",
    })
    .addEdge("cashflow_agent", END)
    .addEdge("forecast_agent", END)
    .addEdge("report_agent", END)
    .addEdge("risk_agent", END);

  return graph.compile();
}
