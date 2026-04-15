function getDisplaySocketHost() {
  if (import.meta.env.PROD) {
    return window.location.host;
  }

  return 'localhost:3001';
}

export function createDisplaySocket({ token, role, onMessage, onOpen, onClose, onError }) {
  if (!token || !role) {
    return null;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = new URL(`${protocol}://${getDisplaySocketHost()}/ws/display`);
  url.searchParams.set('token', token);
  url.searchParams.set('role', role);

  const socket = new WebSocket(url.toString());

  if (onOpen) {
    socket.addEventListener('open', onOpen);
  }

  socket.addEventListener('message', (event) => {
    if (!onMessage) {
      return;
    }

    try {
      const payload = JSON.parse(event.data);
      onMessage(payload);
    } catch {
      // Ignore malformed messages.
    }
  });

  if (onClose) {
    socket.addEventListener('close', onClose);
  }

  if (onError) {
    socket.addEventListener('error', onError);
  }

  return socket;
}
