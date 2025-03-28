import * as signalR from "@microsoft/signalr";
import "dotenv/config";

const prefix = process.env.PREFIX ? process.env.PREFIX : "";
// dev.
//stage.
// определяем hubConnection (лучше это не трогать)
export const hubConnection = new signalR.HubConnectionBuilder()
	.withUrl(`https://${prefix}byhelp.ru/signalr/`)
	.configureLogging(signalR.LogLevel.Information)
	.withAutomaticReconnect()
	.build();
