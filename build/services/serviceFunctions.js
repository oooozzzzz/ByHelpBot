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
exports.asyncMap = exports.getStringAfterCharacter = void 0;
exports.isAvailable = isAvailable;
exports.findAvailableTimes = findAvailableTimes;
exports.mergeIntervals = mergeIntervals;
exports.findAvailableMasters = findAvailableMasters;
const moment_1 = __importDefault(require("moment"));
const getStringAfterCharacter = (input, character) => {
    const index = input.indexOf(character);
    if (index === -1) {
        return "";
    }
    return input.substring(index + 1);
};
exports.getStringAfterCharacter = getStringAfterCharacter;
const asyncMap = (array, callback) => __awaiter(void 0, void 0, void 0, function* () {
    const results = [];
    for (let i = 0; i < array.length; i++) {
        const result = yield callback(array[i], i, array);
        results.push(result);
    }
    return results;
});
exports.asyncMap = asyncMap;
function isAvailable(executorUnavailableTimes, requestedStart, requestedEnd) {
    const requestedStartMoment = (0, moment_1.default)(requestedStart);
    const requestedEndMoment = (0, moment_1.default)(requestedEnd);
    // Проверяем, не пересекается ли запрашиваемое время с временем недоступности
    for (const unavailable of executorUnavailableTimes) {
        const unavailableStartMoment = (0, moment_1.default)(unavailable.start);
        const unavailableEndMoment = (0, moment_1.default)(unavailable.end);
        if (requestedStartMoment.isBetween(unavailableStartMoment, unavailableEndMoment, null, "[)") ||
            requestedEndMoment.isBetween(unavailableStartMoment, unavailableEndMoment, null, "(]") ||
            (requestedStartMoment.isSameOrBefore(unavailableStartMoment) &&
                requestedEndMoment.isSameOrAfter(unavailableEndMoment))) {
            return false; // Исполнитель недоступен
        }
    }
    return true; // Исполнитель доступен
}
// Функция для поиска свободных интервалов
function findAvailableTimes(masters, // Массив мастеров
serviceDuration, // Длительность услуги в минутах
step = 5) {
    const availableTimes = [];
    // Перебираем время с шагом
    const startTime = (0, moment_1.default)(masters[0].workingHours.start); // Начало рабочего дня
    const endTime = (0, moment_1.default)(masters[0].workingHours.end); // Конец рабочего дня
    let currentTime = startTime.clone();
    while (currentTime.isBefore(endTime)) {
        const slotStart = currentTime.clone();
        const slotEnd = currentTime.clone().add(serviceDuration, "minutes");
        // Проверяем, свободен ли хотя бы один мастер в этот интервал
        const isAvailable = masters.some((master) => {
            const masterStartTime = (0, moment_1.default)(master.workingHours.start);
            const masterEndTime = (0, moment_1.default)(master.workingHours.end);
            // Проверяем, находится ли интервал в рабочих часах мастера
            if (slotStart.isBetween(masterStartTime, masterEndTime, null, "[)") &&
                slotEnd.isBetween(masterStartTime, masterEndTime, null, "(]")) {
                // Проверяем, не занят ли мастер в этот интервал
                return !master.unavailableTimes.some((unavailable) => {
                    const unavailableStart = (0, moment_1.default)(unavailable.start);
                    const unavailableEnd = (0, moment_1.default)(unavailable.end);
                    return (slotStart.isBetween(unavailableStart, unavailableEnd, null, "[)") ||
                        slotEnd.isBetween(unavailableStart, unavailableEnd, null, "(]") ||
                        (slotStart.isSameOrBefore(unavailableStart) &&
                            slotEnd.isSameOrAfter(unavailableEnd)));
                });
            }
            return false; // Интервал не входит в рабочие часы мастера
        });
        // Если время свободно, добавляем его в список доступных
        if (isAvailable) {
            availableTimes.push({
                start: slotStart.format("YYYY-MM-DDTHH:mm:ss"),
                end: slotEnd.format("YYYY-MM-DDTHH:mm:ss"),
            });
        }
        // Переходим к следующему интервалу
        currentTime.add(step, "minutes");
    }
    return availableTimes;
}
// Пример использования
const masters = [
    {
        id: "Мастер 1",
        unavailableTimes: [
            { start: "2023-10-01T10:00:00", end: "2023-10-01T12:00:00" },
            { start: "2023-10-01T14:00:00", end: "2023-10-01T15:00:00" },
        ],
        workingHours: {
            start: "2023-10-01T09:00:00",
            end: "2023-10-01T18:00:00",
        },
    },
    {
        id: "Мастер 2",
        unavailableTimes: [
            { start: "2023-10-01T09:00:00", end: "2023-10-01T11:00:00" },
            { start: "2023-10-01T13:00:00", end: "2023-10-01T14:00:00" },
        ],
        workingHours: {
            start: "2023-10-01T10:00:00",
            end: "2023-10-01T17:00:00",
        },
    },
];
const serviceDuration = 60; // 1 час
// Поиск доступных интервалов
const availableTimes = findAvailableTimes(masters, serviceDuration);
function mergeIntervals(intervals) {
    if (intervals.length === 0)
        return [];
    // Сортируем интервалы по времени начала
    intervals.sort((a, b) => (0, moment_1.default)(a.start).diff((0, moment_1.default)(b.start)));
    const mergedIntervals = [];
    let currentInterval = intervals[0];
    for (let i = 1; i < intervals.length; i++) {
        const nextInterval = intervals[i];
        const currentEnd = (0, moment_1.default)(currentInterval.end);
        const nextStart = (0, moment_1.default)(nextInterval.start);
        // Если интервалы пересекаются или следуют друг за другом, объединяем их
        if (nextStart.isSameOrBefore(currentEnd)) {
            currentInterval.end = moment_1.default
                .max(currentEnd, (0, moment_1.default)(nextInterval.end))
                .format("YYYY-MM-DDTHH:mm:ss");
        }
        else {
            mergedIntervals.push(currentInterval);
            currentInterval = nextInterval;
        }
    }
    // Добавляем последний интервал
    mergedIntervals.push(currentInterval);
    return mergedIntervals;
}
function findAvailableMasters(masters, // Массив мастеров
requestedStart, // Начало запрашиваемого времени
requestedEnd) {
    const requestedStartMoment = (0, moment_1.default)(requestedStart);
    const requestedEndMoment = (0, moment_1.default)(requestedEnd);
    // Фильтруем мастеров, которые свободны в указанное время
    const availableMasters = masters.filter((master) => {
        const masterStartTime = (0, moment_1.default)(master.workingHours.start);
        const masterEndTime = (0, moment_1.default)(master.workingHours.end);
        // Проверяем, что запрашиваемое время укладывается в рабочие часы мастера
        if (requestedStartMoment.isBetween(masterStartTime, masterEndTime, null, "[)") &&
            requestedEndMoment.isBetween(masterStartTime, masterEndTime, null, "(]")) {
            // Проверяем, что мастер не занят в это время
            return !master.unavailableTimes.some((unavailable) => {
                const unavailableStart = (0, moment_1.default)(unavailable.start);
                const unavailableEnd = (0, moment_1.default)(unavailable.end);
                return (requestedStartMoment.isBetween(unavailableStart, unavailableEnd, null, "[)") ||
                    requestedEndMoment.isBetween(unavailableStart, unavailableEnd, null, "(]") ||
                    (requestedStartMoment.isSameOrBefore(unavailableStart) &&
                        requestedEndMoment.isSameOrAfter(unavailableEnd)));
            });
        }
        return false; // Время не укладывается в рабочие часы мастера
    });
    return availableMasters;
}
