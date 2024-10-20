// queueService.ts
import { PrismaClient, OperationStatus } from '@prisma/client';
import { differenceInMinutes } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Получает список текущих активных талонов для каждого сотрудника в указанном отделении.
 * @param departmentId - ID отделения
 * @returns Объект, где ключ - ID сотрудника, а значение - информация о талоне
 */
export async function getQueueForMonitor(departmentId: string) {
    const now = new Date();

    // 1. Получаем всех сотрудников на дежурстве в указанном отделении
    const employees = await prisma.employee.findMany({
        where: {
            departmentId: departmentId,
            onDuty: true,
        },
        include: {
            allowedOperationGroups: {
                include: {
                    operations: true,
                },
            },
        },
    });

    if (employees.length === 0) {
        return {};
    }

    // 2. Создаём карту сотрудников для удобства
    const employeeMap: { [key: string]: { name: string, currentTicket: string | null, queue: string[] } } = {};
    employees.forEach(employee => {
        employeeMap[employee.id] = {
            name: employee.name,
            currentTicket: null,
            queue: [],
        };
    });

    // 3. Получаем все билеты, назначенные на этих сотрудников, которые не завершены и соответствуют условиям
    const activeTicketOperations = await prisma.ticketOperation.findMany({
        where: {
            employeeId: { in: employees.map(emp => emp.id) },
            operationStatus: {
                in: [OperationStatus.CALL, OperationStatus.COMPLETE, OperationStatus.CANCEL],
            },
            ticket: {
                departmentId: departmentId,
                OR: [
                    { appointedTime: { equals: null } },
                    {
                        appointedTime: {
                            gte: new Date(now.setHours(0, 0, 0, 0)),
                            lt: new Date(now.setHours(23, 59, 59, 999)),
                        },
                    },
                    {
                        createdAt: {
                            gte: new Date(now.setHours(0, 0, 0, 0)),
                            lt: new Date(now.setHours(23, 59, 59, 999)),
                        },
                    }
                ],
            },
        },
        include: {
            ticket: true,
        },
    });

    // 4. Получаем все активные билеты (не завершенные) для распределения
    const tickets = await prisma.ticket.findMany({
        where: {
            departmentId: departmentId,
            OR: [
                { appointedTime: { equals: null } },
                {
                    appointedTime: {
                        gte: new Date(now.setHours(0, 0, 0, 0)),
                        lt: new Date(now.setHours(23, 59, 59, 999)),
                    },
                },
                {
                    createdAt: {
                        gte: new Date(now.setHours(0, 0, 0, 0)),
                        lt: new Date(now.setHours(23, 59, 59, 999)),
                    },
                }
            ],
            NOT: {
                ticketOperation: {
                    is: {
                        operationStatus: {
                            in: [OperationStatus.COMPLETE, OperationStatus.CANCEL],
                        },
                    },
                },
            },
        },
        include: {
            ticketOperation: true,
        },
        orderBy: [
            { appointedTime: 'asc' },
            { createdAt: 'asc' },
        ],
    });

    // 5. Назначение билетов операторам
    for (const ticket of tickets) {
        const operationId = ticket.operationId;

        // Ищем сотрудников, которые могут обработать эту операцию и не заняты текущим вызовом
        const suitableEmployees = employees.filter(employee =>
            employee.allowedOperationGroups.some(group =>
                group.operations.some(op => op.id === operationId)
            )
        );

        if (suitableEmployees.length === 0) {
            // Нет доступных сотрудников для этой операции
            continue;
        }

        // Назначаем билет первому доступному сотруднику
        const employee = suitableEmployees[0];
        const empData = employeeMap[employee.id];

        if (ticket.ticketOperation && ticket.ticketOperation.operationStatus === OperationStatus.CALL) {
            // Если билет уже вызывается этим сотрудником
            if (empData.currentTicket === null) {
                empData.currentTicket = ticket.id;
            }
        } else {
            // Если билет еще не назначен, назначаем его в очередь
            empData.queue.push(ticket.id);
        }
    }

    return employeeMap;
}
