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

const StateAnnotation = Annotation.Root({
	annotation: Annotation<string>({
		reducer: (prev, next) => prev.concat(next),
	}),
	messages: Annotation<BaseMessage[], Messages>({
		reducer: messagesStateReducer,
	}),
});

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
const model = new LLM().model;
function shouldContinue(state: typeof StateAnnotation.State) {
	const messages = state.messages;
	const lastMessage = messages[messages.length - 1] as AIMessage;
	if (lastMessage.tool_calls?.length) {
		return "tools";
	}
	return "__end__";
}

async function callModel(state: typeof StateAnnotation.State, config: any) {
	const thread = config.configurable.thread_id;
	const clientInfo = await getThread(parseInt(thread));
	const modelWithTools = model.bindTools(tools);
	const systemPrompt = await getSystemPrompt(
		clientInfo?.branchId!,
		clientInfo?.clientId!,
		1,
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
