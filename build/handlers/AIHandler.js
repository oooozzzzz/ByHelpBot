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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIHandler = void 0;
const bot_1 = require("../bot");
const AIHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const text = ctx.message.text;
    console.log(`${ctx.from.first_name}: ${text}`);
    const thread = ctx.chat.id.toString();
    const output = yield bot_1.agent.ask(text, thread);
    console.log(`Бот: ${output}`);
    yield ctx.reply(output);
});
exports.AIHandler = AIHandler;
