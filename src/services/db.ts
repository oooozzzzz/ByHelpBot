import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createThread = async (client: {
	clientId: number;
	branchId?: number;
	activeBranchId?: number;
	leadId?: number;
}) => {
	try {
		await prisma.thread.create({ data: client });
	} catch (error) {
		await prisma.thread.update({
			where: { clientId: client.clientId },
			data: client,
		});
	}
};

export const getThread = async (clientId: number) => {
	try {
		return await prisma.thread.findUnique({ where: { clientId } });
	} catch (error) {
		console.log(error);
	}
};

export const createOrganization = async (
	id: number,
	branchIds: number[],
	userId: number,
) => {
	const branchIdsString = JSON.stringify(branchIds);
	try {
		await prisma.organization.create({
			data: { id, branchIds: branchIdsString, userId },
		});
	} catch (error) {
		await prisma.organization.update({
			where: { id },
			data: { branchIds: branchIdsString },
		});
	}
};

export const getOrganization = async (id: number) => {
	try {
		const organization = await prisma.organization.findUnique({
			where: { id },
		});
		return {
			branchIds: JSON.parse(organization!.branchIds),
		};
	} catch (error) {
		console.log(error);
	}
};

export const addConnectedUser = async (id: number, organizationId: number) => {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { clientsConnected: true },
	});
	const clientsConnected = organization!.clientsConnected;
	const clientsConnectedIds = clientsConnected.map((client) => client.id);
	if (!clientsConnectedIds.includes(id)) {
		await prisma.organization.update({
			where: { id: organizationId },
			data: { clientsConnected: { create: { id } } },
		});
		console.log(`New client with id ${id} added `);
	} else return;
};

export const isInOrganization = async (id: number, organizationId: number) => {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { clientsConnected: true },
	});
	const clientsConnected = organization!.clientsConnected;
	const clientsConnectedIds = clientsConnected.map((client) => client.id);
	return clientsConnectedIds.includes(id);
};
