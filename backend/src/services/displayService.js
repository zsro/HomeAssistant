const crypto = require('crypto');
const db = require('../models/dbAdapter');
const { ErrorCodes } = require('../utils/errorCodes');
const { serializeDisplayDevice, serializeDisplayState } = require('../utils/serializers');
const { createAppError } = require('../utils/appError');
const { generateDisplayToken, generatePairToken } = require('../middleware/displayAuth');
const {
  markDevicePresence,
  notifyDeviceStateChanged,
  notifySessionBound,
  notifySessionRefreshed,
} = require('./displaySocketService');

const DISPLAY_SCREEN_TYPES = ['home', 'pinyin', 'message', 'image'];
const PAIR_CODE_TTL_MS = 5 * 60 * 1000;
const OFFLINE_THRESHOLD_MS = 30 * 1000;

function buildExpiryDate(ttlMs = PAIR_CODE_TTL_MS) {
  return new Date(Date.now() + ttlMs);
}

function normalizeInstallationId(installationId) {
  const normalizedInstallationId = installationId?.trim();

  if (!normalizedInstallationId) {
    return null;
  }

  if (normalizedInstallationId.length < 16 || normalizedInstallationId.length > 64) {
    throw createAppError(400, ErrorCodes.PARAM_INVALID, '无效的展示端安装标识');
  }

  return normalizedInstallationId;
}

async function generateUniquePairCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const pairCode = String(crypto.randomInt(100000, 1000000));
    const existingSession = await db.displaySession.findByPairCode(pairCode);

    if (!existingSession) {
      return pairCode;
    }
  }

  throw createAppError(500, ErrorCodes.SYSTEM_ERROR, '生成配对码失败，请稍后重试');
}

function normalizeDeviceStatus(device) {
  if (!device?.lastSeenAt) {
    return 'offline';
  }

  return Date.now() - new Date(device.lastSeenAt).getTime() > OFFLINE_THRESHOLD_MS
    ? 'offline'
    : device.status;
}

function buildDefaultState(family, user) {
  return {
    screenType: 'home',
    payload: {
      title: family?.name || '家庭展示屏',
      subtitle: `${user.name} 已完成连接`,
      hint: '请在手机控制端切换要显示的内容',
    },
  };
}

async function getOwnedDevice(user, deviceId) {
  const device = await db.displayDevice.findById(deviceId);

  if (!device || device.familyId !== user.familyId) {
    throw createAppError(404, ErrorCodes.DISPLAY_DEVICE_NOT_FOUND);
  }

  return device;
}

async function getSessionState(session) {
  if (!session.deviceId) {
    return null;
  }

  const state = await db.displayState.findByDeviceId(session.deviceId);
  return serializeDisplayState(state);
}

async function createSession(payload = {}) {
  const installationId = normalizeInstallationId(payload.installationId);
  const pairCode = await generateUniquePairCode();
  const expiresAt = buildExpiryDate();
  const session = await db.displaySession.create({
    installationId,
    pairCode,
    pairToken: 'pending',
    expiresAt,
  });

  const pairToken = generatePairToken(session.id);
  await db.displaySession.update(session.id, { pairToken });

  return {
    data: {
      sessionId: session.id,
      pairCode,
      pairToken,
      expiresAt,
    },
    status: 201,
  };
}

async function getSession(auth) {
  const session = auth.session;
  const state = await getSessionState(session);

  const response = {
    sessionId: session.id,
    isBound: session.isBound,
    pairCode: session.pairCode,
    expiresAt: session.expiresAt,
  };

  if (session.isBound && session.deviceId) {
    const device = await db.displayDevice.findById(session.deviceId);
    response.device = serializeDisplayDevice(device, {
      currentScreenType: state?.screenType,
      includeCurrentScreenType: true,
    });
    response.state = state;
    response.displayToken = session.displayToken;
  }

  return {
    data: response,
  };
}

async function refreshSession(session) {
  if (session.isBound) {
    throw createAppError(400, ErrorCodes.DISPLAY_ALREADY_BOUND, '展示端已绑定，无法刷新配对码');
  }

  const pairCode = await generateUniquePairCode();
  const expiresAt = buildExpiryDate();
  await db.displaySession.update(session.id, {
    pairCode,
    expiresAt,
  });

  notifySessionRefreshed({
    sessionId: session.id,
    pairCode,
    expiresAt,
  });

  return {
    data: {
      sessionId: session.id,
      pairCode,
      expiresAt,
    },
    message: '配对码已刷新',
  };
}

async function pairDisplay(user, payload) {
  const pairCode = payload.pairCode?.trim();
  const deviceName = payload.deviceName?.trim() || '家庭展示屏';

  if (!user.familyId) {
    throw createAppError(400, ErrorCodes.FAMILY_NOT_FOUND, '请先加入家庭，再绑定展示端');
  }

  if (!pairCode) {
    throw createAppError(400, ErrorCodes.PARAM_MISSING, '请提供配对码');
  }

  const session = await db.displaySession.findByPairCode(pairCode);
  if (!session) {
    throw createAppError(404, ErrorCodes.DISPLAY_PAIR_CODE_INVALID);
  }

  if (session.expiresAt < new Date()) {
    throw createAppError(410, ErrorCodes.DISPLAY_PAIR_CODE_EXPIRED);
  }

  if (session.isBound) {
    throw createAppError(400, ErrorCodes.DISPLAY_ALREADY_BOUND);
  }

  const family = await db.family.findById(user.familyId);
  if (!family) {
    throw createAppError(404, ErrorCodes.FAMILY_NOT_FOUND);
  }

  const now = new Date();
  const installationId = normalizeInstallationId(session.installationId);
  const existingDevice = installationId
    ? await db.displayDevice.findByInstallationId(installationId)
    : null;

  let device = existingDevice;

  if (device) {
    device = await db.displayDevice.update(device.id, {
      familyId: family.id,
      name: deviceName,
      status: 'idle',
      lastSeenAt: now,
      installationId,
    });
  } else {
    device = await db.displayDevice.create({
      familyId: family.id,
      name: deviceName,
      installationId,
      status: 'idle',
      lastSeenAt: now,
      createdBy: user.id,
    });
  }

  const defaultState = buildDefaultState(family, user);
  const existingState = await db.displayState.findByDeviceId(device.id);
  let state = existingState;

  if (!state) {
    state = await db.displayState.create({
      deviceId: device.id,
      screenType: defaultState.screenType,
      payload: defaultState.payload,
      version: 1,
      updatedBy: user.id,
    });
  } else if (existingDevice && existingDevice.familyId !== family.id) {
    state = await db.displayState.updateByDeviceId(device.id, {
      screenType: defaultState.screenType,
      payload: defaultState.payload,
      version: existingState.version + 1,
      updatedBy: user.id,
    });
  }

  const displayToken = generateDisplayToken({
    sessionId: session.id,
    deviceId: device.id,
    familyId: family.id,
  });

  await db.displaySession.update(session.id, {
    deviceId: device.id,
    familyId: family.id,
    boundByUserId: user.id,
    isBound: true,
    displayToken,
    lastHeartbeatAt: now,
  });

  const serializedDevice = serializeDisplayDevice(device, {
    currentScreenType: state.screenType,
    includeCurrentScreenType: true,
  });
  const serializedState = serializeDisplayState(state);

  notifySessionBound({
    sessionId: session.id,
    device: serializedDevice,
    state: serializedState,
    displayToken,
    expiresAt: session.expiresAt,
  });
  notifyDeviceStateChanged({
    deviceId: device.id,
    familyId: family.id,
    state: serializedState,
  });

  return {
    data: {
      device: serializedDevice,
      state: serializedState,
    },
    message: '展示端绑定成功',
  };
}

async function getDevices(user) {
  if (!user.familyId) {
    return {
      data: {
        devices: [],
      },
    };
  }

  const devices = await db.displayDevice.findByFamily(user.familyId);
  const states = await Promise.all(devices.map((device) => db.displayState.findByDeviceId(device.id)));

  return {
    data: {
      devices: devices.map((device, index) => serializeDisplayDevice(
        {
          ...device.get({ plain: true }),
          status: normalizeDeviceStatus(device),
        },
        {
          currentScreenType: states[index]?.screenType,
          includeCurrentScreenType: true,
        }
      )),
    },
  };
}

async function getDeviceState(user, deviceId) {
  await getOwnedDevice(user, deviceId);
  const state = await db.displayState.findByDeviceId(deviceId);

  if (!state) {
    throw createAppError(404, ErrorCodes.DISPLAY_DEVICE_NOT_FOUND, '展示状态不存在');
  }

  return {
    data: serializeDisplayState(state),
  };
}

async function updateDeviceState(user, deviceId, payload) {
  const device = await getOwnedDevice(user, deviceId);
  const screenType = payload.screenType?.trim();
  const nextPayload = payload.payload && typeof payload.payload === 'object' ? payload.payload : null;

  if (!screenType || !DISPLAY_SCREEN_TYPES.includes(screenType)) {
    throw createAppError(400, ErrorCodes.PARAM_INVALID, '无效的展示类型');
  }

  if (!nextPayload) {
    throw createAppError(400, ErrorCodes.PARAM_INVALID, 'payload 必须是对象');
  }

  const existingState = await db.displayState.findByDeviceId(deviceId);

  if (!existingState) {
    const createdState = await db.displayState.create({
      deviceId,
      screenType,
      payload: nextPayload,
      version: 1,
      updatedBy: user.id,
    });

    await db.displayDevice.update(device.id, { status: 'active' });

    const serializedState = serializeDisplayState(createdState);
    notifyDeviceStateChanged({
      deviceId,
      familyId: device.familyId,
      state: serializedState,
    });

    return {
      data: serializedState,
      message: '展示内容已更新',
    };
  }

  const updatedState = await db.displayState.updateByDeviceId(deviceId, {
    screenType,
    payload: nextPayload,
    version: existingState.version + 1,
    updatedBy: user.id,
  });

  await db.displayDevice.update(device.id, { status: 'active' });

  const serializedState = serializeDisplayState(updatedState);
  notifyDeviceStateChanged({
    deviceId,
    familyId: device.familyId,
    state: serializedState,
  });

  return {
    data: serializedState,
    message: '展示内容已更新',
  };
}

async function heartbeat(session) {
  if (!session.isBound || !session.deviceId) {
    throw createAppError(400, ErrorCodes.DISPLAY_SESSION_NOT_FOUND, '展示端尚未绑定');
  }

  const now = new Date();
  await db.displaySession.update(session.id, {
    lastHeartbeatAt: now,
  });
  await db.displayDevice.update(session.deviceId, {
    lastSeenAt: now,
    status: 'active',
  });

  await markDevicePresence({
    deviceId: session.deviceId,
    sessionId: session.id,
    status: 'active',
  });

  return {
    message: '心跳已更新',
  };
}

async function getDisplayState(session) {
  if (!session.isBound || !session.deviceId) {
    throw createAppError(400, ErrorCodes.DISPLAY_SESSION_NOT_FOUND, '展示端尚未绑定');
  }

  const now = new Date();
  await db.displaySession.update(session.id, {
    lastHeartbeatAt: now,
  });
  await db.displayDevice.update(session.deviceId, {
    lastSeenAt: now,
  });

  const state = await db.displayState.findByDeviceId(session.deviceId);
  if (!state) {
    throw createAppError(404, ErrorCodes.DISPLAY_DEVICE_NOT_FOUND, '展示状态不存在');
  }

  return {
    data: serializeDisplayState(state),
  };
}

module.exports = {
  createSession,
  getDeviceState,
  getDevices,
  getDisplayState,
  getSession,
  heartbeat,
  pairDisplay,
  refreshSession,
  updateDeviceState,
};
