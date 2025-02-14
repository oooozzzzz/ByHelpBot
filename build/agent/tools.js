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
exports.freeEmployees = exports.serviceTimes = exports.createClientRecord = exports.getParticularServiceInfo = exports.getDateMastersInfo = exports.getUserMastersInfo = exports.getRecordsInfo = exports.getClientEmployees = exports.workingHours = exports.getServicesInfo = void 0;
const tools_1 = require("@langchain/core/tools");
const prompts_1 = require("@langchain/core/prompts");
require("dotenv/config");
const zod_1 = require("zod");
const crmInfo_1 = require("../services/crmInfo");
const RAG_class_1 = require("./RAG_class");
const output_parsers_1 = require("@langchain/core/output_parsers");
const moment_1 = __importDefault(require("moment"));
const serviceFunctions_1 = require("../services/serviceFunctions");
exports.getServicesInfo = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ branchId }) {
    console.log("Получаю информацию об услугах...");
    const response = yield (0, crmInfo_1.getServicesByBranch)(branchId);
    const services = response.map((service) => `название услуги: ${service.Name}, ID услуги: ${service.Id}, цена услуги: ${service.PriceS}-${service.PriceE}, длительность услуги: ${service.Duration}`);
    const result = services.join("; ");
    return result;
}), {
    name: "getServicesInfo",
    description: "Use to get information about services that the beauty salon provides.",
    schema: zod_1.z.object({
        branchId: zod_1.z.number().describe("Branch id"),
    }),
});
exports.workingHours = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ date, bracnId }) {
    console.log("Узнаю рабочие часы на дату " + date);
    const response = yield (0, crmInfo_1.getWorkingHours)(bracnId, date, 1);
    const result = `Время работы: ${response.WorkTimeS}-${response.WorkTimeE}`;
    console.log(result);
    return result;
}), {
    name: "workingHours",
    description: "Use to get working hours of a beauty salon. Not suitable for masters",
    schema: zod_1.z.object({
        date: zod_1.z.string().describe("Date in format YYYY-MM-DD"),
        bracnId: zod_1.z.number().describe("Branch id"),
    }),
});
exports.getClientEmployees = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, branchId }) {
    console.log("Получаю информацию о мастерах, у которых был клиент...");
    const records = yield (0, crmInfo_1.getClientRecords)(branchId, userId);
    const masters = records.map((r) => `Имя мастера: ${r.Employee}, ID мастера: ${r.EmployeeId}`);
    const uniqueMasters = Array.from(new Set(masters.flat()));
    return `Мастера у которых был клиент: 
${uniqueMasters.join("; ")}`;
}), {
    name: "getClientEmployees",
    description: "Use to get information about masters that client visited",
    schema: zod_1.z.object({
        userId: zod_1.z.number().describe("User id"),
        branchId: zod_1.z.number().describe("Branch id"),
    }),
});
exports.getRecordsInfo = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, branchId }) {
    console.log("Узнаю о записях клиента...");
    const activeBranchId = branchId;
    const records = (yield (0, crmInfo_1.getClientRecords)(activeBranchId, userId)).slice(0, 10);
    const services = records.map((record) => record.Services);
    if (services.length === 0)
        return "Записи отсутствуют";
    const recordsFormated = records.map((r) => {
        var _a;
        const id = r.RecordId;
        const timeS = r.TimeS;
        const timeE = r.TimeE;
        const services = (_a = r.Services) === null || _a === void 0 ? void 0 : _a.map((s) => `Название услуги: ${s.Service}, ID услуги: ${s.ServiceId}`);
        return { id, timeS, timeE, services };
    });
    const result = JSON.stringify(recordsFormated);
    console.log(result);
    return result;
}), {
    name: "getRecordsInfo",
    description: "Use to get information about visits of a user",
    schema: zod_1.z.object({
        userId: zod_1.z.number().describe("User id"),
        branchId: zod_1.z.number().describe("Branch id"),
    }),
});
exports.getUserMastersInfo = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, branchId }) {
    const activeBranchId = branchId;
    console.log("Получаю информацию о мастерах, у которых был клиент...");
    const records = yield (0, crmInfo_1.getClientRecords)(activeBranchId, userId);
    console.log(records);
    if (records.length === 0)
        return "Записи отсутствуют";
    const masters = records.map((record) => `Имя мастера: ${record.Employee}, ID мастера: ${record.EmployeeId}`);
    const uniqueMasters = Array.from(new Set(masters.flat()));
    const result = uniqueMasters.join("; ");
    console.log(result);
    return result;
}), {
    name: "getUserVistedMastersInfo",
    description: "Use to get information about masters that user visited",
    schema: zod_1.z.object({
        userId: zod_1.z.number().describe("User id"),
        branchId: zod_1.z.number().describe("Branch id"),
    }),
});
exports.getDateMastersInfo = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ branchId, date, ids, }) {
    console.log(`Узнаю доступность услуги на дату ${date} с id [${ids}]`);
    const activeBranchId = branchId;
    const employees = yield (0, crmInfo_1.getEmployeesByService)(activeBranchId, date, 1, ids);
    const masters = employees.map((employee) => `Имя мастера: ${employee.NameFirst} ${employee.NameLast}, ID мастера: ${employee.UserId}`);
    const result = masters.join("; ");
    console.log(result);
    if (masters.length === 0)
        return "Услуга недоступна в этот день. Нет мастеров, которые оказывают такую услугу.";
    return `Услуга доступна. Мастера, оказывающие услуги ${ids} на дату ${date}: ${result}`;
}), {
    name: "getMastersByDate",
    description: "Use to to find out whether the service is available on the date. Use only when you know the date and ids of the services",
    schema: zod_1.z.object({
        branchId: zod_1.z.number().describe("Branch id"),
        date: zod_1.z.string().describe("Date in format YYYY-MM-DD"),
        ids: zod_1.z
            .array(zod_1.z.number())
            .describe("Array of service ids which you want to check"),
    }),
});
exports.getParticularServiceInfo = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ serviceName, branchId, }) {
    console.log("Получаю информацию о конкретной услуге...");
    const response = yield (0, crmInfo_1.getServicesByBranch)(branchId);
    const services = response.map((service) => `название услуги: ${service.Name}, ID услуги: ${service.Id}, цена услуги: ${service.PriceS}-${service.PriceE}, длительность услуги: ${service.Duration}, исполнители: ${service}`);
    const result = services.join("; ");
    const model = new RAG_class_1.LLM().model;
    const prompt = prompts_1.PromptTemplate.fromTemplate(`Оставь только информацию, касающуюся услуги под названием {serviceName}
			Если такой услуги нет в списке, то ответь "Мы не предоставляем такую услугу"
			Список всех услуг: {servicesList}
			Твой ответ:
			`);
    const chain = prompt.pipe(model).pipe(new output_parsers_1.StringOutputParser());
    const output = yield chain.invoke({ serviceName, servicesList: result });
    return output;
}), {
    name: "getParticularServiceInfo",
    description: "Use to get information about particular service",
    schema: zod_1.z.object({
        serviceName: zod_1.z.string().describe("Service name"),
        branchId: zod_1.z.number().describe("Branch id"),
    }),
});
exports.createClientRecord = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, branchId, servicesIds, employeeId, time, }) {
    console.log("Создаю запись...");
    console.log(userId, branchId, employeeId, servicesIds, time);
    const TimeS = (0, moment_1.default)(time).format("YYYY-MM-DDTHH:mm:ss");
    const servicesInfo = servicesIds.map((id) => __awaiter(void 0, void 0, void 0, function* () { return yield (0, crmInfo_1.getServiceInfo)(id, branchId); }));
    const { Duration } = (yield Promise.all(servicesInfo)).reduce((acc, service) => {
        acc.Duration += service.Duration;
        return acc;
    }, { Duration: 0 });
    const clientInfo = yield (0, crmInfo_1.getClientInfo)(userId, branchId);
    const TimeE = (0, moment_1.default)(TimeS)
        .add(Duration, "minutes")
        .format("YYYY-MM-DDTHH:mm:ss");
    const requset = {
        BranchId: branchId,
        NameFirst: clientInfo.NameFirst,
        Phone: clientInfo.Phone1,
        ClientId: userId,
        EmployeeId: employeeId,
        ClientServices: yield Promise.all(servicesInfo),
        TimeS,
        TimeE,
        Comment: "Запись создана при помощи ИИ-сотрудника",
        IsPaid: false,
    };
    const result = yield (0, crmInfo_1.createRecord)(requset, branchId);
    return result;
}), {
    name: "createRecord",
    description: "Use to create a record. Use this tool only when time, services and employee are known",
    schema: zod_1.z.object({
        userId: zod_1.z.number().describe("Client id"),
        branchId: zod_1.z.number().describe("Branch id"),
        employeeId: zod_1.z.number().describe("Employee id"),
        servicesIds: zod_1.z.array(zod_1.z.number()).describe("Service id"),
        time: zod_1.z.string().describe("Time in format YYYY-MM-DDTHH:mm:ss"),
    }),
});
exports.serviceTimes = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ serviceId, date, branchId, }) {
    console.log("Узнаю доступное время для записи на услугу...");
    const employees = yield (0, crmInfo_1.getEmployeesByService)(branchId, date, 1, [
        serviceId,
    ]);
    const employeeIds = employees.map((employee) => employee.UserId);
    const allRecordsRaw = yield (0, serviceFunctions_1.asyncMap)(employeeIds, (id) => __awaiter(void 0, void 0, void 0, function* () {
        const schedule = yield (0, crmInfo_1.getEmployeesSchedule)(branchId, date, 1, [id]);
        const workingHours = {
            start: schedule[0].WorkSchedules[0].TimeS,
            end: schedule[0].WorkSchedules[0].TimeE,
        };
        return {
            id,
            records: yield (0, crmInfo_1.getEmployeeRecordsTip)(id, serviceId, date),
            workingHours,
        };
    }));
    const allRecords = allRecordsRaw.map((record) => {
        const records = record.records.map((r) => {
            return { start: r.TimeS, end: r.TimeE };
        });
        return {
            id: record.id,
            unavailableTimes: records,
            workingHours: record.workingHours,
        };
    });
    const serviceInfo = yield (0, crmInfo_1.getServiceInfo)(serviceId, branchId);
    const duration = serviceInfo.Duration;
    // console.log(allRecords);
    const intervals = (0, serviceFunctions_1.findAvailableTimes)(allRecords, duration);
    const mergedIntervals = (0, serviceFunctions_1.mergeIntervals)(intervals);
    console.log(mergedIntervals);
    const result = mergedIntervals.map((interval) => {
        return `
			${(0, moment_1.default)(interval.start).format("HH:mm")} - ${(0, moment_1.default)(interval.end).format("HH:mm")},
			`;
    });
    console.log(result);
    return result.join("\n");
}), {
    description: "Use to get information about available time for a particular service. Use only when you know the date and you are sure that the service is available on the date.",
    name: "getServiceTime",
    schema: zod_1.z.object({
        serviceId: zod_1.z.number().describe("Service id"),
        date: zod_1.z.string().describe("Date in format YYYY-MM-DD"),
        branchId: zod_1.z.number().describe("Branch id"),
    }),
});
exports.freeEmployees = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ date, time, branchId, serviceId, }) {
    console.log("Узнаю доступных мастеров на указанное время... " + time);
    const employees = yield (0, crmInfo_1.getEmployeesByService)(branchId, date, 1, [
        serviceId,
    ]);
    const employeeIds = employees.map((employee) => employee.UserId);
    const allRecordsRaw = yield (0, serviceFunctions_1.asyncMap)(employeeIds, (id) => __awaiter(void 0, void 0, void 0, function* () {
        const schedule = yield (0, crmInfo_1.getEmployeesSchedule)(branchId, date, 1, [id]);
        const workingHours = {
            start: schedule[0].WorkSchedules[0].TimeS,
            end: schedule[0].WorkSchedules[0].TimeE,
        };
        return {
            id,
            records: yield (0, crmInfo_1.getEmployeeRecordsTip)(id, serviceId, date),
            workingHours,
        };
    }));
    const allRecords = allRecordsRaw.map((record) => {
        const records = record.records.map((r) => {
            return { start: r.TimeS, end: r.TimeE };
        });
        return {
            id: record.id,
            unavailableTimes: records,
            workingHours: record.workingHours,
        };
    });
    const serviceInfo = yield (0, crmInfo_1.getServiceInfo)(serviceId, branchId);
    const duration = serviceInfo.Duration;
    const timeStr = time;
    // Создаем объект moment для даты
    const dateStr = (0, moment_1.default)(date);
    // Разделяем время на часы и минуты
    const [hours, minutes] = timeStr.split(":");
    // Устанавливаем время
    const hoursNum = parseInt(hours, 10);
    const minutesNum = parseInt(minutes, 10);
    dateStr.set({ hours: hoursNum, minutes: minutesNum });
    // Преобразуем в строку в формате ISO
    const requestetStartTime = (0, moment_1.default)(dateStr).format("YYYY-MM-DDTHH:mm:ss");
    const requestetEndTime = (0, moment_1.default)(requestetStartTime)
        .add(duration, "minutes")
        .format("YYYY-MM-DDTHH:mm:ss");
    const availableMasters = (0, serviceFunctions_1.findAvailableMasters)(allRecords, requestetStartTime, requestetEndTime);
    const mastersIds = availableMasters.map((master) => {
        return `
			MasterId: ${master.id},`;
    });
    console.log(mastersIds);
    return `ID доступных мастеров на указанное время: 
${mastersIds.join(", ")}`;
}), {
    name: "freeEmployees",
    description: "Use to find free masters when you know the date and time for a particular service. Use it before creating a record. Use it only when the client told you the time when he wants to get a service.",
    schema: zod_1.z.object({
        date: zod_1.z.string().describe("Date in format YYYY-MM-DD"),
        time: zod_1.z.string().describe("Time of a servicein format HH:mm"),
        branchId: zod_1.z.number().describe("Branch id"),
        serviceId: zod_1.z.number().describe("Service id"),
    }),
});
