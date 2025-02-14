"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflow = void 0;
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const RAG_class_js_1 = require("./RAG_class.js");
require("dotenv/config");
const tools_1 = require("./tools");
const systemPrompt_1 = require("./systemPrompt");
const StateAnnotation = langgraph_1.Annotation.Root({
    messages: (0, langgraph_1.Annotation)({
        reducer: langgraph_1.messagesStateReducer,
    }),
});
const tools = [
    tools_1.getUserMastersInfo,
    tools_1.getRecordsInfo,
    tools_1.getDateMastersInfo,
    tools_1.getServicesInfo,
    tools_1.getParticularServiceInfo,
    tools_1.createClientRecord,
    tools_1.serviceTimes,
    tools_1.freeEmployees,
    tools_1.getClientEmployees,
];
const toolNode = new prebuilt_1.ToolNode(tools);
const model = new RAG_class_js_1.LLM().model;
function shouldContinue(state) {
    var _a;
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    // If the LLM makes a tool call, then we route to the "tools" node
    if ((_a = lastMessage.tool_calls) === null || _a === void 0 ? void 0 : _a.length) {
        return "tools";
    }
    // Otherwise, we stop (reply to the user)
    return "__end__";
}
function callModel(state) {
    return __awaiter(this, void 0, void 0, function* () {
        const modelWithTools = model.bindTools(tools);
        const systemPrompt = yield (0, systemPrompt_1.getSystemPrompt)(1, 2);
        const messages = [
            { role: "system", content: systemPrompt },
            ...state.messages,
        ];
        const response = yield modelWithTools.invoke(messages);
        return { messages: [response] };
    });
}
// Define a new graph
exports.workflow = new langgraph_1.StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");
