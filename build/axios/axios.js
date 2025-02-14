"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crm = void 0;
const axios_1 = __importDefault(require("axios"));
require("dotenv/config");
exports.crm = new axios_1.default.create({
    headers: {
        Authorization: `Bearer ${process.env.CRM_TOKEN}`,
    },
    baseURL: "https://dev.byhelp.ru/",
});
// export const crmAuth = new (axios.create as any)({
// 	headers: {
// 		Authorization: `Bearer ${process.env.CRM_TOKEN}`,
// 		'Custom-Header': 'CustomHeaderValue'
// 	},
// 	baseURL: "https://dev.byhelp.ru/api/",
// });
