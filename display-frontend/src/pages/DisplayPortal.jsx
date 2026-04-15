import { useEffect, useRef } from 'react';
import { useDisplayStore } from '../stores/displayStore';
import { createDisplaySocket } from '../utils/displaySocket';

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

function normalizeSymbol(value) {
  if (!value) {
    return '拼音';
  }

  return String(value).split(/[ /]/)[0];
}

function getLessonVisualMeta(lesson, currentStep) {
  const primary = normalizeSymbol(lesson?.focus?.[0]);
  const lowerTitle = `${lesson?.title || ''} ${currentStep?.title || ''}`;

  if (lowerTitle.includes('单韵母 a')) {
    return {
      symbol: 'a',
      motif: '金色铃铛 · 小公鸡 · 红色 a',
      skyClassName: 'from-amber-200 via-orange-100 to-rose-100',
      orbClassName: 'from-rose-500 via-orange-400 to-amber-300',
    };
  }

  if (lowerTitle.includes('单韵母 o')) {
    return {
      symbol: 'o',
      motif: '回音山谷 · 圆嘴口型 · 滑梯转盘',
      skyClassName: 'from-orange-200 via-amber-100 to-yellow-50',
      orbClassName: 'from-orange-500 via-amber-400 to-yellow-300',
    };
  }

  if (lowerTitle.includes('单韵母 e')) {
    return {
      symbol: 'e',
      motif: '大白鹅 · 水纹池塘 · 白羽毛',
      skyClassName: 'from-cyan-200 via-sky-100 to-emerald-50',
      orbClassName: 'from-cyan-500 via-sky-400 to-emerald-300',
    };
  }

  return {
    symbol: primary,
    motif: lesson?.lessonType || '拼音课堂',
    skyClassName: 'from-cyan-200 via-indigo-100 to-amber-50',
    orbClassName: 'from-sky-500 via-indigo-400 to-cyan-300',
  };
}

function DisplayLessonScene({ lesson, currentStep, currentStage }) {
  const visual = getLessonVisualMeta(lesson, currentStep);

  return (
    <div className={`relative overflow-hidden rounded-[42px] bg-gradient-to-br ${visual.skyClassName} px-8 py-8 text-slate-900 shadow-2xl shadow-orange-200/40`}>
      <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
      <div className="absolute -right-12 top-0 h-48 w-48 rounded-full bg-white/35 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
              {currentStage?.title || currentStep.stageTitle}
            </span>
            <h2 className="mt-4 text-5xl font-black leading-tight">{currentStep.title}</h2>
            <p className="mt-4 max-w-3xl text-xl leading-9 text-slate-700">
              {currentStep.tvScene}
            </p>
          </div>

          <div className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-[30px] bg-gradient-to-br ${visual.orbClassName} text-6xl font-black text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]`}>
            {visual.symbol}
          </div>
        </div>

        <div className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[36px] bg-white/75 p-6 shadow-lg shadow-white/50">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/85 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">课堂主视觉</p>
                <div className="mt-6 flex items-center justify-center rounded-[34px] bg-slate-950 px-6 py-10 text-white shadow-xl shadow-slate-300/30">
                  <div className="text-center">
                    <div className="text-[10rem] font-black leading-none tracking-[-0.08em]">
                      {visual.symbol}
                    </div>
                    <div className="mt-3 text-xl font-semibold text-cyan-100">{visual.motif}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] bg-amber-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">课堂反馈</p>
                <p className="mt-2 text-lg leading-8 text-slate-700">{currentStep.feedback}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-[32px] bg-slate-950 px-6 py-6 text-white shadow-xl shadow-slate-300/30">
              <p className="text-sm uppercase tracking-[0.22em] text-cyan-200">教师引导语</p>
              <p className="mt-4 text-2xl leading-10">{currentStep.teacherPrompt}</p>
            </div>

            <div className="rounded-[32px] bg-white/80 px-6 py-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">手机操作</p>
              <p className="mt-4 text-xl leading-9 text-slate-700">{currentStep.controllerScene}</p>
            </div>

            <div className="rounded-[32px] bg-white/80 px-6 py-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">交互内容</p>
              <p className="mt-4 text-xl leading-9 text-slate-700">{currentStep.interaction}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisplayPinyin({ payload }) {
  const summary = payload.summary || {};
  const lesson = payload.lesson || null;
  const stages = Array.isArray(payload.stages) ? payload.stages : [];
  const currentStage = payload.currentStage || null;
  const currentStep = payload.currentStep || null;

  if (!lesson || !currentStep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#fff7ed,_#fed7aa_45%,_#ffedd5)] px-6 text-slate-900">
        <div className="max-w-4xl rounded-[40px] bg-white/80 p-10 text-center shadow-2xl shadow-orange-200">
          <p className="text-sm uppercase tracking-[0.35em] text-orange-600">拼音互动课堂</p>
          <h1 className="mt-5 text-4xl font-black sm:text-5xl">{payload.title || '等待课程同步'}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            控制端选择课程并推进步骤后，这里会自动切换到对应的电视分镜。
          </p>
          <div className="mt-8 rounded-[28px] bg-slate-950 px-8 py-8 text-white">
            <div className="text-2xl font-black">准备开始今天的拼音课</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#fed7aa_22%,_#0f172a_88%)] px-6 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1800px] flex-col gap-6">
        <section className="rounded-[40px] border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">拼音互动课堂</p>
              <h1 className="mt-4 text-5xl font-black leading-tight text-white">
                Lesson {lesson.order} · {lesson.title}
              </h1>
              <p className="mt-4 text-xl leading-9 text-slate-200">{lesson.tagline}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {(lesson.focus || []).map((item) => (
                  <span key={item} className="rounded-full bg-white/10 px-4 py-2 text-base font-semibold text-cyan-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] bg-white/10 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">整体进度</p>
                <p className="mt-3 text-5xl font-black text-white">{summary.completionRate || 0}%</p>
                <p className="mt-3 text-sm text-slate-300">
                  已完成 {summary.completedLessons || 0} / {summary.totalLessons || 0}
                </p>
              </div>
              <div className="rounded-[28px] bg-white/10 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">当前步骤</p>
                <p className="mt-3 text-4xl font-black text-white">
                  {currentStep.stepIndex} / {currentStep.totalStepCount}
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  最近同步 {formatExpiry(payload.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-4">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className={`rounded-[28px] border px-5 py-4 ${
                  stage.isActive
                    ? 'border-amber-300 bg-amber-50 text-slate-900'
                    : stage.isCompleted
                      ? 'border-emerald-300 bg-emerald-50 text-slate-900'
                      : 'border-white/10 bg-white/6 text-white'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${stage.isActive || stage.isCompleted ? 'text-slate-500' : 'text-slate-400'}`}>
                  课堂板块
                </p>
                <p className="mt-2 text-xl font-black">{stage.title}</p>
                <p className={`mt-2 text-sm leading-6 ${stage.isActive || stage.isCompleted ? 'text-slate-600' : 'text-slate-300'}`}>
                  {stage.summary}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid flex-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DisplayLessonScene lesson={lesson} currentStep={currentStep} currentStage={currentStage} />

          <div className="rounded-[40px] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-slate-950/40">
            <div className="rounded-[28px] bg-white/8 p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-amber-200">课堂提示</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white">
                {lesson.stageTitle}
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                预计 {lesson.durationMinutes} 分钟，手机端按“上一步 / 下一步”推进，这里会同步切换课堂分镜。
              </p>
            </div>

            <div className="mt-6 rounded-[28px] bg-white p-5 text-slate-900">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">本课目标</p>
              <div className="mt-4 space-y-4">
                {(lesson.goals || []).map((goal) => (
                  <div key={goal} className="flex gap-3">
                    <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-orange-500" />
                    <p className="text-base leading-7">{goal}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-[28px] bg-white/8 p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400">当前高亮</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(currentStep.highlights || []).map((item) => (
                  <span key={item} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-[28px] bg-white/8 p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400">练习句</p>
              <p className="mt-4 text-2xl font-black leading-tight text-white">
                {lesson.practiceSentence}
              </p>
              <p className="mt-4 text-base leading-8 text-slate-300">
                {lesson.miniTask}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {(currentStep.resources || []).length > 0 ? currentStep.resources.map((resource) => (
                <div key={resource.label} className="rounded-[24px] bg-white/8 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{resource.label}</span>
                    <span className="rounded-full bg-amber-200/15 px-3 py-1 text-xs font-semibold text-amber-100">
                      待补充
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{resource.solution}</p>
                </div>
              )) : (
                <div className="rounded-[24px] bg-white/8 px-4 py-4 text-sm leading-7 text-slate-300">
                  当前步骤没有额外素材依赖，先用文案、色块和动效就能跑通课堂流程。
                </div>
              )}
            </div>
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

export default function DisplayPortal() {
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
    setSocketConnected,
    socketAuthReady,
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
