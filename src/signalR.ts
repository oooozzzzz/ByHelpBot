import * as signalR from "@microsoft/signalr";
import "dotenv/config";

export const hubConnection = new signalR.HubConnectionBuilder()
	.withUrl(`https://${process.env.PREFIX}.byhelp.ru/signalr/`)
	.configureLogging(signalR.LogLevel.Information)
	.withAutomaticReconnect()
	.build();
