import moment, { Moment } from "moment-timezone";
import { hubConnection } from "../signalR";
import { getAIUser, getBasicLeads } from "./crmInfo";
import { api } from "../bot";
import { addConnectedUser } from "./db";

export const getStringAfterCharacter = (
	input: string,
	character: string,
): string => {
	const index = input.indexOf(character);
	if (index === -1) {
		return "";
	}
	return input.substring(index + 1);
};

export const asyncMap = async <T, U>(
	array: T[],
	callback: (item: T, index: number, array: T[]) => Promise<U>,
): Promise<U[]> => {
	const results: U[] = [];
	for (let i = 0; i < array.length; i++) {
		const result = await callback(array[i], i, array);
		results.push(result);
	}
	return results;
};

export function isAvailable(
	executorUnavailableTimes: { start: string; end: string }[],
	requestedStart: string,
	requestedEnd: string,
) {
	const requestedStartMoment = moment(requestedStart);
	const requestedEndMoment = moment(requestedEnd);

	// Проверяем, не пересекается ли запрашиваемое время с временем недоступности
	for (const unavailable of executorUnavailableTimes) {
		const unavailableStartMoment = moment(unavailable.start);
		const unavailableEndMoment = moment(unavailable.end);

		if (
			requestedStartMoment.isBetween(
				unavailableStartMoment,
				unavailableEndMoment,
				null,
				"[)",
			) ||
			requestedEndMoment.isBetween(
				unavailableStartMoment,
				unavailableEndMoment,
				null,
				"(]",
			) ||
			(requestedStartMoment.isSameOrBefore(unavailableStartMoment) &&
				requestedEndMoment.isSameOrAfter(unavailableEndMoment))
		) {
			return false; // Исполнитель недоступен
		}
	}

	return true; // Исполнитель доступен
}

// Типы для данных
interface UnavailableTime {
	start: string; // Время начала недоступности
	end: string; // Время окончания недоступности
}

interface Master {
	id: number | string; // Имя мастера
	unavailableTimes: UnavailableTime[]; // Занятые интервалы мастера
	workingHours: {
		// Рабочие часы мастера
		start: string; // Начало рабочего дня
		end: string; // Конец рабочего дня
	};
}

interface AvailableTimeSlot {
	start: string; // Начало свободного интервала
	end: string; // Конец свободного интервала
}

function isTimeSlotBooked(
	unavailableTimes: UnavailableTime[],
	slotStart: Moment,
	slotEnd: Moment,
): boolean {
	return unavailableTimes.some(({ start, end }) => {
		const busyStart = moment(start);
		const busyEnd = moment(end);

		return (
			slotStart.isBetween(busyStart, busyEnd, null, "[)") ||
			slotEnd.isBetween(busyStart, busyEnd, null, "(]") ||
			(slotStart.isSameOrBefore(busyStart) && slotEnd.isSameOrAfter(busyEnd))
		);
	});
}

// Функция для поиска свободных интервалов
export function findAvailableTimes(
	masters: Master[],
	serviceDuration: number,
	step: number = 15,
	currentTime: Moment = moment()
		.minute(Math.ceil(moment().minute() / 10) * 10)
		.startOf("minute")
		.tz("Europe/Moscow"),
): AvailableTimeSlot[] {
	const availableTimes: AvailableTimeSlot[] = [];

	masters.forEach((master) => {
		const masterStart = moment(master.workingHours.start);
		const masterEnd = moment(master.workingHours.end);

		// Начинаем проверку с максимального из: начала рабочего дня или текущего времени
		const startTime = moment.max(masterStart, currentTime);
		let currentTimePointer = startTime.clone();

		while (currentTimePointer.isBefore(masterEnd)) {
			const slotStart = currentTimePointer.clone();
			const slotEnd = slotStart.clone().add(serviceDuration, "minutes");

			// Проверка трех условий:
			// 1. Интервал укладывается в рабочие часы
			// 2. Интервал не пересекается с занятым временем
			// 3. Дата интервала >= текущей даты
			if (
				slotEnd.isSameOrBefore(masterEnd) &&
				slotStart.isSameOrAfter(currentTime, "day") && // Проверка дня
				!isTimeSlotBooked(master.unavailableTimes, slotStart, slotEnd)
			) {
				availableTimes.push({
					start: slotStart.format("YYYY-MM-DDTHH:mm:ss"),
					end: slotEnd.format("YYYY-MM-DDTHH:mm:ss"),
				});
			}

			currentTimePointer.add(step, "minutes");
		}
	});

	return availableTimes;
}

export function mergeIntervals(
	intervals: AvailableTimeSlot[],
): AvailableTimeSlot[] {
	if (intervals.length === 0) return [];

	// Сортируем интервалы по времени начала
	intervals.sort((a, b) => moment(a.start).diff(moment(b.start)));

	const mergedIntervals: AvailableTimeSlot[] = [];
	let currentInterval = intervals[0];

	for (let i = 1; i < intervals.length; i++) {
		const nextInterval = intervals[i];
		const currentEnd = moment(currentInterval.end);
		const nextStart = moment(nextInterval.start);

		// Если интервалы пересекаются или следуют друг за другом, объединяем их
		if (nextStart.isSameOrBefore(currentEnd)) {
			currentInterval.end = moment
				.max(currentEnd, moment(nextInterval.end))
				.format("YYYY-MM-DDTHH:mm:ss");
		} else {
			mergedIntervals.push(currentInterval);
			currentInterval = nextInterval;
		}
	}

	// Добавляем последний интервал
	mergedIntervals.push(currentInterval);

	return mergedIntervals;
}

export function adjustAvailableIntervals(
	intervals: AvailableTimeSlot[],
	serviceDuration: number,
): AvailableTimeSlot[] {
	return intervals
		.map((interval) => {
			const start = moment(interval.start);
			const end = moment(interval.end).subtract(serviceDuration, "minutes");

			// Если интервал стал некорректным (например, end < start), пропускаем его
			if (end.isSameOrAfter(start)) {
				return {
					start: interval.start,
					end: end.format("YYYY-MM-DDTHH:mm:ss"),
				};
			} else {
				return null;
			}
		})
		.filter((interval) => interval !== null) as AvailableTimeSlot[];
}

export function findAvailableMasters(
	masters: Master[], // Массив мастеров
	requestedStart: string, // Начало запрашиваемого времени
	requestedEnd: string, // Конец запрашиваемого времени
): Master[] {
	const requestedStartMoment: Moment = moment(requestedStart);
	const requestedEndMoment: Moment = moment(requestedEnd);

	// Фильтруем мастеров, которые свободны в указанное время
	const availableMasters: Master[] = masters.filter((master: Master) => {
		const masterStartTime: Moment = moment(master.workingHours.start);
		const masterEndTime: Moment = moment(master.workingHours.end);

		// Проверяем, что запрашиваемое время укладывается в рабочие часы мастера
		if (
			requestedStartMoment.isBetween(
				masterStartTime,
				masterEndTime,
				null,
				"[)",
			) &&
			requestedEndMoment.isBetween(masterStartTime, masterEndTime, null, "(]")
		) {
			// Проверяем, что мастер не занят в это время
			return !master.unavailableTimes.some((unavailable: UnavailableTime) => {
				const unavailableStart: Moment = moment(unavailable.start);
				const unavailableEnd: Moment = moment(unavailable.end);

				return (
					requestedStartMoment.isBetween(
						unavailableStart,
						unavailableEnd,
						null,
						"[)",
					) ||
					requestedEndMoment.isBetween(
						unavailableStart,
						unavailableEnd,
						null,
						"(]",
					) ||
					(requestedStartMoment.isSameOrBefore(unavailableStart) &&
						requestedEndMoment.isSameOrAfter(unavailableEnd))
				);
			});
		}

		return false; // Время не укладывается в рабочие часы мастера
	});

	return availableMasters;
}

export function generateCRMString(num: number): string {
	// Обрезаем число до трех цифр
	const trimmedNum = num % 1000;
	// Дополняем нулями до трех цифр
	const paddedNum = trimmedNum.toString().padStart(3, "0");
	return `Crm-000-${paddedNum}`;
}

export const connectClientsSocket = async (
	clientsIds: number[],
	organizationId: number,
) => {
	await asyncMap(clientsIds, async (id) => {
		await hubConnection.invoke(
			"ListenClient",
			generateCRMString(organizationId),
			id,
		);
		await addConnectedUser(id, organizationId);
		console.log(`Connected to client ${id}`);
	});
};

export const connectAllClients = async (
	ActiveBranchId: number,
	branchIds: number[],
	organizationId: number,
) => {
	const leads = await getBasicLeads(ActiveBranchId, branchIds);
	// const AILeads = leads.filter((lead) => lead.userId === 422);
	const AILeads = leads;
	const clientIds = AILeads.map((lead) => lead.clientId);
	await connectClientsSocket(clientIds, organizationId);
};

export const getAILeadIds = async (
	organizationId: number,
	ActiveBranchId: number = 1,
	// branchIds: number[],
	// userId: number,
) => {
	const aiUser = await getAIUser(organizationId);
	const leads = await getBasicLeads(ActiveBranchId, aiUser.UserBranchIds);
	const AILeads = leads.filter((lead) => lead.userId === aiUser.Id);
	return AILeads.map((lead) => lead.leadId);
};

export const connectOrganization = async (organizationId: number) => {
	const aiUser = await getAIUser(organizationId);
	await connectAllClients(1, aiUser.UserBranchIds, organizationId);
};

export const sendToTg = async (message: string) => {
	await api.sendMessage(762569950, message);
};
