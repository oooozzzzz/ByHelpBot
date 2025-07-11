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
  getBranchInfo,
} from "../services/crmInfo";
import { LLM } from "./RAG_class";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { time } from "console";
import moment from "moment";
import { createRecordBody } from "../types";
import {
  adjustAvailableIntervals,
  asyncMap,
  findAvailableMasters,
  findAvailableTimes,
  mergeIntervals,
} from "../services/serviceFunctions";
import { start } from "repl";
import { getThread } from "../services/db";
// import { schedule } from "node-cron";
import { scheduleJob } from "node-schedule";
import { agent } from "../bot";

// файл со всеми инструментами для ИИ
// описание инструментов можно почитать в поле description, а также посмотреть по логам
// в каждом инструменте ИИ берет информацию из СРМ и возвращает ее в удобном для восприятия чтау ГПТ виде

export const getServicesInfo = tool(
  async ({ branchId }: { branchId: number }) => {
    console.log("Получаю информацию об услугах...");
    const response = await getServicesByBranch(branchId);
    const services = response.map(
      (service) =>
        `название услуги: ${service.Name}, ID услуги: ${service.Id}, цена услуги: ${service.PriceS}-${service.PriceE}, длительность услуги: ${service.Duration}`
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
  }
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
  }
);

export const getClientEmployees = tool(
  async ({ userId, branchId }: { userId: number; branchId: number }) => {
    console.log("Получаю информацию о мастерах, у которых был клиент...");
    const records = await getClientRecords(branchId, userId);
    const masters = records.map(
      (r) => `Имя мастера: ${r.Employee}, ID мастера: ${r.EmployeeId}`
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
  }
);

export const getRecordsInfo = tool(
  async ({ userId, branchId }: { userId: number; branchId: number }) => {
    console.log("Узнаю о записях клиента...");
    const activeBranchId = branchId;
    const records = (await getClientRecords(activeBranchId, userId)).slice(
      0,
      10
    );
    const services = records.map((record) => record.Services);
    if (services.length === 0) return "Записи отсутствуют";
    const recordsFormated = records.map((r) => {
      const id = r.RecordId;
      const timeS = r.TimeS;
      const timeE = r.TimeE;
      const services = r.Services?.map(
        (s) => `Название услуги: ${s.Service}, ID услуги: ${s.ServiceId}`
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
  }
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
        `Имя мастера: ${record.Employee}, ID мастера: ${record.EmployeeId}`
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
  }
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
        `Имя мастера: ${employee.NameFirst} ${employee.NameLast}, ID мастера: ${employee.UserId}`
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
      "Use to get information about available masters on the date. Use only when you know the date and ids of the services.",
    schema: z.object({
      branchId: z.number().describe("Branch id"),
      date: z.string().describe("Date in format YYYY-MM-DD"),
      ids: z
        .array(z.number())
        .describe("Array of service ids which you want to check"),
    }),
  }
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
        `название услуги: ${service.Name}, ID услуги: ${service.Id}, цена услуги: ${service.PriceS}-${service.PriceE}, длительность услуги: ${service.Duration}`
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
  }
);

export const createClientRecord = tool(
  async (
    {
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
    },
    options
  ) => {
    // инструмент для создания записи в СРМ
    console.log("Создаю запись...");
    console.log(userId, branchId, employeeId, servicesIds, time);
    const thread = options.configurable?.thread_id;
    const timeS = moment.tz(time, "Europe/Moscow");

    const TimeS = moment
      .tz(timeS.format("YYYY-MM-DDTHH:mm:ss"), "Europe/Moscow")
      .format("YYYY-MM-DDTHH:mm:ss");

    const servicesInfo = servicesIds.map(
      async (id) => await getServiceInfo(id, branchId)
    );

    const allServices = (await Promise.all(servicesInfo)).map((service) => {
      return {
        Id: service.Id,
        Count: 1,
        Name: service.Name,
        CategoryId: service.CategoryId,
        Category: service.Category,
        PriceS: service.PriceS,
        PriceE: service.PriceE,
        Duration: service.Duration == 0 ? 60 : service.Duration,
        Paid: 0,
        Discount: 0,
      };
    });

    const { Duration } = allServices.reduce(
      (acc, service) => {
        acc.Duration += service.Duration;
        return acc;
      },
      { Duration: 0 }
    );
    console.log(allServices);

    const clientInfo = await getClientInfo(userId, branchId);

    const TimeE = moment(TimeS)
      .add(Duration, "minutes")
      .format("YYYY-MM-DDTHH:mm:ss");
    const requset: createRecordBody = {
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
    const job = scheduleJob(TimeE, async () => {
      await agent.clearMessageHistory(thread);
      job.cancel();
    });
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
      time: z
        .string()
        .describe("Time in format YYYY-MM-DDTHH:mm:ss without timezones"),
    }),
  }
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
    // узнаем доступное время для записи без учета конкретного мастера, а берем сразу всех
    console.log(
      `Узнаю доступное время для записи на услугу... ${serviceId} и дату ${date}`
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
      const branchInfo = await getBranchInfo(branchId, branchId);
      const tz = branchInfo.Timezone;
      const intervals = findAvailableTimes(
        allRecords,
        duration,
        10,
        moment()
          .minute(Math.ceil(moment().minute() / 10) * 10)
          .startOf("minute")
          .tz(tz)
      );
      const mergedIntervals = mergeIntervals(intervals);
      const adjustedIntervals = adjustAvailableIntervals(
        mergedIntervals,
        duration
      );
      const result = adjustedIntervals.map((interval) => {
        if (interval.start === interval.end)
          return `${moment(interval.start).format("HH:mm")},`;
        return `С ${moment(interval.start).format("HH:mm")} до ${moment(
          interval.end
        ).format("HH:mm")},`;
      });

      console.log(result);
      if (result.length === 0) return "Нет доступного времени";
      return `Доступное время для записи: ${result.join("\n")}.`;
    } catch (error) {
      console.log(error);
    }
  },
  {
    description:
      "Use to get information about доступном времени для записи на конкретную услугу. Можно записаться на любое время, которое выведет этот инструмент (в том числе интервалы, например 13:30-18:00 значит, что можно записаться на любое время между 13:30 и 18:00). Use only when you know the date and you are sure that the service is available on the date.",
    name: "getServiceTime",
    schema: z.object({
      serviceId: z.number().describe("Service id"),
      date: z.string().describe("Date in format YYYY-MM-DD"),
      branchId: z.number().describe("Branch id"),
    }),
  }
);

export const masterSchedule = tool(
  async ({
    date,
    branchId,
    serviceId,
    employeeId,
  }: {
    date: string;
    branchId: number;
    serviceId: number;
    employeeId: number;
  }) => {
    // определяем время работы мастера с учетом его расписания
    console.log(
      `Узнаю доступное время для записи на услугу... ${serviceId} и дату ${date} к мастеру ${employeeId}`
    );
    try {
      // алгоритм такой же, как и в инструменте freeEmployees (расположен ниже)
      const employees = await getEmployeesByService(branchId, date, 1, [
        serviceId,
      ]);
      console.log(employees);
      if (employees.length === 0) {
        return "Нет мастеров, которые оказывают такую услугу";
      }
      const employeeIds = employees!
        .map((employee) => employee.UserId)
        .filter((id) => id === employeeId);
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
      const branchInfo = await getBranchInfo(branchId, branchId);
      const tz = branchInfo.Timezone;
      // находим интервалы (логику под капотом смотреть в соответствующих функциях)
      const intervals = findAvailableTimes(
        allRecords,
        duration,
        10,
        moment()
          .minute(Math.ceil(moment().minute() / 10) * 10)
          .startOf("minute")
          .tz(tz)
      );
      // объединяем интервалы, чтобы все выглядело, как 15-20, а не 15,16,17,18,19,20
      // иными словами, преобразуем в читаемый вид
      const mergedIntervals = mergeIntervals(intervals);
      // уточняем интервалы, исходя из продолжительности услуги, чтобы заложить в интервалы время на собственно оказание услуги.
      // пример: рабочие часы мастера с 10 до 22, услуга длится час. по логике, последнее доступное для этой услуги время это 21, так как в 22
      // мастер уже закончит работу. Именно такую логику реализует данная функция
      const adjustedIntervals = adjustAvailableIntervals(
        mergedIntervals,
        duration
      );
      // преобразуем результат в строки, чтобы ИИ мог их удобно воспринять
      const result = adjustedIntervals.map((interval) => {
        if (interval.start === interval.end)
          return `${moment(interval.start).format("HH:mm")},`;
        return `С ${moment(interval.start).format("HH:mm")} до ${moment(
          interval.end
        ).format("HH:mm")},`;
      });

      console.log(result);
      if (result.length === 0) return "Нет доступного времени";
      return `Доступные интервалы для записи к мастеру с id ${employeeId}: ${result.join(
        "\n"
      )}`;
    } catch (error) {
      console.log(error);
    }
  },
  {
    name: "particularMasterSchedule",
    description:
      "Use this tool to find information about schedule of a particular master. Use it only when a client told you the time when he wants to have a service and name of the master he wants to visit. Используй этот инструмент, когда клиент спросит расписание конкретного мастера в конкретную дату.",
    schema: z.object({
      serviceId: z.number().describe("Service id"),
      date: z.string().describe("Date in format YYYY-MM-DD"),
      branchId: z.number().describe("Branch id"),
      employeeId: z.number().describe("Employee id"),
    }),
  }
);

export const freeEmployees: any = tool(
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
    // алгоритм по определению доступных мастеров для записи
    // анализирует свободных мастеров в на указанную дату (находит через API СРМ) и возвращает список с ID мастеров
    try {
      console.log(
        `Узнаю доступных мастеров на время ${time}, дату ${date} и услугу с ID ${serviceId}`
      );
      // получаем мастеров, которые оказывают услугу в заданную дату
      const employees = await getEmployeesByService(branchId, date, 1, [
        serviceId,
      ]);
      // получаем их ID
      const employeeIds = employees!.map((employee) => employee.UserId);
      // преобразуем данные в удобный вид
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
      // получаем данные об услуге
      const serviceInfo = await getServiceInfo(serviceId, branchId);
      // нас интересует продолжительность
      const duration = serviceInfo.Duration == 0 ? 60 : serviceInfo.Duration;

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
        requestetEndTime
      );
      const mastersIds = availableMasters.map((master) => {
        return master.id;
      });
      console.log(mastersIds);
      const mastersNames = employees.filter((employee) =>
        mastersIds.includes(employee.UserId)
      );
      if (mastersIds.length === 0) return "Нет доступных мастеров";
      return `Доступные мастера на указанное время: 
${mastersNames
  .map(
    (master) =>
      `Имя мастера: ${master.NameFirst} ${master.NameLast}, ID мастера: ${master.UserId}`
  )
  .join("\n")}`;
    } catch (error) {
      console.log(error);
    }
  },
  {
    name: "freeEmployeesOnParticularTime",
    description:
      "Use to find free masters when you know the date and time for a particular service. Use it before creating a record. Use it only when the client told you the time when he wants to have a service.",
    schema: z.lazy(() =>
      z.object({
        date: z.string().describe("Date in format YYYY-MM-DD"),
        time: z.string().describe("Time of a service in format HH:mm"),
        branchId: z.number().describe("Branch id"),
        serviceId: z.number().describe("Service id"),
      })
    ),
  }
);

// пока не используется
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
  }
);

export const getAnyInfo = tool(
  async (
    { question }: { question: string },
    { configurable }: ToolRunnableConfig
  ) => {
    console.log("Ищу информацию в предоставленных данных...");
    const thread = configurable?.thread_id;
    const threadInfo = await getThread(parseInt(thread));
    const branchId = threadInfo?.activeBranchId!;
    const AIInfo = await getInfoForAI(1, branchId);
    // const themes = AIInfo.map((i) => i.Type);
    console.log(question);
    const model = new LLM().model;
    // в СРМ сделано несколько полей по типу информации. ИИ это очень неудобно воспринимать, поэтому мы все поля объединяем в единую строку, чтобы скормить ее чату ГПТ
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
  }
);
