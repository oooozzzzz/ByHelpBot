import axios, { Axios } from "axios";
import "dotenv/config";

let accessToken = "";
export const setAccessToken = (token: string) => {
	accessToken = token;
};
// export const crm = new (axios.create as any)({
// 	headers: {
// 		Authorization: accessToken
// 			? `Bearer ${accessToken}`
// 			: `Bearer ${process.env.CRM_TOKEN}`,
// 	},
// 	baseURL: "https://dev.byhelp.ru/",
// });

export const crm = () => {
	if (accessToken) {
		return axios.create({
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			baseURL: "https://dev.byhelp.ru/",
		});
	} else {
		return axios.create({
			headers: {
				Authorization: `Bearer ${process.env.CRM_TOKEN}`,
			},
			baseURL: "https://dev.byhelp.ru/",
		});
	}
};
