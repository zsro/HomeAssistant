const { Sequelize, DataTypes } = require('sequelize');

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  process.env.DB_NAME || 'homeassistant',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 定义 User 模型
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('father', 'mother', 'child'),
    allowNull: false
  },
  familyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

// 定义 Family 模型
const Family = sequelize.define('Family', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'families',
  timestamps: true
});

// 定义 Template 模型
const Template = sequelize.define('Template', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  familyId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  activities: {
    type: DataTypes.JSON,
    allowNull: true
  },
  days: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  weekStart: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'templates',
  timestamps: true
});

// 定义 Checkin 模型
const Checkin = sequelize.define('Checkin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  familyId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  activityId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'checkins',
  timestamps: true
});

// 建立关联关系
Family.hasMany(User, { foreignKey: 'familyId' });
User.belongsTo(Family, { foreignKey: 'familyId' });

Family.hasMany(Template, { foreignKey: 'familyId' });
Template.belongsTo(Family, { foreignKey: 'familyId' });

// 同步数据库
async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 按顺序同步模型（先创建没有外键的表）
    await Family.sync({ alter: true });
    await User.sync({ alter: true });
    await Template.sync({ alter: true });
    await Checkin.sync({ alter: true });
    
    console.log('数据库表同步完成');
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  User,
  Family,
  Template,
  Checkin,
  syncDatabase
};
