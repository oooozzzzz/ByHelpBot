"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bot_1 = require("./bot");
const AIHandler_1 = require("./handlers/AIHandler");
const moment_1 = __importDefault(require("moment"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        moment_1.default.locale("ru");
        bot_1.bot.command("start", (ctx) => __awaiter(this, void 0, void 0, function* () {
            ctx.reply("Добро пожаловать в тестовую версию чат бота. Для начала просто напишите текстовое сообщение\n\nЧтобы очистить историю диалога в пмяти бота, напишите /clear");
        }));
        bot_1.bot.command("clear", (ctx) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield bot_1.agent.clearMessageHistory(ctx.chat.id);
                yield ctx.reply("История чата очищена");
            }
            catch (error) {
                yield ctx.reply("Произошла ошибка");
            }
        }));
        bot_1.bot.on("message:text", (ctx) => __awaiter(this, void 0, void 0, function* () {
            yield (0, AIHandler_1.AIHandler)(ctx);
        }));
    });
}
bot_1.bot.catch((err) => __awaiter(void 0, void 0, void 0, function* () { return console.log(err); }));
bot_1.bot.start();
main();
