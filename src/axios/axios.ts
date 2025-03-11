import axios, { Axios } from "axios";
import "dotenv/config";

let accessToken = "";
// функция, котоарая устанавливает токен после первого подключения к СРМ. Это нужно, потому что для каждой организации создается свой пользователь со своим токеном
export const setAccessToken = (token: string) => {
	accessToken = token;
};
// определяем префикс для подключения к СРМ
const prefix = process.env.PREFIX ? process.env.PREFIX : "";
// функция, которая возвращает экземпляр axios с подставленным токеном и корректным baseUrl
export const crm = () => {
	if (accessToken) {
		return axios.create({
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			baseURL: `https://${prefix}byhelp.ru/`,
		});
	} else {
		return axios.create({
			headers: {
				Authorization: `Bearer ${process.env.CRM_TOKEN}`,
			},
			baseURL: `https://${prefix}byhelp.ru/`,
		});
	}
};
