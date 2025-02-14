import * as signalR from "@microsoft/signalr";

export const hubConnection = new signalR.HubConnectionBuilder()
	.withUrl("https://dev.byhelp.ru/signalr/")
	.configureLogging(signalR.LogLevel.Information)
	.withAutomaticReconnect()
	.build();
