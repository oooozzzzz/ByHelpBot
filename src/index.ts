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
  controlModule,
  disconnectUsers,
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
import { disconnect } from "process";
import { closeDb, initializeDb } from "./agent/dbConfig";
let previousSearchId: number | undefined = undefined;
const connectedRN: number[] = [];
export const addConnectedRN = (id: number) => connectedRN.push(id);
export const getConnectedRN = () => connectedRN;
export const clearConnectedUsers = () =>
  connectedRN.splice(0, connectedRN.length);
const listenLeadsConnect = async (organizationId: number) => {
  const { SearchId } = await searchLeads(1, [], {
    DateActiveE: moment().add(3, "days").format("YYYY-MM-DDT00:00:00"),
    DateActiveS: moment().subtract(7, "days").format("YYYY-MM-DDT23:59:59"),
    MaxItems: 100,
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
    previousSearchId
  );
  previousSearchId = SearchId;
  console.log("ListenLeadsGroup connected");
};

let moduleState = true;
const setModuleState = (state: boolean) => {
  moduleState = state;
};
// точка входа в систему
async function main(ORGANIZATION_ID: number) {
  // инициализируем базу данных, чтобы подключение было стабильным
  await initializeDb();
  // устанавливаем язык для moment, чтобы дни недели отображались на русском языке
  moment.locale("ru");
  // запускаем cron-задачу, которая будет выполняться каждый день в 2 часа ночи
  cron
    .schedule(
      "0 0 2 * * *",
      // переподключаемся к лидам (нужно, чтобы очищать список тех, кто подключен, но кому мы не должны отвечать)
      async () => {
        clearConnectedUsers();
        disconnectUsers();
        await listenLeadsConnect(ORGANIZATION_ID);
        // для подключения к методу ListenLeadsGroup нам нужен SearchId поиска по лидам.
        // В данном случае устанавливается максимально широкий период времени, чтобы не переписывать SearchId каждый раз
        await connectOrganization(ORGANIZATION_ID);
      },
      { timezone: "Europe/Moscow" }
    )
    .start();
  // получаем через API клиента список организаций, у которых включен модуль ИИ
  const organizations = await getAiOrganizations(1);
  console.log(organizations);
  // в системе byHelp аутентификация ИИ происходи по почте, которая формирует определенным образом, описанным в функции generateEmailString
  const email = generateEmailString(ORGANIZATION_ID);
  // пароль для всех пользователей фиксированный, поэтому получаем его из переменной окружения
  const user = await authByPassport(email, process.env.CRM_PASSWORD!);

  // в поле AccessToken хранится токен, который используется для аутентификации в системе byHelp
  setAccessToken(user.AccessToken);
  // получаем ИИ пользователя, чтобы в дальнейшем подключить организацию и добавить ее в БД
  const aiUser = (await getAIUser(ORGANIZATION_ID))[0];
  // создаем организацию в БД (если ее нет)
  await createOrganization(ORGANIZATION_ID, aiUser.UserBranchIds, aiUser.Id);
  // начинаем подключение по веб соккету
  await hubConnection.start();
  // вешаем событие на переподключение
  hubConnection.onreconnected(async () => {
    // очищаем список подключенных пользователей
    clearConnectedUsers();
    // для подключения к методу ListenLeadsGroup нам нужен SearchId поиска по лидам.
    // В данном случае устанавливается максимально широкий период времени, чтобы не переписывать SearchId каждый раз
    await connectOrganization(ORGANIZATION_ID);
    await listenLeadsConnect(ORGANIZATION_ID);
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
        if (lead.UserId == aiUser.Id) {
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
          lastLead.ClientId
        );
        // находим и парсим последнее сообщение лида
        const lastMessage =
          clientActionHistory[clientActionHistory.length - 1].ChatMessages[0];
        // последовательность важна. сначала назначаем ИИ ответственным за конкретного лида, чтобы
        // в функции replyInSocialIntegration() пройти проверку на то, что лид закреплен за ИИ
        // закрепляем пользователя ответственным за ИИ
        await assignLeadsToUser(lastLead.BranchId, [lastLead.Id], aiUser.Id);
        // устанавливаем соединение с лидом по веб сокету
        await connectClientsSocket([lastLead.ClientId], ORGANIZATION_ID);
        // отвечаем через ИИ
        await replyInSocialIntegration(lastMessage);
      }
    } catch (error) {
      console.log(error);
    }
  });

  hubConnection.on("OnClientHistoryUpdate", async (data) => {
    // получаем последнее сообщение
    const messages = JSON.parse(data.jsonData);
    const chatMessages: ChatMessage[] = messages[0].ChatMessages.filter(
      (m: ChatMessage) => m.Direction === "in"
    );
    const lastMessage = chatMessages[0];
    if (!lastMessage) return;
    // отвечаем через ИИ
    await replyInSocialIntegration(lastMessage);
  });

  process.on("SIGINT", async () => {
    console.log("\nПолучен сигнал SIGINT. Завершение работы...");
    await closeDb();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    console.log("\nПолучен сигнал SIGTERM. Завершение работы...");
    await closeDb();
    process.exit(0);
  });
  // Можно также добавить обработчик для неперехваченных исключений
  process.on("uncaughtException", async (err) => {
    console.error("Неперехваченное исключение:", err);
    await closeDb();
    process.exit(1);
  });

  setInterval(async () => {
    await controlModule(
      ORGANIZATION_ID,
      async () => {
        await listenLeadsConnect(ORGANIZATION_ID);
        await connectOrganization(ORGANIZATION_ID);
      },
      async () => {
        clearConnectedUsers();
        disconnectUsers();
      },
      setModuleState,
      moduleState
    );
  }, 1000 * 60);
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
