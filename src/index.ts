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

async function main(ORGANIZATION_ID: number) {
	moment.locale("ru");

	const aiUser = await getAIUser(ORGANIZATION_ID);
	await createOrganization(ORGANIZATION_ID, aiUser.UserBranchIds, aiUser.Id);
	await hubConnection.start();
	hubConnection.onreconnected(async () => {
		await hubConnection.invoke(
			"ListenLeadsGroup",
			generateCRMString(ORGANIZATION_ID),
			"638754660670622904",
			undefined,
		);
		await connectOrganization(ORGANIZATION_ID);
		console.log("Reconnected");
	});

	const { SearchId } = await searchLeads(1, [], {
		DateActiveE: moment().add(30, "years").format("YYYY-MM-DDT00:00:00"),
		DateActiveS: moment().subtract(3, "days").format("YYYY-MM-DDT23:59:59"),
		MaxItems: 10000,
		SearchTermIn: "clients",
	});
	console.log(SearchId.toString());
	await hubConnection.invoke(
		"ListenLeadsGroup",
		"Crm-000-001",
		// generateCRMString(ORGANIZATION_ID),
		// "638754838440642591",
		SearchId.toString(),
		undefined,
	);
	// await connectOrganization(ORGANIZATION_ID);
	hubConnection.on("onLeadsGroupUpdate", async ({ jsonData }) => {
		console.log("onLeadsGroupUpdate");
		const data = JSON.parse(jsonData);
		// console.log(data);
	});
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
// bot.start();
main(1);
