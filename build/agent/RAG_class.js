"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _RAG_llm, _RAG_retriever, _Retriever_instances, _Retriever_vectoreStore, _Retriever_embeddings, _Retriever_loader, _Retriever_splitter, _Retriever_loadVectoreStore, _Retriever_createRetriever;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Graph = exports.Retriever = exports.LLM = exports.RAG = exports.execute = void 0;
const node_1 = require("@langchain/community/vectorstores/closevector/node");
const openai_1 = require("@langchain/openai");
const textsplitters_1 = require("@langchain/textsplitters");
const text_1 = require("langchain/document_loaders/fs/text");
const langgraph_checkpoint_sqlite_1 = require("@langchain/langgraph-checkpoint-sqlite");
const messages_1 = require("@langchain/core/messages");
const fs = __importStar(require("fs"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const execute = (db_1, sql_1, ...args_1) => __awaiter(void 0, [db_1, sql_1, ...args_1], void 0, function* (db, sql, params = []) {
    if (params && params.length > 0) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                resolve();
            });
        });
    }
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err)
                reject(err);
            resolve();
        });
    });
});
exports.execute = execute;
class RAG {
    constructor({ llm = new LLM(), retriever = new Retriever() } = {
        llm: new LLM(),
        retriever: new Retriever(),
    }) {
        _RAG_llm.set(this, void 0);
        _RAG_retriever.set(this, void 0);
        __classPrivateFieldSet(this, _RAG_llm, llm, "f");
        __classPrivateFieldSet(this, _RAG_retriever, retriever, "f");
        // TODO: убрать ретривер
    }
}
exports.RAG = RAG;
_RAG_llm = new WeakMap(), _RAG_retriever = new WeakMap();
class LLM {
    constructor(params = {
        temperature: 0,
        modelName: "gpt-4o-mini",
    }) {
        this.modelName = "gpt-4o-mini";
        this.baseURL = "https://api.proxyapi.ru/openai/v1/";
        this.model = new openai_1.ChatOpenAI(Object.assign({ configuration: { baseURL: this.baseURL }, modelName: this.modelName }, params));
    }
}
exports.LLM = LLM;
class Retriever {
    constructor({ embeddings = new openai_1.OpenAIEmbeddings({
        configuration: { baseURL: "https://api.proxyapi.ru/openai/v1/" },
    }), loader = new text_1.TextLoader("./text.txt"), splitter = new textsplitters_1.RecursiveCharacterTextSplitter(), } = {
        embeddings: new openai_1.OpenAIEmbeddings({
            configuration: { baseURL: "https://api.proxyapi.ru/openai/v1/" },
        }),
        loader: new text_1.TextLoader("./text.txt"),
        splitter: new textsplitters_1.RecursiveCharacterTextSplitter(),
    }) {
        _Retriever_instances.add(this);
        _Retriever_vectoreStore.set(this, void 0);
        _Retriever_embeddings.set(this, void 0);
        _Retriever_loader.set(this, void 0);
        _Retriever_splitter.set(this, void 0);
        this.filePath = "./text.txt";
        __classPrivateFieldSet(this, _Retriever_embeddings, embeddings, "f");
        __classPrivateFieldSet(this, _Retriever_loader, loader, "f");
        __classPrivateFieldSet(this, _Retriever_splitter, splitter, "f");
    }
    init() {
        return __awaiter(this, arguments, void 0, function* (params = 3) {
            const directory = "./store/";
            yield __classPrivateFieldGet(this, _Retriever_instances, "m", _Retriever_loadVectoreStore).call(this);
            yield __classPrivateFieldGet(this, _Retriever_instances, "m", _Retriever_createRetriever).call(this, params);
            return this.retriever;
        });
    }
    invoke(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.retriever.invoke(params);
        });
    }
}
exports.Retriever = Retriever;
_Retriever_vectoreStore = new WeakMap(), _Retriever_embeddings = new WeakMap(), _Retriever_loader = new WeakMap(), _Retriever_splitter = new WeakMap(), _Retriever_instances = new WeakSet(), _Retriever_loadVectoreStore = function _Retriever_loadVectoreStore() {
    return __awaiter(this, void 0, void 0, function* () {
        if (fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, "Hello world");
        }
        const docs = yield __classPrivateFieldGet(this, _Retriever_loader, "f").load();
        const allSplits = yield __classPrivateFieldGet(this, _Retriever_splitter, "f").splitDocuments(docs);
        const vectorStore = yield node_1.CloseVectorNode.fromDocuments(allSplits, __classPrivateFieldGet(this, _Retriever_embeddings, "f"));
        const directory = "./store/";
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
            yield vectorStore.save(directory);
        }
        const loadedVectorStore = yield node_1.CloseVectorNode.load(directory, __classPrivateFieldGet(this, _Retriever_embeddings, "f"));
        console.log("vectorStore loaded");
        __classPrivateFieldSet(this, _Retriever_vectoreStore, loadedVectorStore, "f");
    });
}, _Retriever_createRetriever = function _Retriever_createRetriever() {
    return __awaiter(this, arguments, void 0, function* (params = 3) {
        const vectorStore = yield __classPrivateFieldGet(this, _Retriever_vectoreStore, "f");
        this.retriever = vectorStore.asRetriever(params);
    });
};
class Graph {
    constructor({ checkpointer = langgraph_checkpoint_sqlite_1.SqliteSaver.fromConnString("./checkpointer/checkpoints.db"), workflow, } = {
        checkpointer: langgraph_checkpoint_sqlite_1.SqliteSaver.fromConnString("./checkpointer/checkpoints.db"),
        workflow,
    }) {
        this.workflow = workflow;
        this.checkpointer = checkpointer;
    }
    init() {
        if (!fs.existsSync("./checkpointer/checkpoints.db")) {
            fs.mkdirSync("./checkpointer");
        }
        this.app = this.workflow.compile({ checkpointer: this.checkpointer });
        return this;
    }
    ask(input, thread) {
        return __awaiter(this, void 0, void 0, function* () {
            const finalState = yield this.app.invoke({ messages: [new messages_1.HumanMessage(input)] }, { configurable: { thread_id: thread } });
            return finalState.messages[finalState.messages.length - 1].content;
        });
    }
    clearMessageHistory(thread_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = new sqlite3_1.default.Database("./checkpointer/checkpoints.db", sqlite3_1.default.OPEN_READWRITE);
            const sql = `DELETE FROM checkpoints WHERE thread_id = '${thread_id}'`;
            try {
                yield (0, exports.execute)(db, sql);
            }
            catch (err) {
                console.log(err);
            }
            finally {
                db.close();
            }
        });
    }
}
exports.Graph = Graph;
