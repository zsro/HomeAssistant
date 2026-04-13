const bcrypt = require('bcryptjs');
const db = require('../models/dbAdapter');
const { generateToken } = require('../middleware/auth');
const { ErrorCodes } = require('../utils/errorCodes');
const { serializeFamily, serializeUser } = require('../utils/serializers');
const { createAppError } = require('../utils/appError');

function buildAuthPayload(user, family, token) {
  return {
    user: serializeUser(user),
    family: serializeFamily(family),
    token,
  };
}

async function registerUser(payload) {
  const {
    username,
    password,
    name,
    role,
    familyCode,
  } = payload;

  const normalizedUsername = username?.trim();
  const normalizedName = name?.trim();
  const normalizedFamilyCode = familyCode?.trim().toUpperCase();

  if (!normalizedUsername || !password || !normalizedName || !role) {
    throw createAppError(400, ErrorCodes.PARAM_MISSING, '请填写所有必填字段：username, password, name, role');
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(normalizedUsername)) {
    throw createAppError(400, ErrorCodes.USER_INVALID_USERNAME);
  }

  if (password.length < 6) {
    throw createAppError(400, ErrorCodes.USER_INVALID_PASSWORD, '密码长度至少为 6 位');
  }

  const validRoles = ['father', 'mother', 'child'];
  if (!validRoles.includes(role)) {
    throw createAppError(400, ErrorCodes.PARAM_INVALID, '无效的角色，可选：father, mother, child');
  }

  const existingUser = await db.user.findByUsername(normalizedUsername);
  if (existingUser) {
    throw createAppError(409, ErrorCodes.USER_ALREADY_EXISTS);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  let familyId = null;
  let family = null;

  if (normalizedFamilyCode) {
    family = await db.family.findByCode(normalizedFamilyCode);
    if (!family) {
      throw createAppError(404, ErrorCodes.FAMILY_CODE_NOT_FOUND);
    }
    familyId = family.id;
  }

  const user = await db.user.create({
    username: normalizedUsername,
    password: hashedPassword,
    name: normalizedName,
    role,
    familyId,
  });

  if (!normalizedFamilyCode) {
    family = await db.family.create({
      name: `${normalizedName}的家庭`,
      createdBy: user.id,
    });
    familyId = family.id;
    await db.user.update(user.id, { familyId });
    user.familyId = familyId;
  }

  const token = generateToken(user);

  return {
    data: buildAuthPayload(user, family, token),
    message: normalizedFamilyCode ? '加入家庭成功' : '注册并创建家庭成功',
    status: 201,
  };
}

async function loginUser(payload) {
  const { username, password } = payload;
  const normalizedUsername = username?.trim();

  if (!normalizedUsername || !password) {
    throw createAppError(400, ErrorCodes.PARAM_MISSING, '请提供用户名和密码');
  }

  const user = await db.user.findByUsername(normalizedUsername);
  if (!user) {
    throw createAppError(401, ErrorCodes.USER_PASSWORD_ERROR);
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createAppError(401, ErrorCodes.USER_PASSWORD_ERROR);
  }

  const token = generateToken(user);
  const family = user.familyId ? await db.family.findById(user.familyId) : null;

  return {
    data: buildAuthPayload(user, family, token),
    message: '登录成功',
  };
}

async function getCurrentUser(user) {
  const family = user.familyId ? await db.family.findById(user.familyId) : null;

  return {
    data: {
      user: serializeUser(user),
      family: serializeFamily(family),
    },
  };
}

async function changePassword(user, payload) {
  const { oldPassword, newPassword } = payload;

  if (!oldPassword || !newPassword) {
    throw createAppError(400, ErrorCodes.PARAM_MISSING, '请提供旧密码和新密码');
  }

  const isValidPassword = await bcrypt.compare(oldPassword, user.password);
  if (!isValidPassword) {
    throw createAppError(401, ErrorCodes.USER_PASSWORD_ERROR, '旧密码错误');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await db.user.update(user.id, { password: hashedNewPassword });

  return {
    message: '密码修改成功',
  };
}

module.exports = {
  changePassword,
  getCurrentUser,
  loginUser,
  registerUser,
};
