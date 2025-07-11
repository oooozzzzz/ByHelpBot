// базовый граф работы ИИ. Паттерн называется ReAct Agent. Подробнее о нем можно почитать на сайте langchain

import {
  Annotation,
  Messages,
  messagesStateReducer,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { LLM } from "./RAG_class.js";
import "dotenv/config";
import { AIMessage, BaseMessage } from "@langchain/core/messages.js";
import {
  getDateMastersInfo,
  getRecordsInfo,
  getServicesInfo,
  getUserMastersInfo,
  getParticularServiceInfo,
  createClientRecord,
  serviceTimes,
  freeEmployees,
  getClientEmployees,
  getAnyInfo,
  masterSchedule,
} from "./tools";
import { getSystemPrompt } from "./systemPrompt";
import { getThread } from "../services/db";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const StateAnnotation = Annotation.Root({
  annotation: Annotation<string>({
    reducer: (prev, next) => prev.concat(next),
  }),
  messages: Annotation<BaseMessage[], Messages>({
    reducer: messagesStateReducer,
  }),
});

// формируем список инструментов, чтобы разом прокинуть их в модель
const tools: any[] = [
  getUserMastersInfo,
  getRecordsInfo,
  getDateMastersInfo,
  getServicesInfo,
  getParticularServiceInfo,
  createClientRecord,
  serviceTimes,
  freeEmployees,
  getClientEmployees,
  getAnyInfo,
  masterSchedule,
];
const toolNode = new ToolNode(tools, { handleToolErrors: true });
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: "https://api.proxyapi.ru/google",
});
function shouldContinue(state: typeof StateAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
}

async function callModel(state: typeof StateAnnotation.State, config: any) {
  // вторым аргументом берем конфигурацию. Это нужно, чтобы определять thread_id и по нему искать информацию в БД о клиенте и филиале, в котором он находится
  const thread = config.configurable.thread_id;
  const clientInfo = await getThread(parseInt(thread));
  const modelWithTools = model.bindTools(tools);
  const systemPrompt = await getSystemPrompt(
    clientInfo?.branchId!,
    clientInfo?.clientId!,
    1
  );
  const messages = [
    { role: "system", content: systemPrompt },
    ...state.messages,
  ];
  const response = (await modelWithTools.invoke(messages)) as any;
  // console.log(response.tokenUsage!);
  return { messages: [response] };
}

export const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");
