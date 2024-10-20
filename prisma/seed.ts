// prisma/seed.ts
import { PrismaClient, OperationStatus } from '@prisma/client';
import path from 'path';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function seed() {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Сиды для ServiceClient
            const serviceClients = [
                { name: 'Telegram Bot User', secretToken: 'telegram-bot-user-secret-token' },
                { name: 'Telegram Bot Operator', secretToken: 'telegram-bot-operator-secret-token' },
                { name: 'Test Postman', secretToken: 'test-postman-secret-token' },
                { name: 'Monitor Frontend', secretToken: 'monitor-frontend-secret-token' },
                { name: 'Terminal Frontend', secretToken: 'terminal-frontend-secret-token' },
            ];

            for (const client of serviceClients) {
                const serviceClient = await tx.serviceClient.upsert({
                    where: { secretToken: client.secretToken },
                    update: { name: client.name },
                    create: { secretToken: client.secretToken, name: client.name },
                });
                console.log(`Upserted ServiceClient: ${serviceClient.name}`);
            }	

            // 2. Сиды для OperationGroup
            const operationGroups = [
                { id: 'group1', name: 'Почтовые отправления', description: 'Группа услуг по почтовым отправлениям' },
                { id: 'group2', name: 'Почтовые переводы', description: 'Группа услуг по почтовым переводам' },
                { id: 'group3', name: 'Платежи', description: 'Группа услуг по платежам' },
                { id: 'group4', name: 'Стартовые пакеты мобильных операторов', description: 'Группа услуг по мобильным операторам' },
                { id: 'group_other', name: 'Разное', description: 'Различные прочие услуги' }
            ];

            for (const group of operationGroups) {
                await tx.operationGroup.upsert({
                    where: { id: group.id },
                    update: {
                        name: group.name,
                        description: group.description,
                    },
                    create: group,
                });
            }
            console.log('OperationGroups upserted.');

            // 3. Сиды для Operation
            const operations = [
                { id: 'op1', name: 'Отправить письменную корреспонденцию', description: 'Услуга по отправке письменной корреспонденции', operationGroupId: 'group1' },
                { id: 'op2', name: 'Отправить крупногабаритные посылки', description: 'Услуга по отправке крупногабаритных посылок', operationGroupId: 'group1' },
                { id: 'op3', name: 'Отправить мелкие посылки', description: 'Услуга по отправке мелких посылок', operationGroupId: 'group1' },
                { id: 'op4', name: 'Получить', description: 'Услуга по получению отправлений', operationGroupId: 'group1' },
                { id: 'op5', name: 'Почтовая тара', description: 'Услуга по работе с почтовой тарой', operationGroupId: 'group1' },
                { id: 'op6', name: 'Отправить почтовый перевод', description: 'Услуга по отправке почтовых переводов', operationGroupId: 'group2' },
                { id: 'op7', name: 'Получить почтовый перевод', description: 'Услуга по получению почтовых переводов', operationGroupId: 'group2' },
                { id: 'op8', name: 'Коммунальные услуги', description: 'Услуга по оплате коммунальных услуг', operationGroupId: 'group3' },
                { id: 'op9', name: 'Интернет', description: 'Услуга по оплате интернета', operationGroupId: 'group3' },
                { id: 'op10', name: 'Телефония', description: 'Услуга по оплате телефонии', operationGroupId: 'group3' },
                { id: 'op11', name: 'Другое', description: 'Оплата других услуг', operationGroupId: 'group3' },
                { id: 'op12', name: 'Купить стартовые пакеты', description: 'Покупка стартовых пакетов мобильных операторов', operationGroupId: 'group4' },
                { id: 'op13', name: 'Восстановить стартовые пакеты', description: 'Восстановление стартовых пакетов', operationGroupId: 'group4' },
                { id: 'op14', name: 'Скретч-карты', description: 'Покупка скретч-карт', operationGroupId: 'group4' },
                { id: 'op15', name: 'Купить бытовую технику', description: 'Покупка бытовой техники', operationGroupId: 'group_other' },
                { id: 'op16', name: 'Купить продукты питания', description: 'Покупка продуктов питания', operationGroupId: 'group_other' },
                { id: 'op17', name: 'Подписка на журнал', description: 'Оформление подписки на журнал', operationGroupId: 'group_other' },
                { id: 'op18', name: 'Написать обращение', description: 'Подача заявления или обращения', operationGroupId: 'group_other' },
                { id: 'op19', name: 'Получить пенсию', description: 'Получение пенсии', operationGroupId: 'group_other' },
                { id: 'op20', name: 'Выплата пособия', description: 'Получение пособия', operationGroupId: 'group_other' },
            ];

            for (const operation of operations) {
                await tx.operation.upsert({
                    where: { id: operation.id },
                    update: {
                        name: operation.name,
                        description: operation.description,
                        operationGroupId: operation.operationGroupId,
                    },
                    create: operation,
                });
                console.log(`Upserted operation: ${operation.id}`);
            }
            console.log('Operations upserted.');

            // 4. Сиды для Department
            const departmentExists = await tx.department.findUnique({
                where: { id: 'dep1' },
            });

            let departmentId = 'dep1';

            if (!departmentExists) {
                const departmentResult = await tx.department.create({
                    data: {
                        id: 'dep1',
                        address: 'Донецк, ул. Артема 72',
                        availableOperationGroups: {
                            connect: [
                                { id: 'group1' },
                                { id: 'group2' },
                                { id: 'group3' },
                                { id: 'group4' },
                                { id: 'group_other' },
                            ],
                        },
                    },
                });
                console.log(`Created Department: ${departmentResult.id}`);
                departmentId = departmentResult.id;
            } else {
                console.log('Department already exists, updating...');
                await tx.department.update({
                    where: { id: 'dep1' },
                    data: {
                        address: '123 Main St',
                        availableOperationGroups: {
                            set: [],
                            connect: [
                                { id: 'group1' },
                                { id: 'group2' },
                                { id: 'group3' },
                                { id: 'group4' },
                                { id: 'group_other' },
                            ],
                        },
                    },
                });
            }
            console.log('Department upserted.');

            // 5. Сиды для User (включая "Guest")
            const users = [
                { telegramId: 'telegram_12345' },
                { telegramId: 'telegram_67890' },
                { telegramId: 'telegram_11223' },
                { telegramId: 'telegram_44556' },
                { telegramId: 'telegram_77889' },
                { telegramId: 'Guest' }, 
            ];

            for (const userData of users) {
                const user = await tx.user.upsert({
                    where: { telegramId: userData.telegramId },
                    update: {},
                    create: {
                        telegramId: userData.telegramId,
                    },
                });
                console.log(`Upserted User with telegramId: ${user.telegramId}`);
            }

            // 6. Сиды для Employee
            const employees = [
                { telegramId: 'emp_1001', name: 'Анна Смирнова', onDuty: true, admin: false, allowedGroups: ['group1', 'group2'] },
                { telegramId: 'emp_1002', name: 'Борис Иванов', onDuty: true, admin: false, allowedGroups: ['group3', 'group4'] },
                { telegramId: 'emp_1003', name: 'Виктория Кузнецова', onDuty: true, admin: false, allowedGroups: ['group_other'] },
                { telegramId: 'emp_1004', name: 'Григорий Петров', onDuty: true, admin: false, allowedGroups: ['group_other'] },
                { telegramId: 'emp_1005', name: 'Дмитрий Соколов', onDuty: true, admin: false, allowedGroups: ['group_other'] },
            ];

            const employeeIds: string[] = [];

            for (const employeeData of employees) {
                const employee = await tx.employee.upsert({
                    where: { telegramId: employeeData.telegramId },
                    update: {
                        name: employeeData.name,
                        department: {
                            connect: { id: departmentId },
                        },
                        onDuty: employeeData.onDuty,
                        admin: employeeData.admin,
                        allowedOperationGroups: {
                            set: employeeData.allowedGroups.map(groupId => ({ id: groupId })),
                        },
                    },
                    create: {
                        telegramId: employeeData.telegramId,
                        name: employeeData.name,
                        department: {
                            connect: { id: departmentId },
                        },
                        onDuty: employeeData.onDuty,
                        admin: employeeData.admin,
                        allowedOperationGroups: {
                            connect: employeeData.allowedGroups.map(groupId => ({ id: groupId })),
                        },
                    },
                });
                employeeIds.push(employee.id);
                console.log(`Upserted Employee: ${employee.name}, onDuty: ${employee.onDuty}, admin: ${employee.admin}`);
            }

            // 7. Сиды для Ticket
            const allUsers = await tx.user.findMany();
            const allOperations = await tx.operation.findMany();

            if (allUsers.length === 0 || allOperations.length === 0) {
                throw new Error('Необходимо иметь пользователей и операции для создания билетов');
            }

            // Функция для генерации назначенного времени с 15-минутным интервалом в диапазоне 09:00-16:00
            function generateAppointedTime(startHour: number, startMinute: number, intervalMinutes: number, index: number): Date {
                const date = new Date('2024-05-01T00:00:00Z'); // Базовая дата
                const totalMinutes = startMinute + intervalMinutes * index;
                const hours = Math.floor(totalMinutes / 60) + startHour;
                const minutes = totalMinutes % 60;
                date.setUTCHours(hours, minutes, 0, 0);
                return date;
            }

            // Общее количество билетов
            const numberOfTickets = 20;

            // Общее количество 15-минутных интервалов с 09:00 до 16:00
            const startHour = 9;
            const startMinute = 0;
            const intervalMinutes = 15;
            const maxIntervals = Math.floor((16 - 9) * 60 / intervalMinutes); // 28

            if (numberOfTickets > maxIntervals) {
                throw new Error(`Невозможно создать ${numberOfTickets} билетов с интервалом ${intervalMinutes} минут в диапазоне с ${startHour}:00 до 16:00`);
            }

            // Генерация билетов с назначенным временем
            for (let i = 0; i < numberOfTickets; i++) {
                const appointedTime = generateAppointedTime(startHour, startMinute, intervalMinutes, i); // С 09:00 с интервалом 15 минут

                const ticketData = {
                    appointedTime: appointedTime,
                    departmentId: departmentId,
                    userId: allUsers[i % allUsers.length].id, // Распределение пользователей циклически
                    qrCode: `/qrcodes/qr-${uuidv4()}.png`, // Относительный путь
                    operationId: allOperations[i % allOperations.length].id, // Распределение операций циклически
                };

                // Создание билета
                const ticket = await tx.ticket.upsert({
                    where: { qrCode: ticketData.qrCode },
                    update: {},
                    create: {
                        appointedTime: ticketData.appointedTime,
                        department: {
                            connect: { id: ticketData.departmentId },
                        },
                        user: {
                            connect: { id: ticketData.userId },
                        },
                        qrCode: ticketData.qrCode,
                        operation: {
                            connect: { id: ticketData.operationId },
                        },
                    },
                });
                console.log(`Upserted Ticket: ${ticket.qrCode} at ${ticket.appointedTime!.toISOString()}`);

                // Назначение билетов сотрудникам
                const operationGroupId = allOperations.find(op => op.id === ticketData.operationId)?.operationGroupId;
                if (!operationGroupId) {
                    console.warn(`OperationGroupId не найден для операции ${ticketData.operationId}`);
                    continue;
                }

                // Логика распределения билетов:
                // 1. Найти всех сотрудников, которые могут обработать эту операцию и находятся на дежурстве.
                // 2. Распределить билеты равномерно между ними.

                const suitableEmployees = await tx.employee.findMany({
                    where: {
                        departmentId: departmentId,
                        onDuty: true,
                        allowedOperationGroups: {
                            some: {
                                id: operationGroupId,
                            },
                        },
                    },
                });

                if (suitableEmployees.length === 0) {
                    console.warn(`Нет доступных сотрудников для билета ${ticket.qrCode}`);
                    continue;
                }

                // Выбор сотрудника с наименьшим количеством назначенных билетов
                let selectedEmployee = suitableEmployees[0];
                let minTickets = await tx.ticketOperation.count({
                    where: {
                        employeeId: selectedEmployee.id,
                        operationStatus: {
                            in: [OperationStatus.CALL, OperationStatus.COMPLETE],
                        },
                    },
                });

                for (const employee of suitableEmployees) {
                    const ticketCount = await tx.ticketOperation.count({
                        where: {
                            employeeId: employee.id,
                            operationStatus: {
                                in: [OperationStatus.CALL, OperationStatus.COMPLETE],
                            },
                        },
                    });

                    if (ticketCount < minTickets) {
                        selectedEmployee = employee;
                        minTickets = ticketCount;
                    }
                }

                // Назначение билета выбранному сотруднику
                await tx.ticketOperation.upsert({
                    where: { ticketId: ticket.id },
                    update: {},
                    create: {
                        ticket: {
                            connect: { id: ticket.id },
                        },
                        employee: {
                            connect: { id: selectedEmployee.id },
                        },
                        operationStatus: OperationStatus.CALL,
                        notes: '',
                    },
                });
                console.log(`Assigned TicketOperation for Ticket: ${ticket.qrCode} to Employee: ${selectedEmployee.name}`);
            }

            // Дополнительное создание билетов, не назначенных сотрудникам, для заполнения очереди
            const additionalTickets = 5; // Количество билетов для очереди

            for (let i = 0; i < additionalTickets; i++) {
                const appointedTime = generateAppointedTime(startHour, startMinute, intervalMinutes, numberOfTickets + i);

                const ticketData = {
                    appointedTime: appointedTime,
                    departmentId: departmentId,
                    userId: allUsers[i % allUsers.length].id, // Распределение пользователей циклически
                    qrCode: `/qrcodes/qr-${uuidv4()}.png`, // Относительный путь
                    operationId: allOperations[(i + numberOfTickets) % allOperations.length].id, // Распределение операций циклически
                };

                // Создание билета без назначения сотруднику (для заполнения очереди)
                const ticket = await tx.ticket.upsert({
                    where: { qrCode: ticketData.qrCode },
                    update: {},
                    create: {
                        appointedTime: ticketData.appointedTime,
                        department: {
                            connect: { id: ticketData.departmentId },
                        },
                        user: {
                            connect: { id: ticketData.userId },
                        },
                        qrCode: ticketData.qrCode,
                        operation: {
                            connect: { id: ticketData.operationId },
                        },
                    },
                });
                console.log(`Upserted Queue Ticket: ${ticket.qrCode} at ${ticket.appointedTime!.toISOString()}`);
                // Эти билеты не назначаются сотрудникам, они попадут в очередь
            }
        });

        console.log('Seeding completed.');
    } catch (e) {
        console.error('Seeding error:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
