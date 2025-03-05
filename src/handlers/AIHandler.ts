import { Context } from "grammy";
import { agent } from "../bot";
import { crm } from "../axios/axios";
import {
	getBasicLeads,
	getBranchInfo,
	getClientRecords,
	getEmployees,
	getServicesByBranch,
	getWorkingHours,
	removeResponsibility,
	searchCurrentLeads,
	sendMessageToClient,
} from "../services/crmInfo";
import { createThread } from "../services/db";
import { ChatMessage } from "../types";
import { connectAllClients, sendToTg } from "../services/serviceFunctions";

export const AIHandler = async (ctx: Context) => {
	await createThread({
		clientId: 66003,
		branchId: 5,
		leadId: 1,
		activeBranchId: 1,
	});
	const text = ctx.message!.text;
	console.log(`${ctx.from!.first_name}: ${text}`);
	if (text == "!!") {
		await agent.clearMessageHistory(66003 + ".0");
		return await ctx.reply("История чата очищена");
	}
	const thread = 66003;
	const output: string = await agent.ask(text, thread);
	console.log(`Бот: ${output}`);
	await ctx.reply(output);
};

export const replyInSocialIntegration = async (lastMessage: ChatMessage) => {
	const clientId = lastMessage?.ClientId;

	const branchId = lastMessage?.BranchId;
	const lead = await searchCurrentLeads(branchId, branchId, clientId);
	// const lead = allLeads!.find((l) => l.clientId === clientId);
	const leadId = lead!.Id;
	// if (!AILeads.includes(leadId)) return;
	await createThread({ clientId, branchId, leadId });
	const body = (message: string) => ({
		Message: message,
		Destination: {
			ClientId: clientId,
			LeadId: leadId,
			Phone: lead!.ClientPhone,
		},
		IsSendout: false,
		IntegrationId: lead!.SocialIntegrationId,
	});

	const text = lastMessage.Message;
	if (text === "!!") {
		console.log(text);
		sendToTg(text);
		await agent.clearMessageHistory(clientId.toString());
		return sendMessageToClient(branchId, body("История чата очищена"));
	}
	console.log(`User ${clientId}: ${text}`);
	sendToTg(`User ${clientId}: ${text}`);
	const output = await agent.ask(text, clientId.toString());
	console.log(`Bot: ${output}`);
	sendToTg(`Bot: ${output}`);
	if (output === "***") {
		await sendMessageToClient(
			branchId,
			body("Информация на период теста: диалог переведен на оператора"),
		);
		// await removeResponsibility(branchId, leadId);
		return;
	}
	await sendMessageToClient(branchId, body(output));
};
