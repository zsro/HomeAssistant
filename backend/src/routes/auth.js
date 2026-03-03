const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../models/dbAdapter');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { ErrorCodes, success, error } = require('../utils/errorCodes');

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role, familyCode } = req.body;

    // 验证必填字段
    if (!username || !password || !name || !role) {
      return res.status(400).json(error(ErrorCodes.PARAM_MISSING, '请填写所有必填字段：username, password, name, role'));
    }

    // 验证用户名格式（字母数字下划线，3-20位）
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json(error(ErrorCodes.USER_INVALID_USERNAME));
    }

    // 验证角色
    const validRoles = ['father', 'mother', 'child'];
    if (!validRoles.includes(role)) {
      return res.status(400).json(error(ErrorCodes.PARAM_INVALID, '无效的角色，可选：father, mother, child'));
    }

    // 检查用户名是否已存在
    const existingUser = await db.user.findByUsername(username);
    if (existingUser) {
      return res.status(409).json(error(ErrorCodes.USER_ALREADY_EXISTS));
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    let familyId = null;

    // 如果提供了家庭码，加入现有家庭
    let family = null;
    if (familyCode) {
      family = await db.family.findByCode(familyCode);
      if (!family) {
        return res.status(404).json(error(ErrorCodes.FAMILY_CODE_NOT_FOUND));
      }
      familyId = family.id;
    }

    // 创建用户
    const user = await db.user.create({
      username,
      password: hashedPassword,
      name,
      role,
      familyId,
    });

    // 如果没有提供家庭码，创建新家庭
    if (!familyCode) {
      family = await db.family.create({
        name: `${name}的家庭`,
        createdBy: user.id,
      });
      familyId = family.id;
      
      // 更新用户的 familyId
      await db.user.update(user.id, { familyId });
      user.familyId = familyId;
    }

    // 生成 token
    const token = generateToken(user);

    res.status(201).json(success({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        familyId: user.familyId,
      },
      family: family ? {
        id: family.id,
        code: family.code,
        name: family.name,
      } : null,
      token,
    }, familyCode ? '加入家庭成功' : '注册并创建家庭成功'));
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json(error(ErrorCodes.SYSTEM_ERROR, '注册失败，请稍后重试'));
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json(error(ErrorCodes.PARAM_MISSING, '请提供用户名和密码'));
    }

    // 查找用户
    const user = await db.user.findByUsername(username);
    if (!user) {
      return res.status(401).json(error(ErrorCodes.USER_PASSWORD_ERROR));
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json(error(ErrorCodes.USER_PASSWORD_ERROR));
    }

    // 生成 token
    const token = generateToken(user);

    // 获取家庭信息
    const family = user.familyId ? await db.family.findById(user.familyId) : null;

    res.json(success({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        familyId: user.familyId,
      },
      family: family ? {
        id: family.id,
        code: family.code,
        name: family.name,
      } : null,
      token,
    }, '登录成功'));
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json(error(ErrorCodes.SYSTEM_ERROR, '登录失败，请稍后重试'));
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const family = user.familyId ? await db.family.findById(user.familyId) : null;

    res.json(success({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        familyId: user.familyId,
      },
      family: family ? {
        id: family.id,
        code: family.code,
        name: family.name,
      } : null,
    }));
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json(error(ErrorCodes.SYSTEM_ERROR, '获取用户信息失败'));
  }
});

// 修改密码
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.user;

    if (!oldPassword || !newPassword) {
      return res.status(400).json(error(ErrorCodes.PARAM_MISSING, '请提供旧密码和新密码'));
    }

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json(error(ErrorCodes.USER_PASSWORD_ERROR, '旧密码错误'));
    }

    // 更新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update(user.id, { password: hashedNewPassword });

    res.json(success(null, '密码修改成功'));
  } catch (err) {
    console.error('修改密码失败:', err);
    res.status(500).json(error(ErrorCodes.SYSTEM_ERROR, '修改密码失败'));
  }
});

module.exports = router;
