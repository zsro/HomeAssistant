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
  pinyin: '拼音课堂',
  message: '全屏消息',
  image: '图片展示',
};

const SUBJECT_OPTIONS = [
  {
    key: 'pinyin',
    title: '拼音',
    description: '已经接入完整课程与课堂控制，可以直接开始。',
    cta: '进入拼音学习',
    to: '/pinyin',
    gradient: 'bg-[linear-gradient(135deg,_#f97316,_#fb923c_45%,_#fdba74)]',
    textClassName: 'text-white',
    badge: '已上线',
  },
  {
    key: 'math',
    title: '数学',
    description: '口算、数感和图形认知预留在这里。',
    cta: '即将开放',
    gradient: 'bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_48%,_#eef2ff)]',
    textClassName: 'text-slate-900',
    badge: '筹备中',
  },
  {
    key: 'english',
    title: '英语',
    description: '字母启蒙、自然拼读和简单对话后续接入。',
    cta: '即将开放',
    gradient: 'bg-[linear-gradient(135deg,_#ccfbf1,_#ecfeff_48%,_#dbeafe)]',
    textClassName: 'text-slate-900',
    badge: '筹备中',
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
    description: '家庭日程、待办和临时提醒。',
  },
  {
    title: '天气',
    description: '出门前天气和穿衣提示。',
  },
  {
    title: '健康提醒',
    description: '喝水、休息和作息提醒。',
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

function SwitchIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h11m0 0-3-3m3 3-3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17H6m0 0 3 3m-3-3 3-3" />
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

function formatRoleLabel(user) {
  if (!user) {
    return '家人';
  }

  return ROLE_LABELS[user.role] || user.name || '家人';
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

function pickPreferredDevice(devices) {
  return devices.find((device) => device.status === 'active')
    || devices.find((device) => device.status === 'idle')
    || devices[0]
    || null;
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

  const roleLabel = formatRoleLabel(user);
  const avatarLabel = user?.avatar || user?.name?.slice(0, 1) || roleLabel.slice(0, 1);
  const currentDevice = pickPreferredDevice(devices);
  const progressValue = summary?.completionRate || 0;
  const panelButtonClassName = (panelKey) => (
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      activePanel === panelKey
        ? 'bg-slate-950 text-white shadow-lg shadow-slate-200'
        : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,238,217,0.96),_rgba(248,250,252,0.98)_32%,_#f6efe7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-[34px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,_#fff7ed,_#ffffff_48%,_#eff6ff)] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">顶部状态栏</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-18 w-18 items-center justify-center rounded-[24px] bg-slate-950 text-3xl font-black text-white shadow-lg shadow-slate-300">
                  {avatarLabel}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">当前登录成员</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                    {roleLabel}
                  </h1>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {user?.name || roleLabel} 已登录，当前家庭为 {family?.name || '未加入家庭'}。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/family"
                className="rounded-[28px] bg-slate-950 p-5 text-white shadow-xl shadow-slate-300 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <FamilyIcon className="h-7 w-7 text-cyan-200" />
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    家庭管理
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black">切换成员</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  进入家庭管理页查看成员、切换使用人或处理加入状态。
                </p>
              </Link>

              <Link
                to="/family"
                className="rounded-[28px] bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_52%,_#ffffff)] p-5 text-slate-900 shadow-xl shadow-sky-100 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <SettingsIcon className="h-7 w-7 text-sky-700" />
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700">
                    设置入口
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black">家庭设置</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  管理家庭码、成员信息和展示设备归属。
                </p>
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">核心功能模块</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                功能磁贴
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                大色块按钮优先承载首页跳转，让孩子和家长都能一眼点中目标区域。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setActivePanel('learning')} className={panelButtonClassName('learning')}>
                辅导学习
              </button>
              <button type="button" onClick={() => setActivePanel('games')} className={panelButtonClassName('games')}>
                休闲益智
              </button>
              <button type="button" onClick={() => setActivePanel('tools')} className={panelButtonClassName('tools')}>
                生活工具
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setActivePanel('learning')}
              className="group rounded-[30px] bg-[linear-gradient(135deg,_#f97316,_#fb923c_45%,_#fdba74)] p-6 text-left text-white shadow-[0_20px_60px_rgba(249,115,22,0.28)] transition hover:-translate-y-1"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-50/85">辅导学习</p>
              <h3 className="mt-4 text-3xl font-black tracking-tight">拼音、数学、英语</h3>
              <p className="mt-3 text-sm leading-7 text-orange-50/92">
                点击进入学科选择。当前拼音已可直接学习，数学与英语保留入口位。
              </p>
              <div className="mt-6 rounded-[24px] bg-white/20 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-sm">
                  <span>拼音进度</span>
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
              className="group rounded-[30px] bg-[linear-gradient(160deg,_#0f172a,_#1d4ed8_58%,_#67e8f9)] p-6 text-left text-white shadow-[0_20px_60px_rgba(29,78,216,0.22)] transition hover:-translate-y-1"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/85">休闲益智</p>
              <h3 className="mt-4 text-3xl font-black tracking-tight">小游戏入口</h3>
              <p className="mt-3 text-sm leading-7 text-sky-50/92">
                图形配对、翻翻卡和数字迷宫都从这里进入，先收成一个明确磁贴。
              </p>
              <div className="mt-8 flex items-center justify-between text-sm text-cyan-50/90">
                <span>查看预留玩法</span>
                <span className="font-semibold transition group-hover:translate-x-1">去打开</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('tools')}
              className="group rounded-[30px] bg-[linear-gradient(160deg,_#164e63,_#0f766e_55%,_#bbf7d0)] p-6 text-left text-white shadow-[0_20px_60px_rgba(15,118,110,0.22)] transition hover:-translate-y-1"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-50/85">生活工具</p>
              <h3 className="mt-4 text-3xl font-black tracking-tight">备忘、天气、提醒</h3>
              <p className="mt-3 text-sm leading-7 text-emerald-50/92">
                家庭备忘录、天气和健康提醒统一放在这个入口下。
              </p>
              <div className="mt-8 flex items-center justify-between text-sm text-emerald-50/90">
                <span>查看工具分组</span>
                <span className="font-semibold transition group-hover:translate-x-1">去打开</span>
              </div>
            </button>
          </div>

          <div className="mt-5 rounded-[30px] bg-slate-50 p-5">
            {activePanel === 'learning' && (
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">学科选择</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">从辅导学习进入具体学科</h3>
                  </div>
                  <p className="text-sm text-slate-500">当前推荐：{summary?.currentLesson?.title || '拼音启蒙'}</p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {SUBJECT_OPTIONS.map((subject) => {
                    const content = (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-2xl font-black">{subject.title}</h4>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subject.key === 'pinyin' ? 'bg-white/20 text-white' : 'bg-white/80 text-slate-700'}`}>
                            {subject.badge}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 opacity-90">{subject.description}</p>
                        <div className={`mt-5 rounded-[20px] ${subject.key === 'pinyin' ? 'bg-white/18 text-white' : 'bg-white/80 text-slate-700'} p-4 text-sm`}>
                          {subject.key === 'pinyin' ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span>完成进度</span>
                                <span className="font-semibold">
                                  {summary ? `${summary.completedLessons}/${summary.totalLessons}` : '--'}
                                </span>
                              </div>
                              <div className="mt-3 h-2 rounded-full bg-white/25">
                                <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${progressValue}%` }} />
                              </div>
                            </>
                          ) : (
                            <div className="font-semibold">{subject.cta}</div>
                          )}
                        </div>
                        <div className="mt-5 text-sm font-semibold">{subject.cta}</div>
                      </>
                    );

                    if (subject.to) {
                      return (
                        <Link
                          key={subject.key}
                          to={subject.to}
                          className={`rounded-[26px] p-5 shadow-lg transition hover:-translate-y-1 ${subject.gradient} ${subject.textClassName}`}
                        >
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={subject.key}
                        className={`rounded-[26px] p-5 shadow-sm ${subject.gradient} ${subject.textClassName}`}
                      >
                        {content}
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
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-500">休闲益智</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">小游戏入口区</h3>
                  </div>
                  <p className="text-sm text-slate-500">先收成明确入口，后续直接接玩法</p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {GAME_OPTIONS.map((game) => (
                    <div key={game.title} className="rounded-[26px] border border-sky-100 bg-white p-5 shadow-sm shadow-sky-50">
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">筹备中</span>
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
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">生活工具</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">家庭工具区</h3>
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
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700">可用</span>
                    </div>
                    <h4 className="mt-5 text-2xl font-black text-slate-950">家庭设置</h4>
                    <p className="mt-3 text-sm leading-7 text-slate-600">当前可用工具入口，处理家庭成员和基础配置。</p>
                  </Link>

                  {TOOL_OPTIONS.map((tool) => (
                    <div key={tool.title} className="rounded-[26px] border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-50">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">规划中</span>
                      <h4 className="mt-4 text-xl font-black text-slate-950">{tool.title}</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[34px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_24px_80px_rgba(148,163,184,0.18)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">设备连接工具窗</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Connection Widget</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                位于首页显眼位置，按“已绑定 / 未绑定”自动切换状态。
              </p>
            </div>

            <Link
              to="/control"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-slate-950"
            >
              管理展示端
            </Link>
          </div>

          {deviceError && (
            <div className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {deviceError}
            </div>
          )}

          {currentDevice ? (
            <div className="mt-6 grid gap-5 rounded-[32px] bg-[linear-gradient(135deg,_#0f172a,_#1e293b_55%,_#0f172a)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex gap-4">
                <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-[24px] bg-cyan-300/12 text-cyan-200">
                  <DisplayIcon className="h-9 w-9" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/80">样式 A：已绑定设备</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h3 className="text-3xl font-black text-white">{currentDevice.name}</h3>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${getStatusMeta(currentDevice.status).pillClassName}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${getStatusMeta(currentDevice.status).dotClassName}`} />
                      {getStatusMeta(currentDevice.status).label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{getStatusMeta(currentDevice.status).hint}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">当前画面</p>
                      <p className="mt-2 text-lg font-bold text-white">
                        {SCREEN_TYPE_LABELS[currentDevice.currentScreenType] || '未设置'}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">最后在线</p>
                      <p className="mt-2 text-lg font-bold text-white">{formatLastSeen(currentDevice.lastSeenAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-white/8 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">交互操作</p>
                <div className="mt-4 grid gap-3">
                  <Link
                    to={`/control/device/${currentDevice.id}`}
                    className="inline-flex items-center justify-center rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50"
                  >
                    查看设备详情
                  </Link>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center rounded-[18px] border border-white/15 px-4 py-3 text-sm font-semibold text-white/55"
                  >
                    远程静音（待接入）
                  </button>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center rounded-[18px] border border-white/15 px-4 py-3 text-sm font-semibold text-white/55"
                  >
                    远程断开（待接入）
                  </button>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  详情跳转已可用；静音和远程断开目前后端还没有接口，所以先保留为待接入状态。
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 rounded-[32px] border border-dashed border-slate-300 bg-slate-50 p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex gap-4">
                <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-[24px] bg-slate-200 text-slate-400 grayscale">
                  <DisplayIcon className="h-9 w-9" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">样式 B：未绑定设备</p>
                  <h3 className="mt-3 text-3xl font-black text-slate-900">暂无绑定的展示端设备</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    当前家庭还没有电视、投影或平板与展示端绑定。先去绑定，之后这里会自动切到连接态样式。
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-5 shadow-sm shadow-slate-200">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">下一步</p>
                <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-slate-50 px-4 py-4">
                  <DisplayIcon className="h-6 w-6 text-slate-400" />
                  <span className="text-sm text-slate-500">灰度占位符</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  在展示端打开展示页拿到 6 位配对码，然后回控制端完成绑定。
                </p>
                <Link
                  to="/control"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  去绑定
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Home;
