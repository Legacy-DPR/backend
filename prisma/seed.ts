import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOperations() {
  const operationGroupResult = await prisma.$executeRaw`
    INSERT INTO "OperationGroup" ("id", "name", "description") 
    VALUES 
      ('group1', 'Почтовые отправления', 'Группа услуг по почтовым отправлениям'),
      ('group2', 'Почтовые переводы', 'Группа услуг по почтовым переводам'),
      ('group3', 'Платежи', 'Группа услуг по платежам'),
      ('group4', 'Стартовые пакеты мобильных операторов', 'Группа услуг по мобильным операторам'),
      ('group5', 'Товары народного потребления', 'Прочие товары'),
      ('group6', 'Подписка на газеты и журналы', 'Подписка на периодические издания'),
      ('group7', 'Написать заявление/обращение', 'Услуга по подаче заявления'),
      ('group8', 'Выплата пенсий и пособий', 'Выплата пенсий и социальных пособий')
    ON CONFLICT DO NOTHING;
  `;
  console.log({ operationGroupResult });

  const operationResult = await prisma.$executeRaw`
    INSERT INTO "Operation" ("id", "name", "description", "operationGroupId") 
    VALUES 
      ('op1', 'Отправить письменную корреспонденцию', 'Услуга по отправке письменной корреспонденции', 'group1'),
      ('op2', 'Отправить крупногабаритные посылки', 'Услуга по отправке крупногабаритных посылок', 'group1'),
      ('op3', 'Отправить мелкие посылки', 'Услуга по отправке мелких посылок', 'group1'),
      ('op4', 'Получить', 'Услуга по получению отправлений', 'group1'),
      ('op5', 'Почтовая тара', 'Услуга по работе с почтовой тарой', 'group1'),
      ('op6', 'Отправить почтовый перевод', 'Услуга по отправке почтовых переводов', 'group2'),
      ('op7', 'Получить почтовый перевод', 'Услуга по получению почтовых переводов', 'group2'),
      ('op8', 'Коммунальные услуги', 'Услуга по оплате коммунальных услуг', 'group3'),
      ('op9', 'Интернет', 'Услуга по оплате интернета', 'group3'),
      ('op10', 'Телефония', 'Услуга по оплате телефонии', 'group3'),
      ('op11', 'Другое', 'Оплата других услуг', 'group3'),
      ('op12', 'Купить стартовые пакеты', 'Покупка стартовых пакетов мобильных операторов', 'group4'),
      ('op13', 'Восстановить стартовые пакеты', 'Восстановление стартовых пакетов', 'group4'),
      ('op14', 'Скретч-карты', 'Покупка скретч-карт', 'group4')
    ON CONFLICT DO NOTHING;
  `;
  console.log({ operationResult });

  // Добавьте отделение и привяжите его к группам операций
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
        ],
      },
    },
  });
  console.log({ departmentResult });
}

seedOperations().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
