const express = require('express');
const router = express.Router();
const db = require('../models/dbAdapter');
const { authenticateToken } = require('../middleware/auth');
const { ErrorCodes, success, error } = require('../utils/errorCodes');

// 获取当前用户家庭信息
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.familyId) {
      return res.status(404).json(error(ErrorCodes.FAMILY_NOT_FOUND, '您还没有加入家庭'));
    }

    const family = await db.family.findById(user.familyId);
    if (!family) {
      return res.status(404).json(error(ErrorCodes.FAMILY_NOT_FOUND));
    }

    // 获取成员详细信息
    const members = await db.family.getMembers(family.id);
    const memberList = members.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      avatar: member.avatar,
    }));

    res.json(success({
      family: {
        id: family.id,
        code: family.code,
        name: family.name,
        createdAt: family.createdAt,
      },
      members: memberList,
    }));
  } catch (err) {
    console.error('获取家庭信息失败:', err);
    res.status(500).json(error(ErrorCodes.SYSTEM_ERROR, '获取家庭信息失败'));
  }
});

// 获取家庭成员
router.get('/members', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.familyId) {
      return res.json(success({ members: [] }));
    }

    const family = await db.family.findById(user.familyId);
    if (!family) {
      return res.json(success({ members: [] }));
    }

    const members = await db.family.getMembers(family.id);
    const memberList = members.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      avatar: member.avatar,
    }));

    res.json(success({ members: memberList }));
  } catch (err) {
    console.error('获取家庭成员失败:', err);
    res.status(500).json(error(ErrorCodes.SYSTEM_ERROR, '获取家庭成员失败'));
  }
});

// 更新家庭信息
router.put('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { name } = req.body;

    if (!user.familyId) {
      return res.status(404).json(error(ErrorCodes.FAMILY_NOT_FOUND, '您还没有加入家庭'));
    }

    const family = await db.family.findById(user.familyId);
    if (!family) {
      return res.status(404).json(error(ErrorCodes.FAMILY_NOT_FOUND));
    }

    // 只有家庭创建者可以修改
    if (family.createdBy !== user.id) {
      return res.status(403).json(error(ErrorCodes.AUTH_FORBIDDEN, '只有家庭创建者可以修改家庭信息'));
    }

    if (name) {
      await db.family.update(family.id, { name });
      family.name = name;
    }

    res.json(success({
      family: {
        id: family.id,
        code: family.code,
        name: family.name,
      },
    }, '家庭信息更新成功'));
  } catch (err) {
    console.error('更新家庭信息失败:', err);
    res.status(500).json(error(ErrorCodes.SYSTEM_ERROR, '更新家庭信息失败'));
  }
});

// 通过家庭码加入家庭
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { familyCode } = req.body;

    if (!familyCode) {
      return res.status(400).json(error(ErrorCodes.PARAM_MISSING, '请提供家庭码'));
    }

    const family = await db.family.findByCode(familyCode);
    if (!family) {
      return res.status(404).json(error(ErrorCodes.FAMILY_CODE_NOT_FOUND));
    }

    // 检查是否已在家庭中
    if (user.familyId === family.id) {
      return res.status(400).json(error(ErrorCodes.FAMILY_MEMBER_EXISTS, '您已经在该家庭中'));
    }

    // 如果用户已有家庭，先从原家庭移除
    if (user.familyId) {
      await db.user.update(user.id, { familyId: null });
    }

    // 加入新家庭
    await db.user.update(user.id, { familyId: family.id });

    // 获取更新后的成员列表
    const members = await db.family.getMembers(family.id);
    const memberList = members.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      avatar: member.avatar,
    }));

    res.json(success({
      family: {
        id: family.id,
        code: family.code,
        name: family.name,
      },
      members: memberList,
    }, '加入家庭成功'));
  } catch (err) {
    console.error('加入家庭失败:', err);
    res.status(500).json(error(ErrorCodes.FAMILY_JOIN_FAILED));
  }
});

// 离开家庭
router.post('/leave', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user.familyId) {
      return res.status(400).json(error(ErrorCodes.FAMILY_NOT_FOUND, '您不在任何家庭中'));
    }

    const family = await db.family.findById(user.familyId);
    if (family) {
      // 如果是创建者离开，不允许（或者可以转让）
      if (family.createdBy === user.id) {
        return res.status(400).json(error(ErrorCodes.FAMILY_LEAVE_FAILED, '家庭创建者不能离开家庭，请先转让家庭或删除家庭'));
      }
    }

    await db.user.update(user.id, { familyId: null });

    res.json(success(null, '已离开家庭'));
  } catch (err) {
    console.error('离开家庭失败:', err);
    res.status(500).json(error(ErrorCodes.FAMILY_LEAVE_FAILED));
  }
});

// 创建新家庭（已有家庭的用户可以创建新家庭）
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { name } = req.body;

    // 如果用户已有家庭，先从原家庭移除
    if (user.familyId) {
      const oldFamily = await db.family.findById(user.familyId);
      if (oldFamily && oldFamily.createdBy === user.id) {
        // 如果是创建者，需要特殊处理（这里简化处理，实际应该删除家庭相关数据）
        return res.status(400).json(error(ErrorCodes.FAMILY_CREATE_FAILED, '您已创建家庭，无法创建新家庭。请先删除原家庭或转让家庭。'));
      }
    }

    // 创建新家庭
    const family = await db.family.create({
      name: name || `${user.name}的家庭`,
      createdBy: user.id,
    });

    await db.user.update(user.id, { familyId: family.id });

    res.status(201).json(success({
      family: {
        id: family.id,
        code: family.code,
        name: family.name,
      },
      members: [{
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      }],
    }, '创建家庭成功'));
  } catch (err) {
    console.error('创建家庭失败:', err);
    res.status(500).json(error(ErrorCodes.FAMILY_CREATE_FAILED));
  }
});

module.exports = router;
