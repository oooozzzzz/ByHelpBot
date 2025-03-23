import "dotenv/config";
import { agent, bot } from "./bot";
import { Context } from "grammy";
import { AIHandler, replyInSocialIntegration } from "./handlers/AIHandler";
import moment from "moment";
import { hubConnection } from "./signalR";
import cron from "node-cron";
import {
	assignLeadsToUser,
	authByPassport,
	getAiOrganizations,
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
	addUserToGetNotifications,
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
let previousSearchId: number | undefined = undefined;
const listenLeadsConnect = async (organizationId: number) => {
	const { SearchId } = await searchLeads(1, [], {
		DateActiveE: moment().add(3, "days").format("YYYY-MM-DDT00:00:00"),
		DateActiveS: moment().subtract(7, "days").format("YYYY-MM-DDT23:59:59"),
		MaxItems: 200,
		SearchTermIn: "clients",
	});
	// подключаемся к методу ListenLeadsGroup.
	await hubConnection.invoke(
		"ListenLeadsGroup",
		// генерируется строка по ID организации. логика такая же, как и при формировании строки в функции generateEmailString
		generateCRMString(organizationId),
		// важно перевести SearchId в строку.
		// ВАЖНОЕ УТОЧНЕНИЕ: SearchId это BigInt, поэтому под капотом он парсится с помощью специальной библиотеки json-bigint
		SearchId.toString(),
		previousSearchId,
	);
	previousSearchId = SearchId;
	console.log("ListenLeadsGroup connected");
};
// точка входа в систему
async function main(ORGANIZATION_ID: number) {
	// устанавливаем язык для moment, чтобы дни недели отображались на русском языке
	moment.locale("ru");
	cron
		.schedule(
			"0 0 2 * * *",
			async () => await listenLeadsConnect(ORGANIZATION_ID),
			{ timezone: "Europe/Moscow" },
		)
		.start();
	// получаем через API клиента список организаций, у которых включен модуль ИИ
	const organizations = await getAiOrganizations(1);
	console.log(organizations);
	console.log(ORGANIZATION_ID);
	// в системе byHelp аутентификация ИИ происходи по почте, которая формирует определенным образом, описанным в функции generateEmailString
	const email = generateEmailString(ORGANIZATION_ID);
	// пароль для всех пользователей фиксированный, поэтому получаем его из переменной окружения
	const user = await authByPassport(email, process.env.CRM_PASSWORD!);

	// в поле AccessToken хранится токен, который используется для аутентификации в системе byHelp
	setAccessToken(user.AccessToken);
	// получаем ИИ пользователя, чтобы в дальнейшем подключить организацию и добавить ее в БД
	const aiUser = await getAIUser(ORGANIZATION_ID);
	// создаем организацию в БД (если ее нет)
	await createOrganization(ORGANIZATION_ID, aiUser.UserBranchIds, aiUser.Id);
	// начинаем подключение по веб соккету
	await hubConnection.start();
	// вешаем событие на переподключение
	hubConnection.onreconnected(async () => {
		// для подключения к методу ListenLeadsGroup нам нужен SearchId поиска по лидам.
		// В данном случае устанавливается максимально широкий период времени, чтобы не переписывать SearchId каждый раз
		await listenLeadsConnect(ORGANIZATION_ID);
		await connectOrganization(ORGANIZATION_ID);
		console.log("Reconnected");
	});
	// та же логика подключения к методу ListenLeadsGroup
	await listenLeadsConnect(ORGANIZATION_ID);
	// устанавливаем подключение по веб сокет к организации. нужен только ID организации
	await connectOrganization(ORGANIZATION_ID);
	hubConnection.on("onLeadsGroupUpdate", async ({ jsonData }) => {
		// парсим получаемые данные
		const data: { SearchId: number; Filter: SearchLeadsFilter; Items: Lead[] } =
			JSON.parse(jsonData);
		// если нет лидов, то выходим
		if (data.Items.length === 0) return;
		try {
			const lastLead = data.Items[0];
			const leads = data.Items;
			for (const lead of leads) {
				if (
					lead.UserId == aiUser.Id &&
					!(await isInOrganization(lead.ClientId, ORGANIZATION_ID))
				) {
					await connectClientsSocket([lead.ClientId], ORGANIZATION_ID);
				}
			}
			// функционал по обработке лидов, которых нет в БД и к которым еще не подключен ИИ
			if (
				// проверяем, чтобы у события было сообщение (потому что может быть и смена статуса или тега)
				lastLead.LastMessage &&
				// обязательно, чтобы сообщение было входящим, чтобы не реагировать на исходящие сообщения
				lastLead.Direction == "in" &&
				// проверяем, чтобы лид не был ни за кем закреплен
				lastLead.UserId == null &&
				// проверяем, что лида нет в БД
				!(await isInOrganization(lastLead.ClientId, ORGANIZATION_ID))
			) {
				const clientActionHistory = await getClientActionHistory(
					lastLead.ClientId,
				);
				// находим и парсим последнее сообщение лида
				const lastMessage = clientActionHistory[0]?.ChatMessages[0];
				// устанавливаем соединение с лидом по веб сокету
				await connectClientsSocket([lastLead.ClientId], ORGANIZATION_ID);
				// отвечаем через ИИ
				await replyInSocialIntegration(lastMessage);
				// закрепляем пользователя ответственным за ИИ
				await assignLeadsToUser(lastLead.BranchId, [lastLead.Id], aiUser.Id);
			}
		} catch (error) {
			console.log(error);
		}
	});

	hubConnection.on("OnClientHistoryUpdate", async (data) => {
		// получаем последнее сообщение
		const messages = JSON.parse(data.jsonData);
		const chatMessages: ChatMessage[] = messages[0].ChatMessages.filter(
			(m: ChatMessage) => m.Direction === "in",
		);
		const lastMessage = chatMessages[0];
		if (!lastMessage) return;
		// отвечаем через ИИ
		await replyInSocialIntegration(lastMessage);
	});
}
// команды ТГ боту для управления
bot.command("notifications", async (ctx: Context) => {
	// важный момент: ТГ бот хранит список пользователей, которым нужно отправлять уведомления в ОПЕРАТИВНОЙ ПАМЯТИ
	// это означает, что при перезапуске бота, необходимо заново подписаться на уведомления
	addUserToGetNotifications(ctx.from!.id);
	await ctx.reply("Вы подписались на уведомления");
});
// принимаем все текстовые сообщения, приходящие в бота и отвечаем через ИИ
// на данный момент работает только когда ИИ запущен на dev префиксе, так как id пользователя передается не динамически, а статично
bot.on("message:text", async (ctx: Context) => {
	await AIHandler(ctx);
});
bot.catch(async (err) => console.log(err));
// если в параметрах окружения указано true, то запускаем бота
if (process.env.START_BOT === "true") bot.start();
// непосредственно запуск всей логики с передаваемым ID организации
main(parseInt(process.env.ORGANIZATION_ID!));
