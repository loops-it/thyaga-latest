import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
    dialect: 'mysql', 
    dialectModule: require('mysql2'),
    host: '3.111.92.159',
    port: 3306,
    database: 'yovibez_thyaga',
    username: 'yovibez_chatbot',
    password: 'IFXx63a2jDyNdf73lf23bfk@ff',
    timezone: '+06:00',
  });

export default sequelize;