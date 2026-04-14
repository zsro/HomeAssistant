// 数据库适配层
// 统一使用云端 MySQL（Sequelize）访问数据

const {
  User,
  Family,
  PinyinProgress,
  DisplayDevice,
  DisplaySession,
  DisplayState,
  generateFamilyCode,
} = require('./index');

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

const pinyinProgressAdapter = {
  async findByUserId(userId) {
    return PinyinProgress.findOne({ where: { userId } });
  },

  async create(progressData) {
    return PinyinProgress.create(progressData);
  },

  async update(id, updateData) {
    const progress = await PinyinProgress.findByPk(id);
    if (!progress) {
      return null;
    }

    return progress.update(updateData);
  },
};

const displayDeviceAdapter = {
  async findById(id) {
    return DisplayDevice.findByPk(id);
  },

  async findByInstallationId(installationId) {
    return DisplayDevice.findOne({
      where: { installationId },
    });
  },

  async findByFamily(familyId) {
    return DisplayDevice.findAll({
      where: { familyId },
      order: [['updatedAt', 'DESC']],
    });
  },

  async create(deviceData) {
    return DisplayDevice.create(deviceData);
  },

  async update(id, updateData) {
    const device = await DisplayDevice.findByPk(id);
    if (!device) {
      return null;
    }

    return device.update(updateData);
  },
};

const displaySessionAdapter = {
  async findById(id) {
    return DisplaySession.findByPk(id);
  },

  async findByPairCode(pairCode) {
    return DisplaySession.findOne({
      where: { pairCode },
      order: [['createdAt', 'DESC']],
    });
  },

  async create(sessionData) {
    return DisplaySession.create(sessionData);
  },

  async update(id, updateData) {
    const session = await DisplaySession.findByPk(id);
    if (!session) {
      return null;
    }

    return session.update(updateData);
  },
};

const displayStateAdapter = {
  async findByDeviceId(deviceId) {
    return DisplayState.findOne({ where: { deviceId } });
  },

  async create(stateData) {
    return DisplayState.create(stateData);
  },

  async updateByDeviceId(deviceId, updateData) {
    const state = await DisplayState.findOne({ where: { deviceId } });
    if (!state) {
      return null;
    }

    return state.update(updateData);
  },
};

module.exports = {
  user: userAdapter,
  family: familyAdapter,
  pinyinProgress: pinyinProgressAdapter,
  displayDevice: displayDeviceAdapter,
  displaySession: displaySessionAdapter,
  displayState: displayStateAdapter,
};
