const { Sequelize, DataTypes } = require('sequelize');

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少数据库配置: ${name}`);
  }
  return value;
}

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  getRequiredEnv('DB_NAME'),
  getRequiredEnv('DB_USER'),
  getRequiredEnv('DB_PASSWORD'),
  {
    host: getRequiredEnv('DB_HOST'),
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

const PinyinProgress = sequelize.define('PinyinProgress', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  currentLessonId: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  lastCompletedLessonId: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  completedLessonIds: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  tableName: 'pinyin_progress',
  timestamps: true,
});

const DisplayDevice = sequelize.define('DisplayDevice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  familyId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('offline', 'idle', 'active'),
    allowNull: false,
    defaultValue: 'offline',
  },
  lastSeenAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'display_devices',
  timestamps: true,
});

const DisplaySession = sequelize.define('DisplaySession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  deviceId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  familyId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  pairCode: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true,
  },
  pairToken: {
    type: DataTypes.STRING(512),
    allowNull: false,
  },
  displayToken: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  lastHeartbeatAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  boundByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isBound: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'display_sessions',
  timestamps: true,
});

const DisplayState = sequelize.define('DisplayState', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  deviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  screenType: {
    type: DataTypes.ENUM('home', 'pinyin', 'star_prep', 'message', 'image'),
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'display_states',
  timestamps: true,
});

// 建立关联关系
Family.hasMany(User, { foreignKey: 'familyId' });
User.belongsTo(Family, { foreignKey: 'familyId' });

Family.hasMany(DisplayDevice, { foreignKey: 'familyId' });
DisplayDevice.belongsTo(Family, { foreignKey: 'familyId' });

DisplayDevice.hasMany(DisplaySession, { foreignKey: 'deviceId' });
DisplaySession.belongsTo(DisplayDevice, { foreignKey: 'deviceId' });

DisplayDevice.hasOne(DisplayState, { foreignKey: 'deviceId' });
DisplayState.belongsTo(DisplayDevice, { foreignKey: 'deviceId' });

Family.hasMany(Template, { foreignKey: 'familyId' });
Template.belongsTo(Family, { foreignKey: 'familyId' });
User.hasOne(PinyinProgress, { foreignKey: 'userId' });
PinyinProgress.belongsTo(User, { foreignKey: 'userId' });

// 同步数据库
async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 按顺序同步模型（先创建没有外键的表）
    await Family.sync({ alter: true });
    await User.sync({ alter: true });
    await DisplayDevice.sync({ alter: true });
    await DisplaySession.sync({ alter: true });
    await DisplayState.sync({ alter: true });
    await Template.sync({ alter: true });
    await Checkin.sync({ alter: true });
    await PinyinProgress.sync({ alter: true });
    
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
  PinyinProgress,
  DisplayDevice,
  DisplaySession,
  DisplayState,
  syncDatabase
};
