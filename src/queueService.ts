// queueService.ts
import { PrismaClient, OperationStatus } from '@prisma/client';
import { addMinutes, isToday, differenceInMinutes } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Получает список текущих активных талонов для каждого сотрудника в указанном отделении.
 * @param departmentId - ID отделения
 * @returns Объект, где ключ - ID сотрудника, а значение - массив активных билетов
 */
export async function getActiveTickets(departmentId: string) {
    const now = new Date();

    // 1. Получаем список всех талонов для указанного отделения, созданных сегодня или с назначенным временем сегодня
    const tickets = await prisma.ticket.findMany({
        where: {
            departmentId: departmentId,
            AND: [
                {
                    OR: [
                        {
                            appointedTime: {
                                equals: null,
                            },
                        },
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
                        },
                    ],
                },
            ],
        },
        include: {
            operation: true,
            ticketOperation: true,
        },
        orderBy: {
            appointedTime: 'asc',
        },
    });

    if (tickets.length === 0) {
        return {};
    }

    // 2. Определяем самый ранний талон с appointedTime, если такой есть
    const earliestAppointedTicket = tickets
        .filter(ticket => ticket.appointedTime)
        .sort((a, b) => a.appointedTime!.getTime() - b.appointedTime!.getTime())[0];

    // 3. Сортируем список талонов по дате создания
    tickets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // 4. Приоритизация талонов с назначенным временем
    if (earliestAppointedTicket) {
        const deltaMinutes = differenceInMinutes(earliestAppointedTicket.appointedTime!, now);
        if (deltaMinutes < 2) {
            // Перемещаем талон на первую позицию
            const index = tickets.findIndex(ticket => ticket.id === earliestAppointedTicket.id);
            if (index > 0) {
                tickets.splice(index, 1);
                tickets.unshift(earliestAppointedTicket);
            }
        } else if (deltaMinutes < 0) {
            // Назначенное время уже прошло, перемещаем талон на первую позицию
            const index = tickets.findIndex(ticket => ticket.id === earliestAppointedTicket.id);
            if (index > 0) {
                tickets.splice(index, 1);
                tickets.unshift(earliestAppointedTicket);
            }
        }
    }

    // 5. Получаем список сотрудников, которые находятся на дежурстве в указанном отделении
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

    // Создаем карту сотрудников для удобства
    const employeeMap: { [key: string]: any } = {};
    employees.forEach(employee => {
        employeeMap[employee.id] = {
            employee,
            activeTickets: [],
        };
    });

    // Получаем активные талоны (статус CALL) для каждого сотрудника
    const activeTicketOperations = await prisma.ticketOperation.findMany({
        where: {
            employeeId: { in: employees.map(emp => emp.id) },
            operationStatus: OperationStatus.CALL,
        },
    });

    // Помечаем сотрудников, которые уже обрабатывают талоны
    activeTicketOperations.forEach(ticketOp => {
        if (employeeMap[ticketOp.employeeId]) {
            employeeMap[ticketOp.employeeId].activeTickets.push(ticketOp.ticketId);
        }
    });

    // Фильтруем талоны, которые могут быть обработаны текущими сотрудниками
    const availableOperations = new Set<string>();
    employees.forEach(employee => {
        employee.allowedOperationGroups.forEach(group => {
            group.operations.forEach(op => {
                availableOperations.add(op.id);
            });
        });
    });

    const filteredTickets = tickets.filter(ticket => availableOperations.has(ticket.operationId));

    // Назначение талонов сотрудникам
    for (const ticket of filteredTickets) {
        // Ищем сотрудника, который может обработать данный талон и не занят
        const suitableEmployee = employees.find(employee => {
            const canHandle = employee.allowedOperationGroups.some(group =>
                group.operations.some(op => op.id === ticket.operationId)
            );
            const isAvailable = employeeMap[employee.id].activeTickets.length === 0;
            return canHandle && isAvailable;
        });

        if (suitableEmployee) {
            employeeMap[suitableEmployee.id].activeTickets.push(ticket.id);
        }
    }

    // Формируем результат
    const result: { [key: string]: string[] } = {};
    for (const [employeeId, data] of Object.entries(employeeMap)) {
        result[employeeId] = data.activeTickets;
    }

    return result;
}
