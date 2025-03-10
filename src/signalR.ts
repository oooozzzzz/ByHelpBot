import * as signalR from "@microsoft/signalr";
import "dotenv/config";

const prefix = process.env.PREFIX ? process.env.PREFIX : "";

export const hubConnection = new signalR.HubConnectionBuilder()
	.withUrl(`https://${prefix}byhelp.ru/signalr/`)
	.configureLogging(signalR.LogLevel.Information)
	.withAutomaticReconnect()
	.build();
