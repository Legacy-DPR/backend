// prisma/seed.ts
import { PrismaClient, OperationStatus } from '@prisma/client';

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
            await tx.operationGroup.createMany({
                data: [
                    { id: 'group1', name: 'Почтовые отправления', description: 'Группа услуг по почтовым отправлениям' },
                    { id: 'group2', name: 'Почтовые переводы', description: 'Группа услуг по почтовым переводам' },
                    { id: 'group3', name: 'Платежи', description: 'Группа услуг по платежам' },
                    { id: 'group4', name: 'Стартовые пакеты мобильных операторов', description: 'Группа услуг по мобильным операторам' },
                    { id: 'group5', name: 'Товары народного потребления', description: 'Прочие товары' },
                    { id: 'group6', name: 'Подписка на газеты и журналы', description: 'Подписка на периодические издания' },
                    { id: 'group7', name: 'Написать заявление/обращение', description: 'Услуга по подаче заявления' },
                    { id: 'group8', name: 'Выплата пенсий и пособий', description: 'Выплата пенсий и социальных пособий' },
                ],
                skipDuplicates: true,
            });
            console.log('OperationGroups seeded.');

            // 3. Сиды для Operation
            await tx.operation.createMany({
                data: [
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
                    { id: 'op15', name: 'Купить бытовую технику', description: 'Покупка бытовой техники', operationGroupId: 'group5' },
                    { id: 'op16', name: 'Купить продукты питания', description: 'Покупка продуктов питания', operationGroupId: 'group5' },
                    { id: 'op17', name: 'Подписка на журнал', description: 'Оформление подписки на журнал', operationGroupId: 'group6' },
                    { id: 'op18', name: 'Написать обращение', description: 'Подача заявления или обращения', operationGroupId: 'group7' },
                    { id: 'op19', name: 'Получить пенсию', description: 'Получение пенсии', operationGroupId: 'group8' },
                    { id: 'op20', name: 'Выплата пособия', description: 'Получение пособия', operationGroupId: 'group8' },
                ],
                skipDuplicates: true,
            });
            console.log('Operations seeded.');

            // 4. Сиды для Department
            const departmentExists = await tx.department.findUnique({
                where: { id: 'dep1' },
            });

            let departmentId = 'dep1';

            if (!departmentExists) {
                const departmentResult = await tx.department.create({
                    data: {
                        id: 'dep1',
                        address: '123 Main St',
                        availableOperationGroups: {
                            connect: [
                                { id: 'group1' },
                                { id: 'group2' },
                                { id: 'group3' },
                                { id: 'group4' },
                                { id: 'group5' },
                                { id: 'group6' },
                                { id: 'group7' },
                                { id: 'group8' },
                            ],
                        },
                    },
                });
                console.log(`Upserted Department: ${departmentResult.id}`);
                departmentId = departmentResult.id;
            } else {
                console.log('Department already exists, skipping creation');
            }

            // 5. Сиды для User
            const users = [
                { telegramId: 'telegram_12345' },
                { telegramId: 'telegram_67890' },
                { telegramId: 'telegram_11223' },
                { telegramId: 'telegram_44556' },
                { telegramId: 'telegram_77889' },
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
                { telegramId: 'emp_1003', name: 'Виктория Кузнецова', onDuty: true, admin: false, allowedGroups: ['group5'] },
                { telegramId: 'emp_1004', name: 'Григорий Петров', onDuty: true, admin: false, allowedGroups: ['group6', 'group7'] },
                { telegramId: 'emp_1005', name: 'Дмитрий Соколов', onDuty: true, admin: false, allowedGroups: ['group8'] },
            ];

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
                console.log(`Upserted Employee: ${employee.name}, onDuty: ${employee.onDuty}, admin: ${employee.admin}`);
            }

            // 7. Сиды для Ticket
            const allUsers = await tx.user.findMany();
            const allOperations = await tx.operation.findMany();

            if (allUsers.length === 0 || allOperations.length === 0) {
                throw new Error('Необходимо иметь пользователей и операции для создания билетов');
            }

            const tickets = [
                {
                    appointedTime: new Date('2024-05-01T10:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[0].id,
                    qrCode: 'QR-TICKET001',
                    operationId: 'op1',
                },
                {
                    appointedTime: new Date('2024-05-01T10:05:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[1].id,
                    qrCode: 'QR-TICKET002',
                    operationId: 'op3',
                },
                {
                    appointedTime: null,
                    departmentId: departmentId,
                    userId: allUsers[2].id,
                    qrCode: 'QR-TICKET003',
                    operationId: 'op5',
                },
                {
                    appointedTime: new Date('2024-05-01T09:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[0].id,
                    qrCode: 'QR-TICKET004',
                    operationId: 'op2',
                },
                {
                    appointedTime: new Date('2024-05-01T14:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[1].id,
                    qrCode: 'QR-TICKET005',
                    operationId: 'op6',
                },
                {
                    appointedTime: null,
                    departmentId: departmentId,
                    userId: allUsers[3].id,
                    qrCode: 'QR-TICKET006',
                    operationId: 'op7',
                },
                {
                    appointedTime: new Date('2024-05-01T11:30:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[4].id,
                    qrCode: 'QR-TICKET007',
                    operationId: 'op8',
                },
                {
                    appointedTime: new Date('2024-05-01T12:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[0].id,
                    qrCode: 'QR-TICKET008',
                    operationId: 'op9',
                },
                {
                    appointedTime: null,
                    departmentId: departmentId,
                    userId: allUsers[2].id,
                    qrCode: 'QR-TICKET009',
                    operationId: 'op10',
                },
                {
                    appointedTime: new Date('2024-05-01T13:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[1].id,
                    qrCode: 'QR-TICKET010',
                    operationId: 'op11',
                },
                {
                    appointedTime: new Date('2024-05-01T15:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[3].id,
                    qrCode: 'QR-TICKET011',
                    operationId: 'op12',
                },
                {
                    appointedTime: null,
                    departmentId: departmentId,
                    userId: allUsers[4].id,
                    qrCode: 'QR-TICKET012',
                    operationId: 'op13',
                },
                {
                    appointedTime: new Date('2024-05-01T16:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[0].id,
                    qrCode: 'QR-TICKET013',
                    operationId: 'op14',
                },
                {
                    appointedTime: null,
                    departmentId: departmentId,
                    userId: allUsers[1].id,
                    qrCode: 'QR-TICKET014',
                    operationId: 'op15',
                },
                {
                    appointedTime: new Date('2024-05-01T17:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[2].id,
                    qrCode: 'QR-TICKET015',
                    operationId: 'op16',
                },
                {
                    appointedTime: new Date('2024-05-01T18:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[3].id,
                    qrCode: 'QR-TICKET016',
                    operationId: 'op17',
                },
                {
                    appointedTime: null,
                    departmentId: departmentId,
                    userId: allUsers[4].id,
                    qrCode: 'QR-TICKET017',
                    operationId: 'op18',
                },
                {
                    appointedTime: new Date('2024-05-01T19:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[0].id,
                    qrCode: 'QR-TICKET018',
                    operationId: 'op19',
                },
                {
                    appointedTime: null,
                    departmentId: departmentId,
                    userId: allUsers[1].id,
                    qrCode: 'QR-TICKET019',
                    operationId: 'op20',
                },
                {
                    appointedTime: new Date('2024-05-01T20:00:00Z'),
                    departmentId: departmentId,
                    userId: allUsers[2].id,
                    qrCode: 'QR-TICKET020',
                    operationId: 'op1',
                },
            ];

            for (const ticketData of tickets) {
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
                console.log(`Upserted Ticket: ${ticket.qrCode}`);

                // Назначение билетов сотрудникам
                const employee = await tx.employee.findFirst({
                    where: {
                        departmentId: departmentId,
                        onDuty: true,
                        allowedOperationGroups: {
                            some: {
                                operations: {
                                    some: {
                                        id: ticketData.operationId,
                                    },
                                },
                            },
                        },
                    },
                });

                if (employee) {
                    await tx.ticketOperation.upsert({
                        where: { ticketId: ticket.id },
                        update: {},
                        create: {
                            ticket: {
                                connect: { id: ticket.id },
                            },
                            employee: {
                                connect: { id: employee.id },
                            },
                            operationStatus: OperationStatus.CALL,
                            notes: '',
                        },
                    });
                    console.log(`Assigned TicketOperation for Ticket: ${ticket.qrCode} to Employee: ${employee.name}`);
                } else {
                    console.warn(`Нет доступных сотрудников для билета ${ticket.qrCode}`);
                }
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
