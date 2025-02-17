import { tool, ToolRunnableConfig } from "@langchain/core/tools";
import { PromptTemplate } from "@langchain/core/prompts";
import "dotenv/config";
import { date, z } from "zod";
import {
	createRecord,
	getClientInfo,
	getClientRecords,
	getEmployeeRecords,
	getEmployeesByService,
	getServiceInfo,
	getServicesByBranch,
	getEmployeeRecordsTip,
	getWorkingHours,
	getEmployeesSchedule,
	updateRecord,
	getInfoForAI,
} from "../services/crmInfo";
import { LLM } from "./RAG_class";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { time } from "console";
import moment from "moment";
import { createRecotdBody } from "../types";
import {
	adjustAvailableIntervals,
	asyncMap,
	findAvailableMasters,
	findAvailableTimes,
	mergeIntervals,
} from "../services/serviceFunctions";
import { start } from "repl";
import { getThread } from "../services/db";

export const getServicesInfo = tool(
	async ({ branchId }: { branchId: number }) => {
		console.log("Получаю информацию об услугах...");
		const response = await getServicesByBranch(branchId);
		const services = response.map(
			(service) =>
				`название услуги: ${service.Name}, ID услуги: ${service.Id}, цена услуги: ${service.PriceS}-${service.PriceE}, длительность услуги: ${service.Duration}`,
		);
		const result = services.join("; ");
		return result;
	},
	{
		name: "getServicesInfo",
		description:
			"Use to get information about services that the beauty salon provides.",
		schema: z.object({
			branchId: z.number().describe("Branch id"),
		}),
	},
);

export const workingHours = tool(
	async ({ date, bracnId }: { date: string; bracnId: number }) => {
		console.log("Узнаю рабочие часы на дату " + date);
		const response = await getWorkingHours(bracnId, date, 1);
		const result = `Время работы: ${response.WorkTimeS}-${response.WorkTimeE}`;
		console.log(result);
		return result;
	},
	{
		name: "workingHours",
		description:
			"Use to get working hours of a beauty salon. Not suitable for masters",
		schema: z.object({
			date: z.string().describe("Date in format YYYY-MM-DD"),
			bracnId: z.number().describe("Branch id"),
		}),
	},
);

export const getClientEmployees = tool(
	async ({ userId, branchId }: { userId: number; branchId: number }) => {
		console.log("Получаю информацию о мастерах, у которых был клиент...");
		const records = await getClientRecords(branchId, userId);
		const masters = records.map(
			(r) => `Имя мастера: ${r.Employee}, ID мастера: ${r.EmployeeId}`,
		);
		const uniqueMasters = Array.from(new Set(masters.flat()));
		return `Мастера у которых был клиент: 
${uniqueMasters.join("; ")}`;
	},
	{
		name: "getClientEmployees",
		description: "Use to get information about masters that client visited",
		schema: z.object({
			userId: z.number().describe("User id"),
			branchId: z.number().describe("Branch id"),
		}),
	},
);

export const getRecordsInfo = tool(
	async ({ userId, branchId }: { userId: number; branchId: number }) => {
		console.log("Узнаю о записях клиента...");
		const activeBranchId = branchId;
		const records = (await getClientRecords(activeBranchId, userId)).slice(
			0,
			10,
		);
		const services = records.map((record) => record.Services);
		if (services.length === 0) return "Записи отсутствуют";
		const recordsFormated = records.map((r) => {
			const id = r.RecordId;
			const timeS = r.TimeS;
			const timeE = r.TimeE;
			const services = r.Services?.map(
				(s) => `Название услуги: ${s.Service}, ID услуги: ${s.ServiceId}`,
			);
			return { id, timeS, timeE, services };
		});

		const result = JSON.stringify(recordsFormated);
		console.log(result);
		return result;
	},
	{
		name: "getRecordsInfo",
		description: "Use to get information about visits of a user",
		schema: z.object({
			userId: z.number().describe("User id"),
			branchId: z.number().describe("Branch id"),
		}),
	},
);
export const getUserMastersInfo = tool(
	async ({ userId, branchId }: { userId: number; branchId: number }) => {
		const activeBranchId = branchId;
		console.log("Получаю информацию о мастерах, у которых был клиент...");
		const records = await getClientRecords(activeBranchId, userId);
		console.log(records);
		if (records.length === 0) return "Записи отсутствуют";
		const masters = records.map(
			(record) =>
				`Имя мастера: ${record.Employee}, ID мастера: ${record.EmployeeId}`,
		);
		const uniqueMasters = Array.from(new Set(masters.flat()));

		const result = uniqueMasters.join("; ");
		console.log(result);
		return result;
	},
	{
		name: "getUserVistedMastersInfo",
		description: "Use to get information about masters that user visited",
		schema: z.object({
			userId: z.number().describe("User id"),
			branchId: z.number().describe("Branch id"),
		}),
	},
);

export const getDateMastersInfo = tool(
	async ({
		branchId,
		date,
		ids,
	}: {
		branchId: number;
		date: string;
		ids: number[];
	}) => {
		console.log(`Узнаю доступность услуги на дату ${date} с id [${ids}]`);
		const activeBranchId = branchId;
		const employees = await getEmployeesByService(activeBranchId, date, 1, ids);
		const masters = employees!.map(
			(employee) =>
				`Имя мастера: ${employee.NameFirst} ${employee.NameLast}, ID мастера: ${employee.UserId}`,
		);
		const result = masters.join("; ");
		console.log(result);
		if (masters.length === 0)
			return "Услуга недоступна в этот день. Нет мастеров, которые оказывают такую услугу.";
		return `Услуга доступна. Мастера, оказывающие услуги ${ids} на дату ${date}: ${result}`;
	},
	{
		name: "getDateMastersInfo",
		description:
			"Use to get information about available masters on the date. Use only when you know the date and ids of the services",
		schema: z.object({
			branchId: z.number().describe("Branch id"),
			date: z.string().describe("Date in format YYYY-MM-DD"),
			ids: z
				.array(z.number())
				.describe("Array of service ids which you want to check"),
		}),
	},
);

export const getParticularServiceInfo = tool(
	async ({
		serviceName,
		branchId,
	}: {
		serviceName: string;
		branchId: number;
	}) => {
		console.log("Получаю информацию о конкретной услуге...");
		const response = await getServicesByBranch(branchId);
		const services = response.map(
			(service) =>
				`название услуги: ${service.Name}, ID услуги: ${service.Id}, цена услуги: ${service.PriceS}-${service.PriceE}, длительность услуги: ${service.Duration}`,
		);
		const result = services.join("; ");
		const model = new LLM().model;
		const prompt =
			PromptTemplate.fromTemplate(`Оставь только информацию, касающуюся услуги под названием {serviceName}
			Если такой услуги нет в списке, то ответь "Мы не предоставляем такую услугу"
			Список всех услуг: {servicesList}
			Твой ответ:
			`);
		const chain = prompt.pipe(model).pipe(new StringOutputParser());
		const output = await chain.invoke({ serviceName, servicesList: result });
		console.log(output);
		return output;
	},
	{
		name: "getParticularServiceInfo",
		description:
			"Use to get information about particular service. Use each time when client tells you the name of the service",
		schema: z.object({
			serviceName: z.string().describe("Service name"),
			branchId: z.number().describe("Branch id"),
		}),
	},
);

export const createClientRecord = tool(
	async ({
		userId,
		branchId,
		servicesIds,
		employeeId,
		time,
	}: {
		userId: number;
		branchId: number;
		employeeId: number;
		servicesIds: number[];
		time: string;
	}) => {
		console.log("Создаю запись...");
		console.log(userId, branchId, employeeId, servicesIds, time);
		const TimeS = moment(time).format("YYYY-MM-DDTHH:mm:ss");

		const servicesInfo = servicesIds.map(
			async (id) => await getServiceInfo(id, branchId),
		);

		const allServices = (await Promise.all(servicesInfo)).map((service) => {
			return { ...service, Count: 1 };
		});
		console.log(allServices);

		const { Duration } = allServices.reduce(
			(acc, service) => {
				acc.Duration += service.Duration;
				return acc;
			},
			{ Duration: 0 },
		);

		const clientInfo = await getClientInfo(userId, branchId);

		const TimeE = moment(TimeS)
			.add(Duration, "minutes")
			.format("YYYY-MM-DDTHH:mm:ss");
		const requset: createRecotdBody = {
			BranchId: branchId,
			NameFirst: clientInfo.NameFirst,
			Phone: clientInfo.Phone1,
			ClientId: userId,
			EmployeeId: employeeId,
			ClientServices: allServices,
			TimeS,
			TimeE,
			Comment: "Запись создана при помощи ИИ-сотрудника",
			IsPaid: false,
		};
		const result = await createRecord(requset, branchId);
		return result;
	},
	{
		name: "createRecord",
		description:
			"Use to create a record. Use this tool only when time, services and employee are known",
		schema: z.object({
			userId: z.number().describe("Client id"),
			branchId: z.number().describe("Branch id"),
			employeeId: z.number().describe("Employee id"),
			servicesIds: z.array(z.number()).describe("Service id"),
			time: z.string().describe("Time in format YYYY-MM-DDTHH:mm:ss"),
		}),
	},
);

export const serviceTimes = tool(
	async ({
		serviceId,
		date,
		branchId,
	}: {
		serviceId: number;
		date: string;
		branchId: number;
	}) => {
		console.log(
			`Узнаю доступное время для записи на услугу... ${serviceId} и дату ${date}`,
		);
		try {
			const employees = await getEmployeesByService(branchId, date, 1, [
				serviceId,
			]);
			console.log(employees);
			if (employees.length === 0) {
				return "Нет мастеров, которые оказывают такую услугу";
			}
			const employeeIds = employees!.map((employee) => employee.UserId);
			const allRecordsRaw = await asyncMap(employeeIds, async (id) => {
				const schedule = await getEmployeesSchedule(branchId, date, 1, [id]);
				const workingHours = {
					start: schedule[0].WorkSchedules[0].TimeS,
					end: schedule[0].WorkSchedules[0].TimeE,
				};
				return {
					id,
					records: await getEmployeeRecordsTip(id, branchId, date),
					workingHours,
				};
			});

			const allRecords = allRecordsRaw.map((record) => {
				const records = record.records?.map((r) => {
					return { start: r.TimeS, end: r.TimeE };
				});
				return {
					id: record.id,
					unavailableTimes: records,
					workingHours: record.workingHours,
				};
			});

			const serviceInfo = await getServiceInfo(serviceId, branchId);
			let duration = serviceInfo.Duration;
			if (duration === 0) {
				duration = 30;
			}

			const intervals = findAvailableTimes(allRecords, duration);
			const mergedIntervals = mergeIntervals(intervals);
			const adjustedIntervals = adjustAvailableIntervals(
				mergedIntervals,
				duration,
			);
			const result = adjustedIntervals.map((interval) => {
				if (interval.start === interval.end)
					return `${moment(interval.start).format("HH:mm")},`;
				return `${moment(interval.start).format("HH:mm")} - ${moment(
					interval.end,
				).format("HH:mm")},`;
			});

			console.log(result);
			if (result.length === 0) return "Нет доступного времени";
			return result.join("\n");
		} catch (error) {
			console.log(error);
		}
	},
	{
		description:
			"Use to get information about доступном времени для записи на конкретную услугу. Можно записаться на любое время, которое выведет этот инструмент. Use only when you know the date and you are sure that the service is available on the date.",
		name: "getServiceTime",
		schema: z.object({
			serviceId: z.number().describe("Service id"),
			date: z.string().describe("Date in format YYYY-MM-DD"),
			branchId: z.number().describe("Branch id"),
		}),
	},
);

export const freeEmployees = tool(
	async ({
		date,
		time,
		branchId,
		serviceId,
	}: {
		date: string;
		time: string;
		branchId: number;
		serviceId: number;
	}) => {
		try {
			console.log(
				`Узнаю доступных мастеров на время ${time}, дату ${date} и услугу с ID ${serviceId}`,
			);
			const employees = await getEmployeesByService(branchId, date, 1, [
				serviceId,
			]);
			const employeeIds = employees!.map((employee) => employee.UserId);
			const allRecordsRaw = await asyncMap(employeeIds, async (id) => {
				const schedule = await getEmployeesSchedule(branchId, date, 1, [id]);
				const workingHours = {
					start: schedule[0].WorkSchedules[0].TimeS,
					end: schedule[0].WorkSchedules[0].TimeE,
				};
				return {
					id,
					records: (await getEmployeeRecordsTip(id, branchId, date)) || [],
					workingHours,
				};
			});

			console.log(allRecordsRaw);
			const allRecords = allRecordsRaw.map((record) => {
				const records = record.records.map((r) => {
					return { start: r.TimeS, end: r.TimeE };
				});
				return {
					id: record.id,
					unavailableTimes: records ? records : [],
					workingHours: record.workingHours,
				};
			});

			const serviceInfo = await getServiceInfo(serviceId, branchId);
			const duration = serviceInfo.Duration;

			const timeStr = time;

			// Создаем объект moment для даты
			const dateStr = moment(date);

			// Разделяем время на часы и минуты
			const [hours, minutes] = timeStr.split(":");

			// Устанавливаем время
			const hoursNum = parseInt(hours, 10);
			const minutesNum = parseInt(minutes, 10);
			dateStr.set({ hours: hoursNum, minutes: minutesNum });

			// Преобразуем в строку в формате ISO
			const requestetStartTime = moment(dateStr).format("YYYY-MM-DDTHH:mm:ss");
			const requestetEndTime = moment(requestetStartTime)
				.add(duration, "minutes")
				.format("YYYY-MM-DDTHH:mm:ss");
			console.log(allRecords);

			const availableMasters = findAvailableMasters(
				allRecords,
				requestetStartTime,
				requestetEndTime,
			);
			const mastersIds = availableMasters.map((master) => {
				return `MasterId: ${master.id},`;
			});
			console.log(mastersIds);
			return `ID доступных мастеров на указанное время: 
${mastersIds.join(", ")}`;
		} catch (error) {
			console.log(error);
		}
	},
	{
		name: "freeEmployees",
		description:
			"Use to find free masters when you know the date and time for a particular service. Use it before creating a record. Use it only when the client told you the time when he wants to have a service.",
		schema: z.object({
			date: z.string().describe("Date in format YYYY-MM-DD"),
			time: z.string().describe("Time of a service in format HH:mm"),
			branchId: z.number().describe("Branch id"),
			serviceId: z.number().describe("Service id"),
		}),
	},
);

export const editRecord = tool(
	async ({
		userId,
		branchId,
		employeeId,
		servicesIds,
		time,
		recordId,
	}: {
		userId: number;
		branchId: number;
		employeeId: number;
		servicesIds: number[];
		time: string;
		recordId: number;
	}) => {
		console.log("Изменяю запись...");
		// await updateRecord(
		// 	recordId,
		// 	userId,
		// );
		return "Запись изменена";
	},
	{
		name: "editRecord",
		description: "Use to edit a record",
		schema: z.object({
			userId: z.number().describe("User id"),
			branchId: z.number().describe("Branch id"),
			employeeId: z.number().describe("Employee id"),
			servicesIds: z.array(z.number()).describe("Service ids"),
			time: z.string().describe("Time of a servicein format HH:mm"),
			recordId: z.number().describe("Record id"),
		}),
	},
);

export const getAnyInfo = tool(
	async (
		{ question }: { question: string },
		{ configurable }: ToolRunnableConfig,
	) => {
		console.log("Ищу информацию в предоставленных данных...");
		const thread = configurable?.thread_id;
		const threadInfo = await getThread(parseInt(thread));
		const branchId = threadInfo?.activeBranchId!;
		const AIInfo = await getInfoForAI(1, branchId);
		// const themes = AIInfo.map((i) => i.Type);
		console.log(question);
		const model = new LLM().model;
		// 		const prompt1 = PromptTemplate.fromTemplate(`
		// Тебе даны несколько тем: {themes}
		// Твоя задача определить на какую тему задан вопрос.
		// Вопрос: {question}
		// Твой ответ должен содеражть лишь одно слово из списка тем.
		// Твой ответ:
		// 		`);
		// 		const chain1 = prompt1.pipe(model).pipe(new StringOutputParser());
		// 		const theme = await chain1.invoke({ themes: themes.join(", "), question });
		// 		console.log(theme);
		const actualInfo = AIInfo.map((i) => i.Content).join("\n");
		const prompt2 = PromptTemplate.fromTemplate(`
Ответь на вопрос максимально информативно. Не добавляй информацию, которой нет в данных, и не делай предположений. Если данных для ответа нет, ответь "Нет информации".
В информации могут быть ссылки. Учитывай это при формировании ответа.
Данные: {info}
Вопрос: {question}
Твой ответ:Ы
			`);
		const chain2 = prompt2.pipe(model).pipe(new StringOutputParser());
		const output = await chain2.invoke({ info: actualInfo, question });
		console.log(output);
		return output;
	},
	{
		description:
			"Use this tool to get information about something that do not have anything to do with services, working schedules and your task. Use this tool only if you failed to find information using the other tools.",
		name: "GetOtherInformation",
		schema: z.object({
			question: z.string().describe("Question"),
		}),
	},
);
