import { useEffect, useRef } from 'react';
import { useDisplayStore } from '../../stores/displayStore';
import { createDisplaySocket } from '../../utils/displaySocket';

function formatExpiry(expiresAt) {
  if (!expiresAt) {
    return '--';
  }

  return new Date(expiresAt).toLocaleTimeString();
}

function DisplayHome({ payload }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%,_#000000)] px-6 text-white">
      <div className="max-w-5xl text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-cyan-200">家庭展示屏</p>
        <h1 className="mt-6 text-5xl font-black leading-tight sm:text-7xl">{payload.title}</h1>
        <p className="mt-6 text-xl text-slate-200 sm:text-3xl">{payload.subtitle}</p>
        <p className="mt-8 text-base text-slate-400 sm:text-xl">{payload.hint}</p>
      </div>
    </div>
  );
}

function DisplayPinyin({ payload }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#fff7ed,_#fed7aa_45%,_#ffedd5)] px-6 text-slate-900">
      <div className="grid max-w-6xl gap-10 lg:grid-cols-[0.7fr_1.1fr] lg:items-center">
        <div className="rounded-[40px] bg-white/80 p-8 shadow-2xl shadow-orange-200">
          <p className="text-sm uppercase tracking-[0.35em] text-orange-600">拼音大字卡</p>
          <h1 className="mt-5 text-4xl font-black sm:text-5xl">{payload.title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">{payload.note}</p>
        </div>
        <div className="rounded-[56px] bg-slate-950 px-8 py-14 text-center text-white shadow-2xl shadow-slate-400/50">
          <div className="text-[5rem] font-black tracking-[0.15em] sm:text-[10rem]">{payload.focusText}</div>
        </div>
      </div>
    </div>
  );
}

function DisplayStarPrep({ payload }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_#0f766e,_#164e63_45%,_#082f49)] px-6 py-12 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[36px] bg-white/10 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-teal-100">星星预备班</p>
          <h1 className="mt-5 text-4xl font-black sm:text-5xl">{payload.title}</h1>
          <p className="mt-6 text-xl leading-9 text-teal-50">{payload.footer}</p>
        </div>
        <div className="rounded-[36px] bg-slate-950/65 p-8 shadow-2xl shadow-cyan-950/30">
          <p className="text-sm uppercase tracking-[0.35em] text-teal-200">今日安排</p>
          <div className="mt-6 whitespace-pre-line text-2xl leading-[1.9] text-white">
            {payload.schedule}
          </div>
        </div>
      </div>
    </div>
  );
}

function DisplayMessage({ payload }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#7f1d1d,_#991b1b_45%,_#450a0a)] px-6 text-white">
      <div className="max-w-5xl text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-rose-200">全屏提示</p>
        <h1 className="mt-8 text-6xl font-black leading-tight sm:text-8xl">{payload.title}</h1>
        <p className="mt-8 text-2xl leading-10 text-rose-100 sm:text-4xl">{payload.subtitle}</p>
      </div>
    </div>
  );
}

function DisplayImage({ payload }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#111827,_#1f2937_40%,_#020617)] px-6 py-8 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 lg:grid-cols-[0.5fr_1.5fr]">
        <div className="rounded-[36px] bg-white/10 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-300">图片展示</p>
          <h1 className="mt-5 text-4xl font-black">{payload.title}</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">{payload.caption}</p>
        </div>
        <div className="overflow-hidden rounded-[36px] bg-white/5 shadow-2xl shadow-slate-950/50">
          {payload.imageUrl ? (
            <img
              src={payload.imageUrl}
              alt={payload.title || '展示图片'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center text-center text-2xl text-slate-400">
              控制端尚未提供图片地址
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DisplayScreen({ state }) {
  switch (state?.screenType) {
    case 'pinyin':
      return <DisplayPinyin payload={state.payload || {}} />;
    case 'star_prep':
      return <DisplayStarPrep payload={state.payload || {}} />;
    case 'message':
      return <DisplayMessage payload={state.payload || {}} />;
    case 'image':
      return <DisplayImage payload={state.payload || {}} />;
    case 'home':
    default:
      return <DisplayHome payload={state?.payload || {}} />;
  }
}

function DisplayPortal() {
  const {
    device,
    pairCode,
    expiresAt,
    currentState,
    error,
    isBound,
    isLoading,
    pairToken,
    displayToken,
    socketAuthReady,
    initializeSession,
    applySocketSession,
    applySocketState,
    refreshPairCode,
    invalidateSocketAuth,
    restartSession,
    sendHeartbeat,
    setSocketConnected,
  } = useDisplayStore();
  const socketRef = useRef(null);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!displayToken) {
      return undefined;
    }

    sendHeartbeat();
    const heartbeatTimer = window.setInterval(() => {
      sendHeartbeat();
    }, 15000);

    return () => {
      window.clearInterval(heartbeatTimer);
    };
  }, [displayToken, sendHeartbeat]);

  useEffect(() => {
    if (!socketAuthReady) {
      return undefined;
    }

    const socketToken = displayToken || pairToken;
    if (!socketToken) {
      return undefined;
    }

    let isDisposed = false;
    let reconnectTimer = null;

    const connect = () => {
      const socket = createDisplaySocket({
        token: socketToken,
        role: 'display',
        onOpen: () => {
          setSocketConnected(true);
        },
        onClose: (event) => {
          setSocketConnected(false);
          if (event.code === 4001) {
            invalidateSocketAuth();
            return;
          }
          if (!isDisposed) {
            reconnectTimer = window.setTimeout(connect, 1500);
          }
        },
        onError: () => {
          setSocketConnected(false);
        },
        onMessage: (message) => {
          if (message.type === 'session_bound') {
            applySocketSession(message.data);
            if (message.data.state) {
              applySocketState(message.data.state);
            }
          }

          if (message.type === 'session_refreshed') {
            applySocketSession(message.data);
          }

          if (message.type === 'display_state') {
            applySocketState(message.data);
          }
        },
      });

      socketRef.current = socket;
    };

    connect();

    return () => {
      isDisposed = true;
      setSocketConnected(false);
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [
    applySocketSession,
    applySocketState,
    displayToken,
    invalidateSocketAuth,
    pairToken,
    socketAuthReady,
    setSocketConnected,
  ]);

  if (isBound && currentState) {
    return <DisplayScreen state={currentState} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_60%,_#000000)] px-6 py-10 text-white">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[40px] border border-white/10 bg-white/6 p-10 shadow-2xl shadow-slate-950/60 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">展示端</p>
          <h1 className="mt-6 text-5xl font-black leading-tight sm:text-6xl">
            {isLoading ? '正在初始化展示屏...' : '等待控制端绑定'}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            在电视或投影上保持这个页面打开，然后到手机控制端登录，输入下面的 6 位配对码。绑定成功后，这个页面会自动切换到正式展示内容。
          </p>

          {error && (
            <div className="mt-6 rounded-3xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-rose-100">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={refreshPairCode}
              className="rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              刷新配对码
            </button>
            <button
              type="button"
              onClick={restartSession}
              className="rounded-2xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              重置展示端
            </button>
          </div>
        </section>

        <section className="rounded-[40px] bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">配对信息</p>
          <div className="mt-6 rounded-[36px] bg-slate-950 px-6 py-8 text-center text-white">
            <p className="text-sm tracking-[0.25em] text-slate-400">配对码</p>
            <div className="mt-4 text-5xl font-black tracking-[0.35em] sm:text-6xl">
              {pairCode || '------'}
            </div>
            <p className="mt-4 text-sm text-slate-400">
              有效期至 {formatExpiry(expiresAt)}
            </p>
          </div>

          <div className="mt-6 grid gap-4 rounded-[32px] bg-slate-50 p-5">
            <div>
              <p className="text-sm text-slate-500">展示端入口</p>
              <p className="mt-2 font-mono text-sm text-slate-900">/display</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">控制端入口</p>
              <p className="mt-2 font-mono text-sm text-slate-900">/control/login</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">当前设备</p>
              <p className="mt-2 text-sm text-slate-900">{device?.name || '尚未命名'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DisplayPortal;
