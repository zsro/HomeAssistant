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
  const summary = payload.summary || {};
  const selectedLesson = payload.selectedLesson || null;
  const lessons = Array.isArray(payload.lessons) ? payload.lessons : [];
  const selectedIndex = selectedLesson
    ? lessons.findIndex((lesson) => lesson.id === selectedLesson.id)
    : -1;
  const visibleLessons = selectedIndex >= 0
    ? lessons.slice(Math.max(0, selectedIndex - 2), Math.min(lessons.length, selectedIndex + 3))
    : [];

  if (!selectedLesson) {
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#fed7aa_34%,_#0f172a_96%)] px-6 py-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1800px] gap-6 xl:grid-cols-[0.8fr_1.05fr_0.95fr]">
        <section className="rounded-[40px] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">拼音同步展示</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-white">
            {payload.title || '拼音课程选择'}
          </h1>
          <p className="mt-4 text-xl leading-9 text-slate-200">
            {payload.subtitle || '控制端正在同步当前课程'}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] bg-white/10 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">整体进度</p>
              <p className="mt-3 text-5xl font-black text-white">{summary.completionRate || 0}%</p>
              <p className="mt-3 text-sm text-slate-300">
                已完成 {summary.completedLessons || 0} / {summary.totalLessons || 0}
              </p>
            </div>
            <div className="rounded-[28px] bg-white/10 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">当前课程</p>
              <p className="mt-3 text-3xl font-black text-white">
                Lesson {selectedLesson.order}
              </p>
              <p className="mt-3 text-sm text-slate-300">
                最近同步 {formatExpiry(payload.updatedAt)}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[30px] bg-white px-6 py-6 text-slate-900">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
              当前选中
            </p>
            <h2 className="mt-3 text-4xl font-black">{selectedLesson.title}</h2>
            <p className="mt-4 text-xl leading-9 text-slate-600">{selectedLesson.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(selectedLesson.focus || []).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-orange-50 px-4 py-2 text-base font-semibold text-orange-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[48px] border border-white/10 bg-white/80 p-8 text-slate-900 shadow-2xl shadow-orange-200/40">
          <div className="pointer-events-none absolute inset-x-8 top-8 h-28 rounded-t-[40px] bg-gradient-to-b from-white via-white/92 to-transparent" />
          <div className="pointer-events-none absolute inset-x-8 bottom-8 h-28 rounded-b-[40px] bg-gradient-to-t from-white via-white/92 to-transparent" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-[128px] -translate-y-1/2 rounded-[36px] border border-orange-200 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff)] shadow-[0_20px_50px_rgba(251,146,60,0.18)]" />

          <div className="relative z-10 flex h-full flex-col justify-center">
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
                课程选择同步中
              </p>
              <h2 className="mt-3 text-5xl font-black">滑动选课</h2>
            </div>

            <div className="space-y-5 px-6 py-16">
              {visibleLessons.map((lesson) => {
                const isCurrent = lesson.id === selectedLesson.id;
                const isCompleted = lesson.isCompleted;

                return (
                  <div
                    key={lesson.id}
                    className={`flex items-center justify-between rounded-[32px] px-6 py-5 transition ${
                      isCurrent
                        ? 'scale-[1.03] bg-slate-950 text-white shadow-xl shadow-slate-300'
                        : 'bg-white/70 text-slate-500'
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${isCurrent ? 'text-orange-200' : 'text-slate-400'}`}>
                        Lesson {lesson.order}
                      </p>
                      <p className="mt-2 text-3xl font-black">{lesson.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      {lesson.isRecommended && (
                        <span className={`rounded-full px-4 py-2 text-sm font-semibold ${isCurrent ? 'bg-white/15 text-white' : 'bg-orange-100 text-orange-700'}`}>
                          当前推荐
                        </span>
                      )}
                      <span className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        isCurrent
                          ? 'bg-white/15 text-white'
                          : isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isCompleted ? '已完成' : '待学习'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[40px] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="rounded-[32px] bg-white/8 p-6">
            <p className="text-sm uppercase tracking-[0.28em] text-amber-200">课堂提示</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white">
              {selectedLesson.stageTitle}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              预计 {selectedLesson.durationMinutes} 分钟，控制端滑动选课时，这里会实时跟着高亮。
            </p>
          </div>

          <div className="mt-6 rounded-[32px] bg-white p-6 text-slate-900">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">本课目标</p>
            <div className="mt-4 space-y-4">
              {(selectedLesson.goals || []).map((goal) => (
                <div key={goal} className="flex gap-4">
                  <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-orange-500" />
                  <p className="text-xl leading-9">{goal}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[32px] bg-white/8 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">练习句</p>
            <p className="mt-4 text-3xl font-black leading-tight text-white">
              {selectedLesson.practiceSentence}
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              {selectedLesson.miniTask}
            </p>
          </div>
        </section>
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
