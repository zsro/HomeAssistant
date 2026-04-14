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

function serializeDisplayDevice(device, options = {}) {
  if (!device) {
    return null;
  }

  const serialized = {
    id: device.id,
    familyId: device.familyId,
    name: device.name,
    status: device.status,
    lastSeenAt: device.lastSeenAt,
  };

  if (options.includeCreatedAt) {
    serialized.createdAt = device.createdAt;
  }

  if (options.includeCurrentScreenType) {
    serialized.currentScreenType = options.currentScreenType || null;
  }

  return serialized;
}

function serializeDisplayState(state) {
  if (!state) {
    return null;
  }

  return {
    deviceId: state.deviceId,
    screenType: state.screenType,
    payload: state.payload || {},
    version: state.version,
    updatedAt: state.updatedAt,
  };
}

module.exports = {
  serializeCheckin,
  serializeDisplayDevice,
  serializeDisplayState,
  serializeFamily,
  serializeMember,
  serializeTemplateSummary,
  serializeUser,
};
