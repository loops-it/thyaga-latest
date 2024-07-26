import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/sequelize';

class Customize extends Model {}

Customize.init({
  bot_Name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  select_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Customize',
  tableName: 'customize',
  timestamps: false,
});

export default Customize;
