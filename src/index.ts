import "dotenv/config";
import { agent, bot } from "./bot";
import { Context } from "grammy";
import { AIHandler, replyInSocialIntegration } from "./handlers/AIHandler";
import moment from "moment";
import { hubConnection } from "./signalR";
import {
	getAIUser,
	getBasicBranches,
	getBasicLeads,
	getBranches,
	getClientInfo,
	getClientsFilterData,
	removeResponsibility,
	searchLeads,
	sendMessageToClient,
} from "./services/crmInfo";
import { Branch, ChatMessage } from "./types";
import {
	connectAllClients,
	connectClientsSocket,
	connectOrganization,
	generateCRMString,
	getAILeadIds,
} from "./services/serviceFunctions";
import { createOrganization, createThread } from "./services/db";

async function main() {
	const ORGANIZATION_ID = 1;
	moment.locale("ru");

	const aiUser = await getAIUser(ORGANIZATION_ID);
	await createOrganization(ORGANIZATION_ID, aiUser.UserBranchIds, aiUser.Id);
	await hubConnection.start();
	hubConnection.onreconnected(async () => {
		await connectOrganization(ORGANIZATION_ID);
		console.log("Reconnected");
	});
	await connectOrganization(ORGANIZATION_ID);
	await hubConnection.invoke(
		"ListenLeadsGroup",
		generateCRMString(ORGANIZATION_ID),
		"1",
		"",
	);
	hubConnection.on("OnClientHistoryUpdate", async (data) => {
		const AILeads = await getAILeadIds(ORGANIZATION_ID);
		const messages = JSON.parse(data.jsonData);
		const chatMessages: ChatMessage[] = messages[0].ChatMessages.filter(
			(m: ChatMessage) => m.Direction === "in",
		);
		const lastMessage = chatMessages[0];
		if (!lastMessage) return;
		await replyInSocialIntegration(lastMessage, ORGANIZATION_ID, AILeads);
	});
}
bot.on("message:text", async (ctx: Context) => {
	await AIHandler(ctx);
});
bot.catch(async (err) => console.log(err));
bot.start();
main();
