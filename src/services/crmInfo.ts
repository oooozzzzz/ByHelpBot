import moment from "moment";
import { crm } from "../axios/axios";
import {
	AILearnInfo,
	AIUser,
	Branch,
	client,
	createRecordBody,
	employee,
	employeeByService,
	employeeRecordsResponse,
	employeesScheduleResponse,
	Lead,
	record,
	SearchLeadsFilter,
	SearchLeadsResponse,
	SendMessageToClientBody,
	service,
	serviceTip,
} from "../types";
import { getStringAfterCharacter } from "./serviceFunctions";

export const getWorkingHours = async (
	branchId: number,
	date: string,
	ActiveBranchId: number,
): Promise<{ WorkTimeS: string; WorkTimeE: string }> => {
	const response = await crm.get("/api/Branches/GetBranchWorkTimesOnDate", {
		params: {
			branchId,
			date,
			ActiveBranchId,
		},
	});
	const data = JSON.parse(response.data.JsonData);
	const WorkTimeS = getStringAfterCharacter(data.WorkTimeS, "T");
	const WorkTimeE = getStringAfterCharacter(data.WorkTimeE, "T");

	return { WorkTimeS, WorkTimeE };
};

export const getServicesByBranch = async (
	ActiveBranchId: number,
): Promise<service[]> => {
	const response = await crm.get("/api/ClientServices/GetClientServices", {
		params: {
			ActiveBranchId,
		},
	});
	const result: service[] = JSON.parse(response.data.JsonData);
	return result;
};

export const getRecordInfo = async (
	ActiveBranchId: number,
	recordId: number,
) => {
	const record = 109275;
	const response = await crm.get("/api/Records/GetRecordById", {
		params: {
			ActiveBranchId,
			recordId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	console.log(result);
	return result;
};

export const getEmployees = async (
	ActiveBranchId: number,
): Promise<employee[]> => {
	const response = await crm.get("/api/Users/GetEmployeesList", {
		params: {
			ActiveBranchId,
		},
	});
	const result: employee[] = JSON.parse(response.data.JsonData);
	console.log(result);
	return result;
};

export const getBranchInfo = async (
	branchId: number,
	ActiveBranchId: number,
) => {
	const response = await crm.get("/api/Branches/GetBranch", {
		params: {
			branchId,
			ActiveBranchId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const getClientRecords = async (
	ActiveBranchId: number,
	clientId: number,
) => {
	const response = await crm.get("/api/Records/GetClientRecords", {
		params: {
			ActiveBranchId,
			clientId,
		},
	});
	const result: record[] = JSON.parse(response.data.JsonData);
	return result;
};

export const getEmployeesByService = async (
	branchId: number,
	date: string,
	ActiveBranchId: number,
	id: number[],
) => {
	const response = await crm.post(
		"/api/Records/GetEmployeesByServices",
		[...id],
		{
			params: {
				ActiveBranchId,
				branchId,
				date,
			},
		},
	);
	const result: employeeByService[] = JSON.parse(response.data.JsonData);
	return result.filter((employee) => employee.IsWorking);
};

export const createRecord = async (
	body: createRecordBody,
	ActiveBranchId: number,
) => {
	const response = await crm.post("/api/Records/UpdateRecord", body, {
		params: {
			ActiveBranchId,
		},
	});
	const result = JSON.parse(response.data.JsonData);

	if (response.data.Success) {
		console.log("Record created successfully");
		return "Запись создана";
	} else {
		console.log(response.data);
		return "Ошибка при создании записи";
	}
};

export const getClientInfo = async (
	clientId: number,
	ActiveBranchId: number,
): Promise<client> => {
	const response = await crm.get("/api/Client/GetClientById", {
		params: {
			clientId,
			ActiveBranchId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const getServiceInfo = async (
	serviceId: number,
	ActiveBranchId: number,
): Promise<service> => {
	const response = await crm.get("/api/ClientServices/GetClientServiceById", {
		params: {
			serviceId,
			ActiveBranchId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const getEmployeesSchedule = async (
	branchId: number,
	date: string,
	ActiveBranchId: number,
	employeeIds: number[],
): Promise<employeesScheduleResponse> => {
	const dateS = moment(date).format("YYYY-MM-DD");
	const dateE = moment(dateS).add(1, "days").format("YYYY-MM-DD");
	const response = await crm.post(
		"/api/WorkSchedule/GetEmployeesWorkSchedulesByUserIds",
		employeeIds,
		{
			params: {
				branchId,
				dateS,
				dateE,
				ActiveBranchId,
			},
		},
	);
	const result: employeesScheduleResponse = JSON.parse(response.data.JsonData);
	return result;
};

export const getEmployeeRecords = async (
	ActiveBranchId: number,
	employeeId: number,
	dateS: string,
	dateE: string,
): Promise<employeeRecordsResponse> => {
	const response = await crm.get("/api/Records/GetEmployeeRecords", {
		params: {
			ActiveBranchId,
			dateS,
			dateE,
			employeeId,
		},
	});
	const result: employeeRecordsResponse = JSON.parse(response.data.JsonData);
	return result;
};

export const getEmployeeRecordsTip = async (
	employeeId: number,
	ActiveBranchId: number,
	date: string,
): Promise<serviceTip[]> => {
	const response = await crm.get("/api/Records/GetEmployeeRecordsTip", {
		params: {
			employeeId,
			ActiveBranchId,
			date,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const updateRecord = async (
	ActiveBranchId: number,
	recordId: number,
	body: record,
) => {
	const response = await crm.post("/api/Records/UpdateRecord", body, {
		params: {
			ActiveBranchId,
			recordId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const getBranches = async (ActiveBranchId: number) => {
	const response = await crm.get("/api/Branches/GetBranches", {
		params: {
			ActiveBranchId,
			isActive: true,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const getBasicBranches = async (branchId: number) => {
	const info = await getBranches(1);
	const branches = info.Branches.map((branch: Branch) => ({
		id: branch.Id,
		legalEntity: branch.LegalEntity,
		name: branch.Name,
		address: branch.Address,
	}));
	return branches;
};

export const getClientsFilterData = async (ActiveBranchId: number) => {
	const response = await crm.post("/api/Users/GetClientsFilterData", null, {
		params: {
			ActiveBranchId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const searchLeads = async (
	ActiveBranchId: number,
	BranchIds?: number[],
	query: SearchLeadsFilter = {
		DateActiveE: moment().add(30, "years").format("YYYY-MM-DDT00:00:00"),
		DateActiveS: moment().subtract(10, "days").format("YYYY-MM-DDT23:59:59"),
		MaxItems: 10000,
		SearchTermIn: "clients",

		// UserIds: [422],
	},
): Promise<SearchLeadsResponse> => {
	const response = await crm.post(
		"/api/Leads/SearchLeads",
		{ ...query, BranchIds },
		{
			params: {
				ActiveBranchId,
				UserId: 370,
				Database: "Crm-000-001",
			},
		},
	);
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const getBasicLeads = async (
	ActiveBranchId: number,
	branchIds: number[],
): Promise<
	{
		userId: number;
		leadId: number;
		clientId: number;
		socialIntegrationType: string;
		socialIntegrationId: number;
		clientName: string;
		branchId: number;
		ClientPhone: string;
	}[]
> => {
	const response = await searchLeads(ActiveBranchId, branchIds);
	const leads = response?.Items.map((lead: Lead) => ({
		userId: lead.UserId,
		leadId: lead.Id,
		clientId: lead.ClientId,
		socialIntegrationType: lead.SocialIntegrationType,
		socialIntegrationId: lead.SocialIntegrationId,
		clientName: lead.ClientName,
		branchId: lead.BranchId,
		ClientPhone: lead.ClientPhone,
	}));
	return leads;
};

export const sendMessageToClient = async (
	ActiveBranchId: number,
	requestBody: SendMessageToClientBody,
) => {
	const response = await crm.post(
		"/api/SocialIntegrations/SendMessageToClient",
		requestBody,
		{
			params: {
				ActiveBranchId,
			},
		},
	);
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const assignLeadsToUser = async (
	ActiveBranchId: number,
	leadsIds: number[],
	forUserId: number,
) => {
	const response = await crm.post("/api/Leads/AssignLeadsToUser", leadsIds, {
		params: {
			forUserId,
			ActiveBranchId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const removeResponsibility = async (
	activeBranchId: number,
	leadId: number,
) => {
	try {
		const result = await assignLeadsToUser(activeBranchId, [leadId], 0);
		return result;
	} catch (error) {}
};

export const getInfoForAI = async (
	organizationId: number,
	ActiveBranchId: number,
): Promise<AILearnInfo[]> => {
	const response = await crm.get("/api/Ai/GetTrainingContent", {
		params: {
			organizationId,
			ActiveBranchId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const getAIUser = async (ActiveBranchId: number): Promise<AIUser> => {
	const response = await crm.get("/api/Ai/GetAiUser", {
		params: {
			ActiveBranchId,
		},
	});
	const result = JSON.parse(response.data.JsonData);
	return result;
};

export const searchCurrentLeads = async (
	ActiveBranchId: number,
	branchId: number,
	clientId: number,
) => {
	const leads = await searchLeads(ActiveBranchId, [branchId], {
		DateActiveE: moment().format("YYYY-MM-DDT00:00:00"),
		DateActiveS: moment().subtract(3, "days").format("YYYY-MM-DDT23:59:59"),
		MaxItems: 100,
		SearchTermIn: "clients",
	});
	const currentLead = leads.Items.find((lead) => lead.ClientId === clientId);
	return currentLead;
};
