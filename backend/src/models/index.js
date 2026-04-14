const { User, Family, Template, Checkin, PinyinProgress, sequelize, syncDatabase } = require('./database');

function generateFamilyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

module.exports = {
  User,
  Family,
  Template,
  Checkin,
  PinyinProgress,
  sequelize,
  syncDatabase,
  generateFamilyCode,
};
