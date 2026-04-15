import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { displayApi, pinyinApi } from '../api/config';
import { useAuthStore } from '../stores/authStore';
import { getAuthToken } from '../utils/authToken';
import { createDisplaySocket } from '../utils/displaySocket';

const ROLE_LABELS = {
  father: '爸爸',
  mother: '妈妈',
  child: '孩子',
};

const SCREEN_TYPE_LABELS = {
  home: '家庭欢迎页',
  pinyin: '拼音展示',
  message: '全屏消息',
  image: '图片展示',
};

const SUBJECT_OPTIONS = [
  {
    key: 'pinyin',
    title: '拼音',
    description: '已经接入完整课程和学习进度，可直接开始。',
    cta: '进入拼音学习',
    to: '/pinyin',
    accent: 'from-[#ffedd5] to-[#fff7ed]',
    border: 'border-orange-200',
    badge: '已上线',
    badgeClassName: 'bg-orange-100 text-orange-700',
  },
  {
    key: 'math',
    title: '数学',
    description: '口算、数感和图形认知会放在这里。',
    cta: '即将开放',
    accent: 'from-[#eef2ff] to-[#f8fafc]',
    border: 'border-indigo-200',
    badge: '筹备中',
    badgeClassName: 'bg-indigo-100 text-indigo-700',
  },
  {
    key: 'english',
    title: '英语',
    description: '字母启蒙、自然拼读和简单对话后续接入。',
    cta: '即将开放',
    accent: 'from-[#ecfeff] to-[#f8fafc]',
    border: 'border-cyan-200',
    badge: '筹备中',
    badgeClassName: 'bg-cyan-100 text-cyan-700',
  },
];

const GAME_OPTIONS = [
  {
    title: '图形配对',
    description: '训练观察和快速匹配能力。',
  },
  {
    title: '记忆翻翻卡',
    description: '适合短时专注训练和家庭互动。',
  },
  {
    title: '数字迷宫',
    description: '边走边认数字，偏轻量益智方向。',
  },
];

const TOOL_OPTIONS = [
  {
    title: '家庭备忘录',
    description: '放家庭事项和临时提醒。',
  },
  {
    title: '天气',
    description: '提供出门前的天气和穿衣提示。',
  },
  {
    title: '健康提醒',
    description: '喝水、休息和作息提醒集中在这里。',
  },
];

function DisplayIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v8.5A1.75 1.75 0 0 1 18.25 17H5.75A1.75 1.75 0 0 1 4 15.25v-8.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19h6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v2" />
    </svg>
  );
}

function SettingsIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1 1 0 0 1 1.35-.936l.515.214a1 1 0 0 0 .771 0l.515-.214a1 1 0 0 1 1.35.936l.061.555a1 1 0 0 0 .52.772l.49.274a1 1 0 0 1 .364 1.363l-.281.486a1 1 0 0 0 0 .772l.281.486a1 1 0 0 1-.364 1.363l-.49.274a1 1 0 0 0-.52.772l-.061.555a1 1 0 0 1-1.35.936l-.515-.214a1 1 0 0 0-.771 0l-.515.214a1 1 0 0 1-1.35-.936l-.061-.555a1 1 0 0 0-.52-.772l-.49-.274a1 1 0 0 1-.364-1.363l.281-.486a1 1 0 0 0 0-.772l-.281-.486a1 1 0 0 1 .364-1.363l.49-.274a1 1 0 0 0 .52-.772l.061-.555Z" />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  );
}

function FamilyIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 11Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 18.5c0-2.347 1.902-4.25 4.25-4.25h.5c2.348 0 4.25 1.903 4.25 4.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 18.5c0-1.795 1.455-3.25 3.25-3.25h.25c1.795 0 3.25 1.455 3.25 3.25" />
    </svg>
  );
}

function formatRoleLabel(user) {
  if (!user) {
    return '家人';
  }

  return ROLE_LABELS[user.role] || user.name || '家人';
}

function getStatusMeta(status) {
  if (status === 'offline') {
    return {
      dotClassName: 'bg-rose-500',
      pillClassName: 'bg-rose-100 text-rose-700',
      label: '离线',
      hint: '最近没有收到设备心跳',
    };
  }

  if (status === 'idle') {
    return {
      dotClassName: 'bg-amber-400',
      pillClassName: 'bg-amber-100 text-amber-700',
      label: '在线',
      hint: '设备在线，当前处于待机状态',
    };
  }

  return {
    dotClassName: 'bg-emerald-500',
    pillClassName: 'bg-emerald-100 text-emerald-700',
    label: '在线',
    hint: '设备在线，可立即切换展示内容',
  };
}

function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) {
    return '暂无记录';
  }

  return new Date(lastSeenAt).toLocaleString('zh-CN', {
    hour12: false,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Home() {
  const { user, family } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [activePanel, setActivePanel] = useState('learning');
  const [deviceError, setDeviceError] = useState('');
  const socketRef = useRef(null);

  const loadSummary = useEffectEvent(async () => {
    try {
      const response = await pinyinApi.getSummary();
      if (response.success) {
        setSummary(response.data.summary);
      }
    } catch {
      setSummary(null);
    }
  });

  const loadDevices = useEffectEvent(async () => {
    try {
      const response = await displayApi.getDevices();
      setDevices(response.data.devices || []);
      setDeviceError('');
    } catch (error) {
      setDevices([]);
      setDeviceError(error.message || '获取展示设备失败');
    }
  });

  useEffect(() => {
    loadSummary();
    loadDevices();
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      return undefined;
    }

    let isDisposed = false;
    let reconnectTimer = null;

    const connect = () => {
      socketRef.current = createDisplaySocket({
        token,
        role: 'control',
        onClose: () => {
          if (!isDisposed) {
            reconnectTimer = window.setTimeout(connect, 1500);
          }
        },
        onMessage: (message) => {
          if (message.type === 'device_presence') {
            setDevices((current) => {
              if (!current.some((device) => device.id === message.data.deviceId)) {
                loadDevices();
                return current;
              }

              return current.map((device) => (
                device.id === message.data.deviceId
                  ? {
                    ...device,
                    status: message.data.status,
                    lastSeenAt: message.data.lastSeenAt,
                  }
                  : device
              ));
            });
          }

          if (message.type === 'device_state') {
            const { deviceId, state } = message.data;
            setDevices((current) => {
              if (!current.some((device) => device.id === deviceId)) {
                loadDevices();
                return current;
              }

              return current.map((device) => (
                device.id === deviceId
                  ? {
                    ...device,
                    currentScreenType: state.screenType,
                  }
                  : device
              ));
            });
          }
        },
      });
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const currentDevice = devices[0] || null;
  const roleLabel = formatRoleLabel(user);
  const avatarLabel = user?.avatar || user?.name?.slice(0, 1) || roleLabel.slice(0, 1);
  const progressValue = summary?.completionRate || 0;
  const panelButtonClassName = (panelKey) => (
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      activePanel === panelKey
        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
        : 'bg-white/70 text-slate-500 hover:bg-white hover:text-slate-900'
    }`
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,238,217,0.95),_rgba(248,250,252,0.98)_30%,_#f6efe7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/75 p-4 shadow-[0_24px_80px_rgba(148,163,184,0.18)] backdrop-blur xl:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-950 text-2xl font-black text-white shadow-lg shadow-slate-300">
                {avatarLabel}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-amber-700">
                    顶部状态栏
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {family ? family.name : '还没有加入家庭'}
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {roleLabel}，今天从哪一块开始？
                </h1>
                <p className="text-sm leading-6 text-slate-600 sm:text-base">
                  首页现在按模块组织，学习、连接和家庭管理放在一屏里，方便直接点进去。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">当前用户</p>
                <p className="mt-2 text-xl font-black">{user?.name || roleLabel}</p>
                <p className="mt-1 text-sm text-slate-300">{roleLabel}</p>
              </div>
              <div className="rounded-[24px] bg-[#fff7ed] px-4 py-4 text-slate-900">
                <p className="text-xs uppercase tracking-[0.2em] text-orange-500">拼音进度</p>
                <p className="mt-2 text-xl font-black">
                  {summary ? `${summary.completedLessons}/${summary.totalLessons}` : '--'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {summary?.currentLesson?.title || '准备开始第一课'}
                </p>
              </div>
              <Link
                to="/family"
                className="group rounded-[24px] bg-[#eff6ff] px-4 py-4 text-slate-900 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-100"
              >
                <div className="flex items-center justify-between">
                  <FamilyIcon className="h-6 w-6 text-sky-700" />
                  <SettingsIcon className="h-4 w-4 text-sky-700 transition group-hover:rotate-45" />
                </div>
                <p className="mt-3 text-lg font-black">家庭管理</p>
                <p className="mt-1 text-sm text-slate-600">
                  设置入口、家庭码和成员信息都在这里。
                </p>
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/70 p-5 shadow-[0_24px_80px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                核心功能模块
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                大色块入口，一眼选中今天要做的事
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setActivePanel('learning')} className={panelButtonClassName('learning')}>
                学科选择
              </button>
              <button type="button" onClick={() => setActivePanel('games')} className={panelButtonClassName('games')}>
                小游戏
              </button>
              <button type="button" onClick={() => setActivePanel('tools')} className={panelButtonClassName('tools')}>
                生活工具
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.95fr_0.95fr]">
            <button
              type="button"
              onClick={() => setActivePanel('learning')}
              className="group rounded-[30px] bg-[linear-gradient(135deg,_#f97316,_#fb923c_48%,_#fed7aa)] p-6 text-left text-white shadow-[0_20px_60px_rgba(249,115,22,0.28)] transition hover:-translate-y-1"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-50/80">
                辅导学习
              </p>
              <h3 className="mt-4 text-3xl font-black tracking-tight">
                拼音、数学、英语
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-orange-50/90">
                点击后先选学科。拼音已经可以直接进入，数学和英语先保留入口位。
              </p>
              <div className="mt-6 rounded-[24px] bg-white/20 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sm">
                  <span>拼音学习进度</span>
                  <span className="font-semibold">
                    {summary ? `${summary.completedLessons}/${summary.totalLessons}` : '--'}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/30">
                  <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${progressValue}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>{summary?.currentLesson?.title || '准备开始第一课'}</span>
                  <span className="font-semibold transition group-hover:translate-x-1">去选择</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('games')}
              className="group rounded-[30px] bg-[linear-gradient(160deg,_#0f172a,_#1d4ed8_56%,_#67e8f9)] p-6 text-left text-white shadow-[0_20px_60px_rgba(29,78,216,0.22)] transition hover:-translate-y-1"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                休闲益智
              </p>
              <h3 className="mt-4 text-3xl font-black tracking-tight">
                小游戏入口
              </h3>
              <p className="mt-3 text-sm leading-7 text-sky-50/90">
                保留轻量互动区，后续放图形配对、翻翻卡和数字迷宫。
              </p>
              <div className="mt-8 flex items-center justify-between text-sm text-cyan-50/90">
                <span>先看预留模块</span>
                <span className="font-semibold transition group-hover:translate-x-1">去查看</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('tools')}
              className="group rounded-[30px] bg-[linear-gradient(160deg,_#164e63,_#0f766e_55%,_#bbf7d0)] p-6 text-left text-white shadow-[0_20px_60px_rgba(15,118,110,0.22)] transition hover:-translate-y-1"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-50/80">
                生活工具
              </p>
              <h3 className="mt-4 text-3xl font-black tracking-tight">
                家庭备忘与提醒
              </h3>
              <p className="mt-3 text-sm leading-7 text-emerald-50/90">
                备忘录、天气和健康提醒先集中展示，家庭设置入口同时保留。
              </p>
              <div className="mt-8 flex items-center justify-between text-sm text-emerald-50/90">
                <span>查看工具分组</span>
                <span className="font-semibold transition group-hover:translate-x-1">去打开</span>
              </div>
            </button>
          </div>

          <div className="mt-5 rounded-[30px] bg-[#f8fafc] p-5">
            {activePanel === 'learning' && (
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
                      学科选择
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                      从具体学科开始，先给首页一个真正可点击的学习分发层
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500">
                    当前推荐：{summary?.currentLesson?.title || '拼音启蒙'}
                  </p>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {SUBJECT_OPTIONS.map((subject) => {
                    const cardClassName = `rounded-[26px] border ${subject.border} bg-gradient-to-br ${subject.accent} p-5`;

                    if (subject.to) {
                      return (
                        <Link key={subject.key} to={subject.to} className={`${cardClassName} transition hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-100`}>
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-2xl font-black text-slate-950">{subject.title}</h4>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subject.badgeClassName}`}>
                              {subject.badge}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-slate-600">{subject.description}</p>
                          <div className="mt-5 rounded-[20px] bg-white/80 p-4 text-sm text-slate-600">
                            <div className="flex items-center justify-between">
                              <span>完成进度</span>
                              <span className="font-semibold text-slate-900">
                                {summary ? `${summary.completedLessons}/${summary.totalLessons}` : '未开始'}
                              </span>
                            </div>
                            <div className="mt-3 h-2 rounded-full bg-orange-100">
                              <div className="h-2 rounded-full bg-orange-500 transition-all" style={{ width: `${progressValue}%` }} />
                            </div>
                          </div>
                          <div className="mt-5 text-sm font-semibold text-slate-900">{subject.cta}</div>
                        </Link>
                      );
                    }

                    return (
                      <div key={subject.key} className={`${cardClassName} opacity-90`}>
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-2xl font-black text-slate-950">{subject.title}</h4>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subject.badgeClassName}`}>
                            {subject.badge}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{subject.description}</p>
                        <div className="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-white/75 px-4 py-4 text-sm font-semibold text-slate-500">
                          {subject.cta}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activePanel === 'games' && (
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-500">
                      休闲益智
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                      小游戏入口先预留清楚，后续直接往里填内容
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500">本阶段完成首页入口和交互组织</p>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {GAME_OPTIONS.map((game) => (
                    <div key={game.title} className="rounded-[26px] border border-sky-100 bg-white p-5 shadow-sm shadow-sky-50">
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        筹备中
                      </span>
                      <h4 className="mt-4 text-2xl font-black text-slate-950">{game.title}</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{game.description}</p>
                      <div className="mt-5 rounded-[18px] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                        入口已预留，等待具体玩法接入
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePanel === 'tools' && (
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">
                      生活工具
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                      工具区保留未来扩展位，同时提供现有的家庭设置入口
                    </h3>
                  </div>
                  <Link to="/family" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-900">
                    前往家庭管理
                  </Link>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
                  <Link
                    to="/family"
                    className="rounded-[26px] bg-[linear-gradient(135deg,_#dcfce7,_#ecfccb)] p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-100"
                  >
                    <div className="flex items-center justify-between">
                      <FamilyIcon className="h-8 w-8 text-emerald-700" />
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700">
                        可用
                      </span>
                    </div>
                    <h4 className="mt-5 text-2xl font-black text-slate-950">家庭设置</h4>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      管理家庭码、成员信息和加入状态，作为当前可用的工具入口。
                    </p>
                  </Link>
                  {TOOL_OPTIONS.map((tool) => (
                    <div key={tool.title} className="rounded-[26px] border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-50">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        规划中
                      </span>
                      <h4 className="mt-4 text-xl font-black text-slate-950">{tool.title}</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.32)] sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                Connection Widget
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                设备连接工具窗
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                首页直接展示展示端绑定状态。已绑定时可快速进入设备详情，未绑定时就引导去配对页面。
              </p>
            </div>
            <Link
              to="/control"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:bg-white/10"
            >
              管理展示端
            </Link>
          </div>

          {deviceError && (
            <div className="mt-5 rounded-[22px] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {deviceError}
            </div>
          )}

          <div className="mt-6">
            {currentDevice ? (
              <div className="grid gap-5 rounded-[30px] bg-white/8 p-5 backdrop-blur lg:grid-cols-[1.15fr_0.85fr]">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-cyan-300/15 text-cyan-200">
                    <DisplayIcon className="h-8 w-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-black text-white">{currentDevice.name}</h3>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${getStatusMeta(currentDevice.status).pillClassName}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${getStatusMeta(currentDevice.status).dotClassName}`} />
                        {getStatusMeta(currentDevice.status).label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {getStatusMeta(currentDevice.status).hint}
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/10 bg-slate-900/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">当前画面</p>
                        <p className="mt-2 text-lg font-bold text-white">
                          {SCREEN_TYPE_LABELS[currentDevice.currentScreenType] || '未设置'}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-slate-900/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">最后在线</p>
                        <p className="mt-2 text-lg font-bold text-white">
                          {formatLastSeen(currentDevice.lastSeenAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-[26px] bg-[linear-gradient(180deg,_rgba(14,165,233,0.18),_rgba(15,23,42,0.08))] p-5">
                  <div>
                    <p className="text-sm text-cyan-100">快捷操作</p>
                    <h4 className="mt-2 text-2xl font-black text-white">
                      已绑定展示端
                    </h4>
                    <p className="mt-3 text-sm leading-7 text-slate-200">
                      点击查看设备详情，继续切换内容。后续如果补齐接口，这里可以接远程断开或静音。
                    </p>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link
                      to={`/control/device/${currentDevice.id}`}
                      className="inline-flex items-center justify-center rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50"
                    >
                      查看设备详情
                    </Link>
                    <Link
                      to="/control"
                      className="inline-flex items-center justify-center rounded-[18px] border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      绑定更多设备
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 rounded-[30px] border border-dashed border-white/20 bg-white/6 p-6 backdrop-blur lg:grid-cols-[1.15fr_0.85fr]">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-white/8 text-slate-400">
                    <DisplayIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">暂无绑定的展示端设备</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                      还没有电视、平板或投影绑定到当前家庭。先去控制端输入 6 位配对码，再回到首页查看在线状态。
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                      空闲态
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] bg-white/8 p-5">
                  <p className="text-sm text-slate-300">下一步</p>
                  <h4 className="mt-2 text-2xl font-black text-white">
                    去绑定
                  </h4>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    在展示端打开 `/display`，拿到配对码后，到控制端完成绑定。
                  </p>
                  <Link
                    to="/control"
                    className="mt-6 inline-flex items-center justify-center rounded-[18px] bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    去绑定
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
