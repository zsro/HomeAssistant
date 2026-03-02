// 数据库适配层
// 为路由提供统一的数据访问接口，支持内存数据库和真实数据库

const { useRealDatabase } = require('./index');

// 内存数据库实例（当不使用真实数据库时）
let memDb = null;
if (!useRealDatabase) {
  const { db } = require('./index');
  memDb = db;
}

// Sequelize 模型（当使用真实数据库时）
let models = null;
if (useRealDatabase) {
  const { User, Family, Template, Checkin } = require('./database');
  models = { User, Family, Template, Checkin };
}

// 用户相关操作
const userAdapter = {
  // 根据用户名查找用户
  async findByUsername(username) {
    if (useRealDatabase) {
      return await models.User.findOne({ where: { username } });
    } else {
      const userId = memDb.userByUsername.get(username);
      return userId ? memDb.users.get(userId) : null;
    }
  },

  // 根据 ID 查找用户
  async findById(id) {
    if (useRealDatabase) {
      return await models.User.findByPk(id);
    } else {
      return memDb.users.get(id);
    }
  },

  // 创建用户
  async create(userData) {
    if (useRealDatabase) {
      return await models.User.create(userData);
    } else {
      const { User } = require('./index');
      const user = new User(userData);
      memDb.users.set(user.id, user);
      memDb.userByUsername.set(user.username, user.id);
      return user;
    }
  },

  // 更新用户
  async update(id, updateData) {
    if (useRealDatabase) {
      const user = await models.User.findByPk(id);
      if (user) {
        return await user.update(updateData);
      }
      return null;
    } else {
      const user = memDb.users.get(id);
      if (user) {
        Object.assign(user, updateData, { updatedAt: new Date() });
        return user;
      }
      return null;
    }
  }
};

// 家庭相关操作
const familyAdapter = {
  // 根据家庭码查找家庭
  async findByCode(code) {
    if (useRealDatabase) {
      return await models.Family.findOne({ where: { code: code.toUpperCase() } });
    } else {
      const familyId = memDb.familyByCode.get(code.toUpperCase());
      return familyId ? memDb.families.get(familyId) : null;
    }
  },

  // 根据 ID 查找家庭
  async findById(id) {
    if (useRealDatabase) {
      return await models.Family.findByPk(id);
    } else {
      return memDb.families.get(id);
    }
  },

  // 创建家庭
  async create(familyData) {
    if (useRealDatabase) {
      const { generateFamilyCode } = require('./index');
      const family = await models.Family.create({
        ...familyData,
        code: generateFamilyCode()
      });
      return family;
    } else {
      const { Family } = require('./index');
      const family = new Family(familyData);
      memDb.families.set(family.id, family);
      memDb.familyByCode.set(family.code, family.id);
      return family;
    }
  },

  // 获取家庭成员
  async getMembers(familyId) {
    if (useRealDatabase) {
      return await models.User.findAll({ where: { familyId } });
    } else {
      const members = [];
      for (const [id, user] of memDb.users) {
        if (user.familyId === familyId) {
          members.push(user);
        }
      }
      return members;
    }
  }
};

// 模板相关操作
const templateAdapter = {
  // 根据 ID 查找模板
  async findById(id) {
    if (useRealDatabase) {
      return await models.Template.findByPk(id);
    } else {
      return memDb.templates.get(id);
    }
  },

  // 查找家庭的活跃模板
  async findActiveByFamily(familyId) {
    if (useRealDatabase) {
      return await models.Template.findOne({ 
        where: { familyId, isActive: true } 
      });
    } else {
      for (const [id, template] of memDb.templates) {
        if (template.familyId === familyId && template.isActive) {
          return template;
        }
      }
      return null;
    }
  },

  // 查找家庭的所有模板
  async findByFamily(familyId) {
    if (useRealDatabase) {
      return await models.Template.findAll({ 
        where: { familyId },
        order: [['createdAt', 'DESC']]
      });
    } else {
      const templates = [];
      for (const [id, template] of memDb.templates) {
        if (template.familyId === familyId) {
          templates.push(template);
        }
      }
      templates.sort((a, b) => b.createdAt - a.createdAt);
      return templates;
    }
  },

  // 创建模板
  async create(templateData) {
    if (useRealDatabase) {
      return await models.Template.create(templateData);
    } else {
      const { Template } = require('./index');
      const template = new Template(templateData);
      memDb.templates.set(template.id, template);
      return template;
    }
  },

  // 更新模板
  async update(id, updateData) {
    if (useRealDatabase) {
      const template = await models.Template.findByPk(id);
      if (template) {
        return await template.update(updateData);
      }
      return null;
    } else {
      const template = memDb.templates.get(id);
      if (template) {
        Object.assign(template, updateData, { updatedAt: new Date() });
        return template;
      }
      return null;
    }
  },

  // 停用家庭的所有模板
  async deactivateAllByFamily(familyId) {
    if (useRealDatabase) {
      await models.Template.update(
        { isActive: false },
        { where: { familyId, isActive: true } }
      );
    } else {
      for (const [id, template] of memDb.templates) {
        if (template.familyId === familyId && template.isActive) {
          template.isActive = false;
          template.updatedAt = new Date();
        }
      }
    }
  }
};

// 打卡相关操作
const checkinAdapter = {
  // 根据 ID 查找打卡记录
  async findById(id) {
    if (useRealDatabase) {
      return await models.Checkin.findByPk(id);
    } else {
      return memDb.checkins.get(id);
    }
  },

  // 查找用户在指定日期的打卡记录
  async findByUserAndDate(userId, date) {
    if (useRealDatabase) {
      return await models.Checkin.findOne({ 
        where: { userId, date } 
      });
    } else {
      for (const [id, checkin] of memDb.checkins) {
        if (checkin.userId === userId && checkin.date === date) {
          return checkin;
        }
      }
      return null;
    }
  },

  // 查找家庭的打卡记录
  async findByFamily(familyId, options = {}) {
    if (useRealDatabase) {
      const where = { familyId };
      if (options.date) where.date = options.date;
      if (options.startDate) where.date = { [require('sequelize').Op.gte]: options.startDate };
      if (options.endDate) where.date = { [require('sequelize').Op.lte]: options.endDate };
      
      return await models.Checkin.findAll({ 
        where,
        order: [['createdAt', 'DESC']]
      });
    } else {
      const checkins = [];
      for (const [id, checkin] of memDb.checkins) {
        if (checkin.familyId !== familyId) continue;
        if (options.date && checkin.date !== options.date) continue;
        if (options.startDate && checkin.date < options.startDate) continue;
        if (options.endDate && checkin.date > options.endDate) continue;
        checkins.push(checkin);
      }
      checkins.sort((a, b) => b.createdAt - a.createdAt);
      return checkins;
    }
  },

  // 创建打卡记录
  async create(checkinData) {
    if (useRealDatabase) {
      return await models.Checkin.create(checkinData);
    } else {
      const { Checkin } = require('./index');
      const checkin = new Checkin(checkinData);
      memDb.checkins.set(checkin.id, checkin);
      return checkin;
    }
  },

  // 统计用户打卡次数
  async countByUser(userId) {
    if (useRealDatabase) {
      return await models.Checkin.count({ where: { userId } });
    } else {
      let count = 0;
      for (const [id, checkin] of memDb.checkins) {
        if (checkin.userId === userId) count++;
      }
      return count;
    }
  },

  // 获取用户连续打卡天数
  async getConsecutiveDays(userId) {
    if (useRealDatabase) {
      const checkins = await models.Checkin.findAll({
        where: { userId },
        order: [['date', 'DESC']],
        attributes: ['date']
      });
      return calculateConsecutiveDays(checkins.map(c => c.date));
    } else {
      const dates = [];
      for (const [id, checkin] of memDb.checkins) {
        if (checkin.userId === userId) {
          dates.push(checkin.date);
        }
      }
      dates.sort((a, b) => b.localeCompare(a));
      return calculateConsecutiveDays(dates);
    }
  }
};

// 计算连续打卡天数
function calculateConsecutiveDays(dates) {
  if (dates.length === 0) return 0;
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // 如果今天没打卡，且昨天也没打卡，返回0
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0;
  }
  
  let consecutive = 1;
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = (prevDate - currDate) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      consecutive++;
    } else {
      break;
    }
  }
  
  return consecutive;
}

module.exports = {
  user: userAdapter,
  family: familyAdapter,
  template: templateAdapter,
  checkin: checkinAdapter,
  useRealDatabase
};
