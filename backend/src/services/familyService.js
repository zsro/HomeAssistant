const db = require('../models/dbAdapter');
const { ErrorCodes } = require('../utils/errorCodes');
const { serializeFamily, serializeMember } = require('../utils/serializers');
const { createAppError } = require('../utils/appError');

function serializeFamilyMembers(members) {
  return members.map(serializeMember);
}

async function getFamily(user) {
  if (!user.familyId) {
    throw createAppError(404, ErrorCodes.FAMILY_NOT_FOUND, '您还没有加入家庭');
  }

  const family = await db.family.findById(user.familyId);
  if (!family) {
    throw createAppError(404, ErrorCodes.FAMILY_NOT_FOUND);
  }

  const members = await db.family.getMembers(family.id);

  return {
    data: {
      family: serializeFamily(family, { includeCreatedAt: true }),
      members: serializeFamilyMembers(members),
    },
  };
}

async function getMembers(user) {
  if (!user.familyId) {
    return {
      data: { members: [] },
    };
  }

  const family = await db.family.findById(user.familyId);
  if (!family) {
    return {
      data: { members: [] },
    };
  }

  const members = await db.family.getMembers(family.id);
  return {
    data: { members: serializeFamilyMembers(members) },
  };
}

async function updateFamily(user, payload) {
  const name = payload.name?.trim();

  if (!user.familyId) {
    throw createAppError(404, ErrorCodes.FAMILY_NOT_FOUND, '您还没有加入家庭');
  }

  const family = await db.family.findById(user.familyId);
  if (!family) {
    throw createAppError(404, ErrorCodes.FAMILY_NOT_FOUND);
  }

  if (family.createdBy !== user.id) {
    throw createAppError(403, ErrorCodes.AUTH_FORBIDDEN, '只有家庭创建者可以修改家庭信息');
  }

  if (name) {
    await db.family.update(family.id, { name });
    family.name = name;
  }

  return {
    data: {
      family: serializeFamily(family),
    },
    message: '家庭信息更新成功',
  };
}

async function joinFamily(user, payload) {
  const familyCode = payload.familyCode?.trim().toUpperCase();

  if (!familyCode) {
    throw createAppError(400, ErrorCodes.PARAM_MISSING, '请提供家庭码');
  }

  const family = await db.family.findByCode(familyCode);
  if (!family) {
    throw createAppError(404, ErrorCodes.FAMILY_CODE_NOT_FOUND);
  }

  if (user.familyId === family.id) {
    throw createAppError(400, ErrorCodes.FAMILY_MEMBER_EXISTS, '您已经在该家庭中');
  }

  if (user.familyId) {
    await db.user.update(user.id, { familyId: null });
  }

  await db.user.update(user.id, { familyId: family.id });
  user.familyId = family.id;

  const members = await db.family.getMembers(family.id);

  return {
    data: {
      family: serializeFamily(family),
      members: serializeFamilyMembers(members),
    },
    message: '加入家庭成功',
  };
}

async function leaveFamily(user) {
  if (!user.familyId) {
    throw createAppError(400, ErrorCodes.FAMILY_NOT_FOUND, '您不在任何家庭中');
  }

  const family = await db.family.findById(user.familyId);
  if (family && family.createdBy === user.id) {
    throw createAppError(400, ErrorCodes.FAMILY_LEAVE_FAILED, '家庭创建者不能离开家庭，请先转让家庭或删除家庭');
  }

  await db.user.update(user.id, { familyId: null });
  user.familyId = null;

  return {
    message: '已离开家庭',
  };
}

async function createFamily(user, payload) {
  const name = payload.name?.trim();

  if (user.familyId) {
    const oldFamily = await db.family.findById(user.familyId);
    if (oldFamily && oldFamily.createdBy === user.id) {
      throw createAppError(400, ErrorCodes.FAMILY_CREATE_FAILED, '您已创建家庭，无法创建新家庭。请先删除原家庭或转让家庭。');
    }
  }

  const family = await db.family.create({
    name: name || `${user.name}的家庭`,
    createdBy: user.id,
  });

  await db.user.update(user.id, { familyId: family.id });
  user.familyId = family.id;

  return {
    data: {
      family: serializeFamily(family),
      members: [serializeMember(user)],
    },
    message: '创建家庭成功',
    status: 201,
  };
}

module.exports = {
  createFamily,
  getFamily,
  getMembers,
  joinFamily,
  leaveFamily,
  updateFamily,
};
