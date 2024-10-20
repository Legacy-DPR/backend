// index.ts
import { PrismaClient } from '@prisma/client';
import express from 'express';
import { checkIfServiceAuthorized } from "@/middleware";
import { getActiveTickets } from './queueService'; // Импортируем функцию из queueService

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(checkIfServiceAuthorized);

/**
 * 1. Эндпоинт для создания нового пользователя по telegramId
 *    POST /users
 *    Тело запроса: { "telegramId": "telegram_12345" }
 */
app.post('/users', async (req, res) => {
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
app.get('/users/:telegramId', async (req, res) => {
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
app.get('/departments', async (req, res) => {
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
app.get('/departments/:departmentId/operation-groups', async (req, res) => {
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
app.get('/employees/:telegramId', async (req, res) => {
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
 * Новый Эндпоинт для изменения значения onDuty на противоположное
 * PATCH /employees/:telegramId/toggle-duty
 * Ответ:
 * {
 *   "telegramId": "telegram_12345",
 *   "name": "Иван Иванов",
 *   "onDuty": true, // Новое значение
 *   "admin": false
 * }
 */
app.patch('/employees/:telegramId/toggle-duty', async (req, res) => {
    const { telegramId } = req.params;

    try {
        // Находим сотрудника по telegramId
        const employee = await prisma.employee.findUnique({
            where: { telegramId },
        });

        if (!employee) {
            return res.status(404).json({ error: 'Работник с таким telegramId не найден' });
        }

        // Переключаем значение onDuty
        const updatedEmployee = await prisma.employee.update({
            where: { telegramId },
            data: {
                onDuty: !employee.onDuty,
            },
        });

        res.json({
            telegramId: updatedEmployee.telegramId,
            name: updatedEmployee.name,
            onDuty: updatedEmployee.onDuty,
            admin: updatedEmployee.admin,
        });
    } catch (error) {
        console.error('Ошибка при переключении onDuty:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

/**
 * ЭНДПОИНТ СОЗДАНИЯ БИЛЕТА!!!!
 * POST /tickets
 * Тело запроса:
 * {
 *   "telegramId": "telegram_12345",
 *   "appointedTime": "2024-05-01T10:00:00Z", 
 *   "operationId": "op1"
 * }
 */
app.post('/tickets', async (req, res) => {
    const { telegramId, appointedTime, operationId } = req.body;

    if (!operationId) {
        return res.status(400).json({ error: 'operationId обязателен' });
    }

    try {
        const operation = await prisma.operation.findUnique({
            where: { id: operationId },
        });

        if (!operation) {
            return res.status(404).json({ error: 'operationId не существует' });
        }

        let userId = null;

        if (telegramId) {
            const user = await prisma.user.findUnique({
                where: { telegramId },
            });

            if (!user) {
                return res.status(404).json({ error: 'Пользователь с таким telegramId не найден' });
            }

            userId = user.id;
        }

        // ЗАГЛУШКА
        const qrCode = `QR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        let departmentId = null;
        if (operation.operationGroupId) {
            const operationGroup = await prisma.operationGroup.findUnique({
                where: { id: operation.operationGroupId },
                include: { departments: true },
            });

            if (operationGroup && operationGroup.departments.length > 0) {
                departmentId = operationGroup.departments[0].id;
            } else {
                return res.status(400).json({ error: 'Не удалось определить отдел для данной операции' });
            }
        } else {
            // Если операция не связана с группой, выбираем отделение по умолчанию
            const defaultDepartment = await prisma.department.findFirst();
            if (defaultDepartment) {
                departmentId = defaultDepartment.id;
            } else {
                return res.status(400).json({ error: 'Нет доступных отделений для создания билета' });
            }
        }

        const ticket = await prisma.ticket.create({
            data: {
                appointedTime: appointedTime ? new Date(appointedTime) : null,
                department: {
                    connect: { id: departmentId },
                },
                user: userId ? { connect: { id: userId } } : undefined,
                qrCode, // Используем сгенерированную строку
                operation: {
                    connect: { id: operationId },
                },
            },
        });

        const employee = await prisma.employee.findFirst({
            where: {
                departmentId: departmentId,
                onDuty: true,
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
                    operationStatus: 'CALL', 
                    notes: '', 
                },
            });
        } else {
            console.warn(`Нет доступных сотрудников для отдела ${departmentId}`);
        }

        res.status(201).json(ticket);
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
app.post('/employees', async (req, res) => {
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
 * Новый Эндпоинт для получения списка текущих активных талонов для каждого сотрудника в отделении
 * GET /queue/active-tickets/:departmentId
 * Ответ: { "employeeId1": ["ticketId1", "ticketId2"], "employeeId2": ["ticketId3"], ... }
 */
app.get('/queue/active-tickets/:departmentId', async (req, res) => {
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
app.get('/operation-group/:operationGroupId/operations', async (req, res) => {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});