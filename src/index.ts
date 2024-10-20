// index.ts
import { PrismaClient, OperationStatus } from '@prisma/client';
import express, { Request, Response } from 'express';
import { checkIfServiceAuthorized } from "@/middleware";
import { getActiveTickets, getQueueForMonitor } from './queueService'; // Импортируем обе функции
import path from 'path';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const prisma = new PrismaClient();

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для авторизации сервиса
app.use(checkIfServiceAuthorized);

// Разрешаем доступ к статическим файлам в папке public/qrcodes
app.use('/qrcodes', express.static(path.join(__dirname, 'public/qrcodes')));

/**
 * 1. Эндпоинт для создания нового пользователя по telegramId
 *    POST /users
 *    Тело запроса: { "telegramId": "telegram_12345" }
 */
app.post('/users', async (req: Request, res: Response) => {
    const { telegramId } = req.body;

    if (!telegramId) {
        return res.status(400).json({ error: 'telegramId обязателен' });
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { telegramId },
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'Пользователь с таким telegramId уже существует',
            });
        }

        const user = await prisma.user.create({
            data: {
                telegramId,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Ошибка при создании пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * 2. Эндпоинт для получения данных пользователя по telegramId
 *    GET /users/:telegramId
 *    Ответ: { "telegramId": "telegram_12345" }
 */
app.get('/users/:telegramId', async (req: Request, res: Response) => {
    const { telegramId } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { telegramId },
        });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь с таким telegramId не найден' });
        }

        res.json(user);
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * 3. Эндпоинт для получения списка всех отделений
 * GET /departments
 * Ответ: Массив объектов отделений
 */
app.get('/departments', async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        availableOperationGroups: true, 
        tickets: true,                  
      },
    });
    res.json(departments);
  } catch (error) {
    console.error('Ошибка при получении списка отделений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * 4. Эндпоинт для получения всех групп операций, выполняемых данным отделением
 *    GET /departments/:departmentId/operation-groups
 *    Ответ: Массив групп операций с их операциями
 */
app.get('/departments/:departmentId/operation-groups', async (req: Request, res: Response) => {
  const { departmentId } = req.params;

  try {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        availableOperationGroups: {
          include: {
            operations: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ error: 'Отдел не найден' });
    }

    const operationGroups = department.availableOperationGroups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      operations: group.operations.map(operation => ({
        id: operation.id,
        name: operation.name,
        description: operation.description,
        operationGroupId: operation.operationGroupId,
      })),
    }));

    res.json(operationGroups);
  } catch (error) {
    console.error('Ошибка при получении групп операций:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});


/**
 * 5. Эндпоинт для получения данных о работнике по telegramId
 *    GET /employees/:telegramId
 *    Ответ: { "telegramId": "telegram_12345", "name": "Иван Иванов" }
 */
app.get('/employees/:telegramId', async (req: Request, res: Response) => {
  const { telegramId } = req.params;

  try {
    const employee = await prisma.employee.findUnique({
      where: { telegramId },
      include: {
        allowedOperationGroups: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Работник с таким telegramId не найден' });
    }

    res.json({
      telegramId: employee.telegramId,
      name: employee.name,
      onDuty: employee.onDuty, // Добавлено поле onDuty
      admin: employee.admin,     // Добавлено поле admin
    });
  } catch (error) {
    console.error('Ошибка при получении данных работника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Новый Эндпоинт для изменения значения onDuty
 * PATCH /employees/:telegramId/set-duty
 * Тело запроса:
 * {
 *   "onDuty": true
 * }
 * Ответ:
 * {
 *   "telegramId": "telegram_12345",
 *   "name": "Иван Иванов",
 *   "onDuty": true, // Новое значение
 *   "admin": false
 * }
 */
app.patch('/employees/:telegramId/set-duty', async (req: Request, res: Response) => {
    const { telegramId } = req.params;
    const { onDuty } = req.body;

    if (typeof onDuty !== 'boolean') {
        return res.status(400).json({ error: 'Поле onDuty должно быть булевым значением' });
    }

    try {
        // Находим сотрудника по telegramId
        const employee = await prisma.employee.findUnique({
            where: { telegramId },
        });

        if (!employee) {
            return res.status(404).json({ error: 'Работник с таким telegramId не найден' });
        }

        // Обновляем значение onDuty
        const updatedEmployee = await prisma.employee.update({
            where: { telegramId },
            data: {
                onDuty: onDuty,
            },
        });

        res.json({
            telegramId: updatedEmployee.telegramId,
            name: updatedEmployee.name,
            onDuty: updatedEmployee.onDuty,
            admin: updatedEmployee.admin,
        });
    } catch (error) {
        console.error('Ошибка при обновлении onDuty:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * ЭНДПОИНТ СОЗДАНИЯ БИЛЕТА!!!!
 * POST /tickets
 * Тело запроса:
 * {
 *   "telegramId": "telegram_12345",
 *   "departmentId": "dep1",
 *   "appointedTime": "2024-05-01T10:00:00Z", 
 *   "operationId": "op1"
 * }
 */
app.post('/tickets', async (req: Request, res: Response) => {
    const { telegramId, departmentId, appointedTime, operationId } = req.body;

    if (!operationId || !departmentId) {
        return res.status(400).json({ error: 'operationId и departmentId обязательны' });
    }

    try {
        const operation = await prisma.operation.findUnique({
            where: { id: operationId },
        });

        if (!operation) {
            return res.status(404).json({ error: 'operationId не существует' });
        }

        // Проверяем, доступно ли это отделение для данной операции
        const department = await prisma.department.findUnique({
            where: { id: departmentId },
            include: {
                availableOperationGroups: true,
            },
        });

        if (!department) {
            return res.status(404).json({ error: 'Отделение с таким departmentId не найдено' });
        }

        const isOperationAvailable = department.availableOperationGroups.some(group => group.id === operation.operationGroupId);

        if (!isOperationAvailable) {
            return res.status(400).json({ error: 'Данная операция недоступна в указанном отделении' });
        }

        let userId: string | null = null;

        if (telegramId) {
            const user = await prisma.user.findUnique({
                where: { telegramId },
            });

            if (!user) {
                return res.status(404).json({ error: 'Пользователь с таким telegramId не найден' });
            }

            userId = user.id;
        }

        // Создаём билет без QR-кода для получения ID
        const ticket = await prisma.ticket.create({
            data: {
                appointedTime: appointedTime ? new Date(appointedTime) : null,
                department: {
                    connect: { id: departmentId },
                },
                user: userId ? { connect: { id: userId } } : undefined,
                operation: {
                    connect: { id: operationId },
                },
                // Убедитесь, что qrCode допускает null, иначе установите временное значение
                qrCode: null,
            },
        });

        // Генерируем URL для QR-кода, например, с использованием ID билета
        const ticketUrl = `https://t.me/PochtaDonClientBot/ticket/${ticket.id}`;

        // Генерируем уникальное имя файла для QR-кода
        const qrCodeFileName = `qr-${uuidv4()}.png`;
        const qrCodePath = path.join(__dirname, 'public', 'qrcodes', qrCodeFileName);
        const qrCodeUrl = `/qrcodes/${qrCodeFileName}`; // Относительный путь

        // Генерируем QR-код и сохраняем его как изображение
        await QRCode.toFile(qrCodePath, ticketUrl, {
            color: {
                dark: '#000000',  // Чёрный цвет QR-кода
                light: '#FFFFFF'  // Белый фон
            },
            width: 300, // Ширина изображения в пикселях
        });

        // Обновляем билет с URL QR-кода
        const updatedTicket = await prisma.ticket.update({
            where: { id: ticket.id },
            data: { qrCode: qrCodeUrl },
        });

        // Поиск сотрудника, находящегося на дежурстве в выбранном отделе и разрешающего данную группу операций
        const employee = await prisma.employee.findFirst({
            where: {
                departmentId: departmentId,
                onDuty: true,
                allowedOperationGroups: {
                    some: {
                        id: operation.operationGroupId,
                    },
                },
            },
        });

        if (employee) {
            await prisma.ticketOperation.create({
                data: {
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
            console.warn(`Нет доступных сотрудников для отдела ${departmentId}`);
        }

        // Получаем обновлённый билет с QR-кодом
        const finalTicket = await prisma.ticket.findUnique({
            where: { id: ticket.id },
        });

        res.status(201).json(finalTicket);
    } catch (error) {
        console.error('Ошибка при создании билета:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


/**
 * Новый Эндпоинт для создания нового работника
 * POST /employees
 * Тело запроса:
 * {
 *   "telegramId": "emp_1006",
 *   "name": "Мария Иванова",
 *   "onDuty": true,
 *   "admin": false,
 *   "departmentId": "dep1",
 *   "allowedOperationGroups": ["group1", "group3"]
 * }
 */
app.post('/employees', async (req: Request, res: Response) => {
    const { telegramId, name, onDuty, admin, departmentId, allowedOperationGroups } = req.body;

    if (!telegramId || !name || !departmentId || !Array.isArray(allowedOperationGroups)) {
        return res.status(400).json({ error: 'telegramId, name, departmentId и allowedOperationGroups обязательны' });
    }

    try {
        const department = await prisma.department.findUnique({
            where: { id: departmentId },
        });

        if (!department) {
            return res.status(404).json({ error: 'Отделение с таким departmentId не найдено' });
        }

        const operationGroups = await prisma.operationGroup.findMany({
            where: {
                id: { in: allowedOperationGroups },
            },
        });

        if (operationGroups.length !== allowedOperationGroups.length) {
            return res.status(400).json({ error: 'Некоторые из allowedOperationGroups не существуют' });
        }

        const existingEmployee = await prisma.employee.findUnique({
            where: { telegramId },
        });

        if (existingEmployee) {
            return res.status(400).json({ error: 'Работник с таким telegramId уже существует' });
        }

        const employee = await prisma.employee.create({
            data: {
                telegramId,
                name,
                onDuty: onDuty ?? false,
                admin: admin ?? false,
                department: {
                    connect: { id: departmentId },
                },
                allowedOperationGroups: {
                    connect: allowedOperationGroups.map((id: string) => ({ id })),
                },
            },
        });

        res.status(201).json(employee);
    } catch (error) {
        console.error('Ошибка при создании работника:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Новый Эндпоинт для смены флага admin у работника
 * PATCH /employees/:telegramId/set-admin
 * Тело запроса:
 * {
 *   "admin": true // Новое значение
 * }
 * Ответ:
 * {
 *   "telegramId": "telegram_12345",
 *   "name": "Иван Иванов",
 *   "onDuty": true,
 *   "admin": true // Новое значение
 * }
 */
app.patch('/employees/:telegramId/set-admin', async (req: Request, res: Response) => {
    const { telegramId } = req.params;
    const { admin } = req.body;

    if (typeof admin !== 'boolean') {
        return res.status(400).json({ error: 'Поле admin должно быть булевым значением' });
    }

    try {
        // Находим сотрудника по telegramId
        const employee = await prisma.employee.findUnique({
            where: { telegramId },
        });

        if (!employee) {
            return res.status(404).json({ error: 'Работник с таким telegramId не найден' });
        }

        // Обновляем значение admin
        const updatedEmployee = await prisma.employee.update({
            where: { telegramId },
            data: {
                admin: admin,
            },
        });

        res.json({
            telegramId: updatedEmployee.telegramId,
            name: updatedEmployee.name,
            onDuty: updatedEmployee.onDuty,
            admin: updatedEmployee.admin,
        });
    } catch (error) {
        console.error('Ошибка при обновлении admin:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * ЭНДПОИНТ СОЗДАНИЯ БИЛЕТА!!!!
 * POST /tickets
 * Тело запроса:
 * {
 *   "telegramId": "telegram_12345",
 *   "departmentId": "dep1",
 *   "appointedTime": "2024-05-01T10:00:00Z", 
 *   "operationId": "op1"
 * }
 */
app.post('/tickets', async (req: Request, res: Response) => {
    const { telegramId, departmentId, appointedTime, operationId } = req.body;

    if (!operationId || !departmentId) {
        return res.status(400).json({ error: 'operationId и departmentId обязательны' });
    }

    try {
        const operation = await prisma.operation.findUnique({
            where: { id: operationId },
        });

        if (!operation) {
            return res.status(404).json({ error: 'operationId не существует' });
        }

        // Проверяем, доступно ли это отделение для данной операции
        const department = await prisma.department.findUnique({
            where: { id: departmentId },
            include: {
                availableOperationGroups: true,
            },
        });

        if (!department) {
            return res.status(404).json({ error: 'Отделение с таким departmentId не найдено' });
        }

        const isOperationAvailable = department.availableOperationGroups.some(group => group.id === operation.operationGroupId);

        if (!isOperationAvailable) {
            return res.status(400).json({ error: 'Данная операция недоступна в указанном отделении' });
        }

        let userId: string | null = null;

        if (telegramId) {
            const user = await prisma.user.findUnique({
                where: { telegramId },
            });

            if (!user) {
                return res.status(404).json({ error: 'Пользователь с таким telegramId не найден' });
            }

            userId = user.id;
        }

        // Создаём билет без QR-кода для получения ID
        const ticket = await prisma.ticket.create({
            data: {
                appointedTime: appointedTime ? new Date(appointedTime) : null,
                department: {
                    connect: { id: departmentId },
                },
                user: userId ? { connect: { id: userId } } : undefined,
                operation: {
                    connect: { id: operationId },
                },
                // Убедитесь, что qrCode допускает null, иначе установите временное значение
                qrCode: null,
            },
        });

        // Генерируем URL для QR-кода, например, с использованием ID билета
        const ticketUrl = `https://t.me/PochtaDonClientBot/ticket/${ticket.id}`;

        // Генерируем уникальное имя файла для QR-кода
        const qrCodeFileName = `qr-${uuidv4()}.png`;
        const qrCodePath = path.join(__dirname, 'public', 'qrcodes', qrCodeFileName);
        const qrCodeUrl = `/qrcodes/${qrCodeFileName}`; // Относительный путь

        // Генерируем QR-код и сохраняем его как изображение
        await QRCode.toFile(qrCodePath, ticketUrl, {
            color: {
                dark: '#000000',  // Чёрный цвет QR-кода
                light: '#FFFFFF'  // Белый фон
            },
            width: 300, // Ширина изображения в пикселях
        });

        // Обновляем билет с URL QR-кода
        const updatedTicket = await prisma.ticket.update({
            where: { id: ticket.id },
            data: { qrCode: qrCodeUrl },
        });

        // Поиск сотрудника, находящегося на дежурстве в выбранном отделе и разрешающего данную группу операций
        const employee = await prisma.employee.findFirst({
            where: {
                departmentId: departmentId,
                onDuty: true,
                allowedOperationGroups: {
                    some: {
                        id: operation.operationGroupId,
                    },
                },
            },
        });

        if (employee) {
            await prisma.ticketOperation.create({
                data: {
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
            console.warn(`Нет доступных сотрудников для отдела ${departmentId}`);
        }

        // Получаем обновлённый билет с QR-кодом
        const finalTicket = await prisma.ticket.findUnique({
            where: { id: ticket.id },
        });

        res.status(201).json(finalTicket);
    } catch (error) {
        console.error('Ошибка при создании билета:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});


/**
 * Новый Эндпоинт для создания нового работника
 * POST /employees
 * Тело запроса:
 * {
 *   "telegramId": "emp_1006",
 *   "name": "Мария Иванова",
 *   "onDuty": true,
 *   "admin": false,
 *   "departmentId": "dep1",
 *   "allowedOperationGroups": ["group1", "group3"]
 * }
 */
app.post('/employees', async (req: Request, res: Response) => {
    const { telegramId, name, onDuty, admin, departmentId, allowedOperationGroups } = req.body;

    if (!telegramId || !name || !departmentId || !Array.isArray(allowedOperationGroups)) {
        return res.status(400).json({ error: 'telegramId, name, departmentId и allowedOperationGroups обязательны' });
    }

    try {
        const department = await prisma.department.findUnique({
            where: { id: departmentId },
        });

        if (!department) {
            return res.status(404).json({ error: 'Отделение с таким departmentId не найдено' });
        }

        const operationGroups = await prisma.operationGroup.findMany({
            where: {
                id: { in: allowedOperationGroups },
            },
        });

        if (operationGroups.length !== allowedOperationGroups.length) {
            return res.status(400).json({ error: 'Некоторые из allowedOperationGroups не существуют' });
        }

        const existingEmployee = await prisma.employee.findUnique({
            where: { telegramId },
        });

        if (existingEmployee) {
            return res.status(400).json({ error: 'Работник с таким telegramId уже существует' });
        }

        const employee = await prisma.employee.create({
            data: {
                telegramId,
                name,
                onDuty: onDuty ?? false,
                admin: admin ?? false,
                department: {
                    connect: { id: departmentId },
                },
                allowedOperationGroups: {
                    connect: allowedOperationGroups.map((id: string) => ({ id })),
                },
            },
        });

        res.status(201).json(employee);
    } catch (error) {
        console.error('Ошибка при создании работника:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Новый Эндпоинт для смены флага admin у работника
 * PATCH /employees/:telegramId/set-admin
 * Тело запроса:
 * {
 *   "admin": true // Новое значение
 * }
 * Ответ:
 * {
 *   "telegramId": "telegram_12345",
 *   "name": "Иван Иванов",
 *   "onDuty": true,
 *   "admin": true // Новое значение
 * }
 */
app.patch('/employees/:telegramId/set-admin', async (req: Request, res: Response) => {
    const { telegramId } = req.params;
    const { admin } = req.body;

    if (typeof admin !== 'boolean') {
        return res.status(400).json({ error: 'Поле admin должно быть булевым значением' });
    }

    try {
        // Находим сотрудника по telegramId
        const employee = await prisma.employee.findUnique({
            where: { telegramId },
        });

        if (!employee) {
            return res.status(404).json({ error: 'Работник с таким telegramId не найден' });
        }

        // Обновляем значение admin
        const updatedEmployee = await prisma.employee.update({
            where: { telegramId },
            data: {
                admin: admin,
            },
        });

        res.json({
            telegramId: updatedEmployee.telegramId,
            name: updatedEmployee.name,
            onDuty: updatedEmployee.onDuty,
            admin: updatedEmployee.admin,
        });
    } catch (error) {
        console.error('Ошибка при обновлении admin:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Новый Эндпоинт для получения списка текущих активных талонов для каждого сотрудника в отделении
 * GET /queue/active-tickets/:departmentId
 * Ответ: { "employeeId1": ["ticketId1", "ticketId2"], "employeeId2": ["ticketId3"], ... }
 */
app.get('/queue/active-tickets/:departmentId', async (req: Request, res: Response) => {
    const { departmentId } = req.params;

    try {
        const activeTickets = await getActiveTickets(departmentId);
        res.json(activeTickets);
    } catch (error) {
        console.error('Ошибка при получении активных билетов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Эндпоинт для получения списка операций по operationGroupId
app.get('/operation-group/:operationGroupId/operations', async (req: Request, res: Response) => {
  const { operationGroupId } = req.params;

  try {
    const operations = await prisma.operation.findMany({
      where: {
        operationGroupId: operationGroupId,
      },
    });

    if (!operations || operations.length === 0) {
      return res.status(404).json({ message: 'Operations not found for the provided operation group ID' });
    }

    res.json(operations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching operations.' });
  }
});

/**
 * Эндпоинт для получения полной информации о билете по его id
 * GET /tickets/:id
 * Ответ:
 * {
 *   "id": "ticket-id",
 *   "appointedTime": "2024-05-01T09:00:00.000Z",
 *   "qrCode": "/qrcodes/qr-uuid.png",
 *   "department": {
 *     "id": "dep1",
 *     "address": "123 Main St",
 *     // другие поля отделения
 *   },
 *   "operation": {
 *     "id": "op1",
 *     "name": "Отправить письменную корреспонденцию",
 *     "description": "Услуга по отправке письменной корреспонденции",
 *     "operationGroupId": "group1",
 *     // другие поля операции
 *   },
 *   "user": {
 *     "id": "user-id",
 *     "telegramId": "telegram_12345",
 *     // другие поля пользователя
 *   },
 *   // другие связанные данные, если необходимо
 * }
 */
app.get('/tickets/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id },
            include: {
                department: true,    
                operation: true,     
                user: true,          
            },
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Билет не найден' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Ошибка при получении билета:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * Новый Эндпоинт для получения данных очереди для монитора
 * GET /queue/monitor/:departmentId
 * Ответ:
 * {
 *   "employeeId1": {
 *     "name": "Иван Иванов",
 *     "currentTicket": "ticketId1",
 *     "queue": ["ticketId2", "ticketId3"]
 *   },
 *   "employeeId2": {
 *     "name": "Мария Петрова",
 *     "currentTicket": "ticketId4",
 *     "queue": []
 *   },
 *   ...
 * }
 */
app.get('/queue/monitor/:departmentId', async (req: Request, res: Response) => {
    const { departmentId } = req.params;

    try {
        const queueData = await getQueueForMonitor(departmentId);
        res.json(queueData);
    } catch (error) {
        console.error('Ошибка при получении данных очереди для монитора:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
