import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOperations() {
    await prisma.$transaction(async (prisma) => {
        const serviceClients = [
            { name: 'Telegram Bot User', secretToken: 'telegram-bot-user-secret-token' },
            { name: 'Telegram Bot Operator', secretToken: 'telegram-bot-operator-secret-token' },
            { name: 'Test Postman', secretToken: 'test-postman-secret-token' },
            { name: 'Monitor Frontend', secretToken: 'monitor-frontend-secret-token' },
            { name: 'Terminal Frontend', secretToken: 'terminal-frontend-secret-token' },
        ];

        for (const client of serviceClients) {
            const serviceClient = await prisma.serviceClient.upsert({
                where: { secretToken: client.secretToken },
                update: { name: client.name },
                create: { secretToken: client.secretToken, name: client.name },
            });
            console.log(`Upserted ServiceClient: ${serviceClient.name}`);
        }

        await prisma.operationGroup.createMany({
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

        await prisma.operation.createMany({
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
            ],
            skipDuplicates: true,
        });

        const departmentExists = await prisma.department.findUnique({
            where: { id: 'dep1' },
        });

        let departmentId = 'dep1';

        if (!departmentExists) {
            const departmentResult = await prisma.department.create({
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
            console.log({ departmentResult });
            departmentId = departmentResult.id;
        } else {
            console.log('Department already exists, skipping creation');
        }

        // Добавление пользователей с telegramId
        const users = [
            { telegramId: 'telegram_12345' },
            { telegramId: 'telegram_67890' },
            { telegramId: 'telegram_11223' },
        ];

        for (const userData of users) {
            const user = await prisma.user.upsert({
                where: { telegramId: userData.telegramId },
                update: {}, // Не обновляем существующую запись
                create: {
                    telegramId: userData.telegramId,
                },
            });
            console.log(`Upserted User with telegramId: ${user.telegramId}`);
        }

        const employees = [
            { telegramId: '993563525', name: 'Антон Чуприн', onDuty: true, admin: false },
            { telegramId: '1639063236', name: 'Антон Пересекин', onDuty: false, admin: true },
            { telegramId: 'emp_11223', name: 'Иван Иванов', onDuty: false, admin: false },
        ];

        for (const employeeData of employees) {
            const employee = await prisma.employee.upsert({
                where: { telegramId: employeeData.telegramId },
                update: {
                    name: employeeData.name, // Обновляем имя, если запись существует
                    department: {
                        connect: { id: departmentId },
                    },
                    onDuty: employeeData.onDuty,
                    admin: employeeData.admin,     
                },
                create: {
                    telegramId: employeeData.telegramId,
                    name: employeeData.name,
                    department: {
                        connect: { id: departmentId },
                    },
                    onDuty: employeeData.onDuty, 
                    admin: employeeData.admin,     
                },
            });
            console.log(`Upserted Employee: ${employee.name}, onDuty: ${employee.onDuty}, admin: ${employee.admin}`);
        }
    });
}

seedOperations()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
