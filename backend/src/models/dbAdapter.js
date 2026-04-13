// 数据库适配层
// 统一使用云端 MySQL（Sequelize）访问数据

const { Op } = require('sequelize');
const { calculateConsecutiveDays } = require('../utils/date');
const { User, Family, Template, Checkin, generateFamilyCode } = require('./index');

const userAdapter = {
  async findByUsername(username) {
    return User.findOne({ where: { username } });
  },

  async findById(id) {
    return User.findByPk(id);
  },

  async findManyByIds(ids = []) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return [];
    }

    return User.findAll({ where: { id: uniqueIds } });
  },

  async create(userData) {
    return User.create(userData);
  },

  async update(id, updateData) {
    const user = await User.findByPk(id);
    if (!user) {
      return null;
    }

    return user.update(updateData);
  },
};

const familyAdapter = {
  async findByCode(code) {
    return Family.findOne({ where: { code: code.toUpperCase() } });
  },

  async findById(id) {
    return Family.findByPk(id);
  },

  async create(familyData) {
    return Family.create({
      ...familyData,
      code: generateFamilyCode(),
    });
  },

  async update(id, updateData) {
    const family = await Family.findByPk(id);
    if (!family) {
      return null;
    }

    return family.update(updateData);
  },

  async getMembers(familyId) {
    return User.findAll({ where: { familyId } });
  },
};

const templateAdapter = {
  async findById(id) {
    return Template.findByPk(id);
  },

  async findActiveByFamily(familyId) {
    return Template.findOne({
      where: { familyId, isActive: true },
    });
  },

  async findByFamily(familyId) {
    return Template.findAll({
      where: { familyId },
      order: [['createdAt', 'DESC']],
    });
  },

  async create(templateData) {
    return Template.create(templateData);
  },

  async update(id, updateData) {
    const template = await Template.findByPk(id);
    if (!template) {
      return null;
    }

    return template.update(updateData);
  },

  async deactivateAllByFamily(familyId) {
    await Template.update(
      { isActive: false },
      { where: { familyId, isActive: true } }
    );
  },
};

const checkinAdapter = {
  async findById(id) {
    return Checkin.findByPk(id);
  },

  async findByUserAndDate(userId, date) {
    return Checkin.findOne({
      where: { userId, date },
    });
  },

  async findByFamily(familyId, options = {}) {
    const where = { familyId };

    if (options.date) {
      where.date = options.date;
    } else if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) {
        where.date[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        where.date[Op.lte] = options.endDate;
      }
    }

    return Checkin.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
  },

  async create(checkinData) {
    return Checkin.create(checkinData);
  },

  async countByUser(userId) {
    return Checkin.count({ where: { userId } });
  },

  async getConsecutiveDays(userId) {
    const checkins = await Checkin.findAll({
      where: { userId },
      order: [['date', 'DESC']],
      attributes: ['date'],
    });

    return calculateConsecutiveDays(checkins.map((checkin) => checkin.date));
  },
};

module.exports = {
  user: userAdapter,
  family: familyAdapter,
  template: templateAdapter,
  checkin: checkinAdapter,
};
