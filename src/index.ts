import { PrismaClient } from '@prisma/client';
import express from 'express';
import { checkIfServiceAuthorized } from "@/middleware";

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
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
    });
  } catch (error) {
    console.error('Ошибка при получении данных работника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});