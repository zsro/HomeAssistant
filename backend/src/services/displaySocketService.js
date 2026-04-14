const { WebSocketServer, WebSocket } = require('ws');
const db = require('../models/dbAdapter');
const { getUserFromToken } = require('../middleware/auth');
const { getDisplayAuthFromToken } = require('../middleware/displayAuth');

const DISPLAY_SOCKET_PATH = '/ws/display';
const SOCKET_CLOSE_CODE = 4001;

const socketState = {
  wss: null,
  familyControlSockets: new Map(),
  sessionDisplaySockets: new Map(),
  deviceDisplaySockets: new Map(),
};

function addSocket(map, key, socket) {
  if (!key) {
    return;
  }

  const sockets = map.get(key) || new Set();
  sockets.add(socket);
  map.set(key, sockets);
}

function removeSocket(map, key, socket) {
  if (!key) {
    return;
  }

  const sockets = map.get(key);
  if (!sockets) {
    return;
  }

  sockets.delete(socket);
  if (sockets.size === 0) {
    map.delete(key);
  }
}

function sendJson(socket, payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function broadcast(map, key, payload) {
  const sockets = map.get(key);
  if (!sockets) {
    return;
  }

  for (const socket of sockets) {
    sendJson(socket, payload);
  }
}

async function markDevicePresence({ deviceId, sessionId, status }) {
  if (!deviceId) {
    return null;
  }

  const now = new Date();

  await Promise.all([
    db.displayDevice.update(deviceId, {
      status,
      lastSeenAt: now,
    }),
    sessionId
      ? db.displaySession.update(sessionId, { lastHeartbeatAt: now })
      : Promise.resolve(),
  ]);

  const device = await db.displayDevice.findById(deviceId);
  if (!device) {
    return null;
  }

  const presence = {
    deviceId,
    familyId: device.familyId,
    status,
    lastSeenAt: now.toISOString(),
  };

  broadcast(socketState.familyControlSockets, device.familyId, {
    type: 'device_presence',
    data: presence,
  });

  return presence;
}

async function attachControlSocket(socket, token) {
  const { user } = await getUserFromToken(token);

  socket.meta = {
    kind: 'control',
    familyId: user.familyId,
    userId: user.id,
  };

  addSocket(socketState.familyControlSockets, user.familyId, socket);
  sendJson(socket, {
    type: 'socket_ready',
    data: {
      role: 'control',
      familyId: user.familyId,
    },
  });
}

async function attachDisplaySocket(socket, token) {
  const { decoded, session } = await getDisplayAuthFromToken(token, { allowPairToken: true });

  socket.meta = {
    kind: 'display',
    tokenType: decoded.type,
    sessionId: session.id,
    deviceId: session.deviceId,
    familyId: session.familyId,
  };

  addSocket(socketState.sessionDisplaySockets, session.id, socket);

  if (decoded.type === 'display' && session.deviceId) {
    addSocket(socketState.deviceDisplaySockets, session.deviceId, socket);
    await markDevicePresence({
      deviceId: session.deviceId,
      sessionId: session.id,
      status: 'active',
    });
  }

  sendJson(socket, {
    type: 'socket_ready',
    data: {
      role: 'display',
      sessionId: session.id,
      deviceId: session.deviceId,
      isBound: session.isBound,
    },
  });
}

async function handleDisplayMessage(socket, rawMessage) {
  let message = null;

  try {
    message = JSON.parse(rawMessage.toString());
  } catch {
    return;
  }

  if (message.type === 'heartbeat' && socket.meta?.deviceId) {
    await markDevicePresence({
      deviceId: socket.meta.deviceId,
      sessionId: socket.meta.sessionId,
      status: 'active',
    });
  }
}

function handleSocketClose(socket) {
  if (!socket.meta) {
    return;
  }

  if (socket.meta.kind === 'control') {
    removeSocket(socketState.familyControlSockets, socket.meta.familyId, socket);
    return;
  }

  removeSocket(socketState.sessionDisplaySockets, socket.meta.sessionId, socket);
  removeSocket(socketState.deviceDisplaySockets, socket.meta.deviceId, socket);

  const remainingSockets = socket.meta.deviceId
    ? socketState.deviceDisplaySockets.get(socket.meta.deviceId)
    : null;

  if (!remainingSockets || remainingSockets.size === 0) {
    markDevicePresence({
      deviceId: socket.meta.deviceId,
      sessionId: socket.meta.sessionId,
      status: 'offline',
    }).catch((error) => {
      console.error('更新展示端离线状态失败:', error);
    });
  }
}

function initDisplaySocketServer(server) {
  if (socketState.wss) {
    return socketState.wss;
  }

  const wss = new WebSocketServer({
    server,
    path: DISPLAY_SOCKET_PATH,
  });

  wss.on('connection', async (socket, request) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const token = requestUrl.searchParams.get('token');
    const role = requestUrl.searchParams.get('role');

    if (!token || !role) {
      socket.close(SOCKET_CLOSE_CODE, 'Missing socket auth');
      return;
    }

    try {
      if (role === 'control') {
        await attachControlSocket(socket, token);
      } else if (role === 'display') {
        await attachDisplaySocket(socket, token);
      } else {
        socket.close(SOCKET_CLOSE_CODE, 'Unsupported socket role');
        return;
      }
    } catch (error) {
      socket.close(SOCKET_CLOSE_CODE, 'Socket auth failed');
      return;
    }

    socket.on('message', (message) => {
      if (socket.meta?.kind === 'display') {
        handleDisplayMessage(socket, message).catch((error) => {
          console.error('处理展示端 WebSocket 消息失败:', error);
        });
      }
    });

    socket.on('close', () => {
      handleSocketClose(socket);
    });
  });

  socketState.wss = wss;
  return wss;
}

function notifySessionBound({ sessionId, device, state, displayToken, expiresAt }) {
  broadcast(socketState.sessionDisplaySockets, sessionId, {
    type: 'session_bound',
    data: {
      sessionId,
      isBound: true,
      device,
      state,
      displayToken,
      expiresAt,
    },
  });
}

function notifySessionRefreshed({ sessionId, pairCode, expiresAt }) {
  broadcast(socketState.sessionDisplaySockets, sessionId, {
    type: 'session_refreshed',
    data: {
      sessionId,
      pairCode,
      expiresAt,
    },
  });
}

function notifyDeviceStateChanged({ deviceId, familyId, state }) {
  broadcast(socketState.deviceDisplaySockets, deviceId, {
    type: 'display_state',
    data: state,
  });

  broadcast(socketState.familyControlSockets, familyId, {
    type: 'device_state',
    data: {
      deviceId,
      familyId,
      state,
    },
  });
}

module.exports = {
  DISPLAY_SOCKET_PATH,
  initDisplaySocketServer,
  markDevicePresence,
  notifyDeviceStateChanged,
  notifySessionBound,
  notifySessionRefreshed,
};
