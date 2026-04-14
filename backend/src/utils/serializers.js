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
  serializeDisplayDevice,
  serializeDisplayState,
  serializeFamily,
  serializeMember,
  serializeUser,
};
