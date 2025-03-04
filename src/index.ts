import "dotenv/config";
import { agent, bot } from "./bot";
import { Context } from "grammy";
import { AIHandler, replyInSocialIntegration } from "./handlers/AIHandler";
import moment from "moment";
import { hubConnection } from "./signalR";
import {
	assignLeadsToUser,
	authByPassport,
	getAIUser,
	getBasicBranches,
	getBasicLeads,
	getBranches,
	getClientActionHistory,
	getClientInfo,
	getClientsFilterData,
	removeResponsibility,
	searchLeads,
	sendMessageToClient,
} from "./services/crmInfo";
import { Branch, ChatMessage, Lead, SearchLeadsFilter } from "./types";
import {
	connectAllClients,
	connectClientsSocket,
	connectOrganization,
	generateCRMString,
	generateEmailString,
	getAILeadIds,
} from "./services/serviceFunctions";
import {
	createOrganization,
	createThread,
	isInOrganization,
} from "./services/db";
import { setAccessToken } from "./axios/axios";

async function main(ORGANIZATION_ID: number) {
	moment.locale("ru");
	console.log(ORGANIZATION_ID);
	const email = generateEmailString(ORGANIZATION_ID);
	const user = await authByPassport(email, process.env.CRM_PASSWORD!);
	// console.log(user);
	// console.log(AccessToken);
	setAccessToken(user.AccessToken);

	const aiUser = await getAIUser(ORGANIZATION_ID);
	// console.log(aiUser);
	await createOrganization(ORGANIZATION_ID, aiUser.UserBranchIds, aiUser.Id);
	await hubConnection.start();
	hubConnection.onreconnected(async () => {
		const { SearchId } = await searchLeads(1, [], {
			DateActiveE: moment().add(30, "years").format("YYYY-MM-DDT00:00:00"),
			DateActiveS: moment("2025-01-26T23:59:59").format("YYYY-MM-DDT23:59:59"),
			MaxItems: 10000,
			SearchTermIn: "clients",
		});
		await hubConnection.invoke(
			"ListenLeadsGroup",
			generateCRMString(ORGANIZATION_ID),
			SearchId.toString(),
			undefined,
		);
		await connectOrganization(ORGANIZATION_ID);
		console.log("Reconnected");
	});

	const { SearchId } = await searchLeads(1, [], {
		DateActiveE: moment().add(30, "years").format("YYYY-MM-DDT00:00:00"),
		DateActiveS: moment("2025-01-26T23:59:59").format("YYYY-MM-DDT23:59:59"),
		MaxItems: 10000,
		SearchTermIn: "clients",
	});
	await hubConnection.invoke(
		"ListenLeadsGroup",
		// "Crm-000-001",
		generateCRMString(ORGANIZATION_ID),
		// "638754838440642591",
		SearchId.toString(),
		undefined,
	);
	await connectOrganization(ORGANIZATION_ID);
	hubConnection.on("onLeadsGroupUpdate", async ({ jsonData }) => {
		const data: { SearchId: number; Filter: SearchLeadsFilter; Items: Lead[] } =
			JSON.parse(jsonData);
		if (data.Items.length === 0) return;
		const lastLead = data.Items[0];
		if (
			lastLead.LastMessage &&
			lastLead.Direction == "in" &&
			!(await isInOrganization(lastLead.ClientId, ORGANIZATION_ID))
		) {
			console.log(lastLead);
			const clientActionHistory = await getClientActionHistory(
				lastLead.ClientId,
			);
			const lastMessage = clientActionHistory[0]?.ChatMessages[0];
			await connectClientsSocket([lastLead.ClientId], ORGANIZATION_ID);
			await replyInSocialIntegration(lastMessage);
			await assignLeadsToUser(lastLead.BranchId, [lastLead.Id], aiUser.Id);
		}
	});

	// TODO: добавить список подклченных клиентов в бд и проверять не подключен ли ИИ к определенному клиенту
	hubConnection.on("OnClientHistoryUpdate", async (data) => {
		const AILeads = await getAILeadIds(ORGANIZATION_ID);
		const messages = JSON.parse(data.jsonData);
		const chatMessages: ChatMessage[] = messages[0].ChatMessages.filter(
			(m: ChatMessage) => m.Direction === "in",
		);
		const lastMessage = chatMessages[0];
		if (!lastMessage) return;
		await replyInSocialIntegration(lastMessage);
	});
}
bot.on("message:text", async (ctx: Context) => {
	await AIHandler(ctx);
});
bot.catch(async (err) => console.log(err));
bot.start();
main(1);
