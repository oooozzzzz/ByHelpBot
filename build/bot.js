"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agent = exports.bot = void 0;
const grammy_1 = require("grammy");
require("dotenv/config");
const RAG_class_1 = require("./agent/RAG_class");
const basic_workflow_1 = require("./agent/basic_workflow");
exports.bot = new grammy_1.Bot(process.env.TOKEN);
exports.agent = new RAG_class_1.Graph({ workflow: basic_workflow_1.workflow }).init();
