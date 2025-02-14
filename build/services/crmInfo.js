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
exports.getEmployeeRecordsTip = exports.getEmployeeRecords = exports.getEmployeesSchedule = exports.getServiceInfo = exports.getClientInfo = exports.createRecord = exports.getEmployeesByService = exports.getClientRecords = exports.getBranchInfo = exports.getEmployees = exports.getRecordInfo = exports.getServicesByBranch = exports.getWorkingHours = void 0;
const moment_1 = __importDefault(require("moment"));
const axios_1 = require("../axios/axios");
const serviceFunctions_1 = require("./serviceFunctions");
const getWorkingHours = (branchId, date, ActiveBranchId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/Branches/GetBranchWorkTimesOnDate", {
        params: {
            branchId,
            date,
            ActiveBranchId,
        },
    });
    const data = JSON.parse(response.data.JsonData);
    const WorkTimeS = (0, serviceFunctions_1.getStringAfterCharacter)(data.WorkTimeS, "T");
    const WorkTimeE = (0, serviceFunctions_1.getStringAfterCharacter)(data.WorkTimeE, "T");
    return { WorkTimeS, WorkTimeE };
});
exports.getWorkingHours = getWorkingHours;
const getServicesByBranch = (ActiveBranchId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/ClientServices/GetClientServices", {
        params: {
            ActiveBranchId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result;
});
exports.getServicesByBranch = getServicesByBranch;
const getRecordInfo = (ActiveBranchId, recordId) => __awaiter(void 0, void 0, void 0, function* () {
    const record = 109275;
    const response = yield axios_1.crm.get("/api/Records/GetRecordById", {
        params: {
            ActiveBranchId,
            recordId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    console.log(result);
    return result;
});
exports.getRecordInfo = getRecordInfo;
const getEmployees = (ActiveBranchId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/Users/GetEmployeesList", {
        params: {
            ActiveBranchId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    console.log(result);
    return result;
});
exports.getEmployees = getEmployees;
const getBranchInfo = (branchId, ActiveBranchId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/Branches/GetBranch", {
        params: {
            branchId,
            ActiveBranchId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result;
});
exports.getBranchInfo = getBranchInfo;
const getClientRecords = (ActiveBranchId, clientId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/Records/GetClientRecords", {
        params: {
            ActiveBranchId,
            clientId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result;
});
exports.getClientRecords = getClientRecords;
const getEmployeesByService = (branchId, date, ActiveBranchId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.post("/api/Records/GetEmployeesByServices", [...id], {
        params: {
            ActiveBranchId,
            branchId,
            date,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result.filter((employee) => employee.IsWorking);
});
exports.getEmployeesByService = getEmployeesByService;
const createRecord = (body, ActiveBranchId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.post("/api/Records/UpdateRecord", body, {
        params: {
            ActiveBranchId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    if (response.data.Success) {
        console.log("Record created successfully");
        return "Запись создана";
    }
    else {
        console.log(response.data.Error);
        return response.data.Error;
    }
});
exports.createRecord = createRecord;
const getClientInfo = (clientId, ActiveBranchId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/Client/GetClientById", {
        params: {
            clientId,
            ActiveBranchId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result;
});
exports.getClientInfo = getClientInfo;
const getServiceInfo = (serviceId, ActiveBranchId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/ClientServices/GetClientServiceById", {
        params: {
            serviceId,
            ActiveBranchId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result;
});
exports.getServiceInfo = getServiceInfo;
const getEmployeesSchedule = (branchId, date, ActiveBranchId, employeeIds) => __awaiter(void 0, void 0, void 0, function* () {
    const dateS = (0, moment_1.default)(date).format("YYYY-MM-DD");
    const dateE = (0, moment_1.default)(dateS).add(1, "days").format("YYYY-MM-DD");
    const response = yield axios_1.crm.post("/api/WorkSchedule/GetEmployeesWorkSchedulesByUserIds", employeeIds, {
        params: {
            branchId,
            dateS,
            dateE,
            ActiveBranchId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result;
});
exports.getEmployeesSchedule = getEmployeesSchedule;
const getEmployeeRecords = (ActiveBranchId, employeeId, dateS, dateE) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/Records/GetEmployeeRecords", {
        params: {
            ActiveBranchId,
            dateS,
            dateE,
            employeeId,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result;
});
exports.getEmployeeRecords = getEmployeeRecords;
const getEmployeeRecordsTip = (employeeId, ActiveBranchId, date) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.crm.get("/api/Records/GetEmployeeRecordsTip", {
        params: {
            employeeId,
            ActiveBranchId,
            date,
        },
    });
    const result = JSON.parse(response.data.JsonData);
    return result;
});
exports.getEmployeeRecordsTip = getEmployeeRecordsTip;
