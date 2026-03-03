// 统一导出所有模型
// 根据环境变量选择使用内存数据库或真实数据库

const useRealDatabase = process.env.USE_REAL_DB === 'true';

if (useRealDatabase) {
  // 使用真实数据库 (MySQL)
  const { User, Family, Template, Checkin, sequelize, syncDatabase } = require('./database');
  
  // 生成家庭码函数
  function generateFamilyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  
  module.exports = {
    User,
    Family,
    Template,
    Checkin,
    sequelize,
    syncDatabase,
    generateFamilyCode,
    useRealDatabase: true
  };
} else {
  // 使用内存数据库（原有实现）
  const { v4: uuidv4 } = require('uuid');

  const db = {
    users: new Map(),
    families: new Map(),
    templates: new Map(),
    checkins: new Map(),
    userByUsername: new Map(),
    familyByCode: new Map(),
  };

  function generateFamilyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (db.familyByCode.has(code)) {
      return generateFamilyCode();
    }
    return code;
  }

  class User {
    constructor({ username, password, name, role, familyId = null, avatar = null }) {
      this.id = uuidv4();
      this.username = username;
      this.password = password;
      this.name = name;
      this.role = role;
      this.familyId = familyId;
      this.avatar = avatar;
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  }

  class Family {
    constructor({ name, createdBy }) {
      this.id = uuidv4();
      this.code = generateFamilyCode();
      this.name = name || '我的家庭';
      this.createdBy = createdBy;
      this.members = [createdBy];
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  }

  class Template {
    constructor({ familyId, name, description, activities, days, createdBy, weekStart }) {
      this.id = uuidv4();
      this.familyId = familyId;
      this.name = name;
      this.description = description;
      this.activities = activities;
      this.days = days;
      this.createdBy = createdBy;
      this.weekStart = weekStart;
      this.isActive = true;
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  }

  class Checkin {
    constructor({ familyId, userId, templateId, activityId, date }) {
      this.id = uuidv4();
      this.familyId = familyId;
      this.userId = userId;
      this.templateId = templateId;
      this.activityId = activityId;
      this.date = date || new Date().toISOString().split('T')[0];
      this.createdAt = new Date();
    }
  }

  module.exports = {
    db,
    User,
    Family,
    Template,
    Checkin,
    generateFamilyCode,
    useRealDatabase: false
  };
}
