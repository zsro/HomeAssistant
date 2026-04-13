function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    familyId: user.familyId,
    avatar: user.avatar || null,
  };
}

function serializeFamily(family, options = {}) {
  if (!family) {
    return null;
  }

  const serialized = {
    id: family.id,
    code: family.code,
    name: family.name,
  };

  if (options.includeCreatedAt) {
    serialized.createdAt = family.createdAt;
  }

  return serialized;
}

function serializeMember(member) {
  if (!member) {
    return null;
  }

  return {
    id: member.id,
    name: member.name,
    role: member.role,
    avatar: member.avatar || null,
  };
}

function serializeTemplateSummary(template) {
  if (!template) {
    return null;
  }

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    weekStart: template.weekStart,
    isActive: template.isActive,
    createdAt: template.createdAt,
  };
}

function serializeCheckin(checkin, user) {
  if (!checkin) {
    return null;
  }

  return {
    id: checkin.id,
    userId: checkin.userId,
    userName: user?.name || '未知用户',
    userRole: user?.role || 'unknown',
    templateId: checkin.templateId,
    activityId: checkin.activityId,
    date: checkin.date,
    createdAt: checkin.createdAt,
  };
}

module.exports = {
  serializeCheckin,
  serializeFamily,
  serializeMember,
  serializeTemplateSummary,
  serializeUser,
};
