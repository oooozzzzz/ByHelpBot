import axios, { Axios } from "axios";
import "dotenv/config";
export const crm = new (axios.create as any)({
	headers: {
		Authorization: `Bearer ${process.env.CRM_TOKEN}`,
	},
	baseURL: "https://dev.byhelp.ru/",
});
