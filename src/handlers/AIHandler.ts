import { Context } from "grammy";
import { agent } from "../bot";
import { crm } from "../axios/axios";
import "dotenv/config";
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
import {
	connectAllClients,
	getAILeadIds,
	sendToTg,
} from "../services/serviceFunctions";

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
		await agent.clearMessageHistory("66003");
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
	// определяем текущий лид и его id
	const lead = await searchCurrentLeads(branchId, branchId, clientId);
	const leadId = lead!.Id;
	if (process.env.NODE_ENV === "production") {
		// ищем лиды, у которых ответственным стоит ИИ
		const AILeads = await getAILeadIds(parseInt(process.env.ORGANIZATION_ID!));
		// если текущий лид не от ИИ, то выходим
		if (!AILeads.includes(leadId)) return;
	}
	// создаем thread в БД, чтобы из ИИ цеплять нужную нам инфу о лиде: id филиала, id клиента и тд
	await createThread({ clientId, branchId, leadId });
	// функция для генерации тела запроса на отправку сообщения в СРМ
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
	// обработка команд в телеграме. ИИ не должен на них отвечать
	if (text[0] === "/") return;
	if (text === "!!") {
		console.log(text);
		// дублируем в телеграм бот
		try {
			sendToTg(text);
		} catch (error) {}
		// очищает историю чата для ИИ
		await agent.clearMessageHistory(clientId.toString());
		return sendMessageToClient(branchId, body("История чата очищена"));
	}
	// логирование диалога
	console.log(`User ${clientId}: ${text}`);
	sendToTg(`User ${clientId}: ${text}`);
	const output = await agent.ask(text, clientId.toString());
	console.log(`Bot: ${output}`);
	try {
		sendToTg(`Bot: ${output}`);
	} catch (error) {}
	// если ИИ не знает, что делать, он отправляет три звезды (***), чтобы система сняла с него ответственность за лида
	if (output === "***") {
		// если запущен тестовый инстанс ИИ, он говорит о том, что диалог переведен на оператора
		if (process.env.NODE_ENV === "dev") {
			await sendMessageToClient(
				branchId,
				body("Информация на период теста: диалог переведен на оператора"),
			);
		}
		// снятие с себя ответственности. Клиент не видит это тпереход
		if (process.env.NODE_ENV === "production") {
			await removeResponsibility(branchId, leadId);
		}
		return;
	}
	// если все условия выполнились, то отправляем сообщение в СРМ
	await sendMessageToClient(branchId, body(output));
};
