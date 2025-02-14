import { Api, Bot } from "grammy";
import "dotenv/config";
import { Graph } from "./agent/RAG_class";
import { workflow } from "./agent/basic_workflow";

export const bot = new Bot(process.env.TOKEN!);
export const api = new Api(process.env.TOKEN!);
export const agent = new Graph({ workflow }).init();
