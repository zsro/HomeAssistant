import { useEffect, useEffectEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { displayApi, pinyinApi } from '../api/config';

const MODE_META = {
  choices: {
    label: '点击选择',
    hint: '适合四声调、辨音和抢答环节',
  },
  joystick: {
    label: '方向控制',
    hint: '适合采集、闯关和移动角色',
  },
  shake: {
    label: '摇一摇',
    hint: '适合唤醒、开场和节奏导入',
  },
  spotlight: {
    label: '探照灯',
    hint: '适合观察字形和结构高亮',
  },
  tap: {
    label: '点击触发',
    hint: '适合简单触发和剧情推进',
  },
  trace: {
    label: '跟写同步',
    hint: '适合四线三格描写和收尾复习',
  },
  voice: {
    label: '语音跟读',
    hint: '适合读准音和跟读反馈',
  },
};

const STAGE_TONE = {
  '趣味导入：磨耳朵': {
    badge: '开场唤醒',
    gradient: 'from-amber-300 via-orange-200 to-rose-200',
    panel: 'bg-[linear-gradient(135deg,_#fff7ed,_#ffedd5_40%,_#fde68a)]',
  },
  '核心教学：看与读': {
    badge: '核心教学',
    gradient: 'from-cyan-300 via-sky-200 to-indigo-200',
    panel: 'bg-[linear-gradient(135deg,_#ecfeff,_#dbeafe_42%,_#eef2ff)]',
  },
  '互动巩固：玩中学': {
    badge: '互动巩固',
    gradient: 'from-emerald-300 via-lime-200 to-amber-100',
    panel: 'bg-[linear-gradient(135deg,_#ecfccb,_#dcfce7_42%,_#fef3c7)]',
  },
  '总结闭环：写与复习': {
    badge: '总结闭环',
    gradient: 'from-fuchsia-200 via-rose-200 to-orange-100',
    panel: 'bg-[linear-gradient(135deg,_#fdf2f8,_#ffe4e6_40%,_#fff7ed)]',
  },
};

function flattenLessons(stages) {
  return stages.flatMap((stage) => stage.lessons);
}

function getDeviceStatusMeta(status) {
  if (status === 'offline') {
    return {
      label: '离线',
      className: 'bg-rose-100 text-rose-700',
    };
  }

  if (status === 'idle') {
    return {
      label: '待机',
      className: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    label: '在线',
    className: 'bg-emerald-100 text-emerald-700',
  };
}

function pickPreferredDevice(devices) {
  return devices.find((device) => device.status === 'active')
    || devices.find((device) => device.status === 'idle')
    || devices[0]
    || null;
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
      motif: '回音山谷 · 圆嘴口型 · 小转盘',
      skyClassName: 'from-orange-200 via-amber-100 to-yellow-50',
      orbClassName: 'from-orange-500 via-amber-400 to-yellow-300',
    };
  }

  if (lowerTitle.includes('单韵母 e')) {
    return {
      symbol: 'e',
      motif: '大白鹅 · 水纹池塘 · 平嘴角',
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

function buildDisplayPayload({
  summary,
  selectedLesson,
  currentStep,
  currentStage,
  completedSet,
}) {
  return {
    title: '拼音互动课堂',
    updatedAt: summary?.updatedAt || null,
    summary: {
      completedLessons: summary?.completedLessons || 0,
      totalLessons: summary?.totalLessons || 0,
      completionRate: summary?.completionRate || 0,
      currentLessonId: summary?.currentLessonId || null,
    },
    lesson: {
      id: selectedLesson.id,
      order: selectedLesson.order,
      title: selectedLesson.title,
      tagline: selectedLesson.tagline,
      lessonType: selectedLesson.lessonType,
      lessonBadge: selectedLesson.lessonBadge,
      stageTitle: selectedLesson.stageTitle,
      durationMinutes: selectedLesson.durationMinutes,
      totalStepCount: selectedLesson.totalStepCount,
      practiceSentence: selectedLesson.practiceSentence,
      miniTask: selectedLesson.miniTask,
      goals: selectedLesson.goals,
      focus: selectedLesson.focus,
      checkpoints: selectedLesson.checkpoints,
      previewLesson: selectedLesson.previewLesson,
      assetNotes: selectedLesson.assetNotes,
      isCompleted: completedSet.has(selectedLesson.id),
    },
    stages: selectedLesson.teachingFlow.map((stage) => {
      const isCompleted = stage.steps.every((step) => step.stepIndex < currentStep.stepIndex);
      const isActive = stage.id === currentStage?.id;

      return {
        id: stage.id,
        title: stage.title,
        summary: stage.summary,
        stepCount: stage.stepCount,
        isCompleted,
        isActive,
      };
    }),
    currentStage: currentStage ? {
      id: currentStage.id,
      title: currentStage.title,
      summary: currentStage.summary,
      order: currentStage.order,
    } : null,
    currentStep: {
      id: currentStep.id,
      title: currentStep.title,
      stepIndex: currentStep.stepIndex,
      totalStepCount: selectedLesson.totalStepCount,
      stageTitle: currentStep.stageTitle,
      teacherPrompt: currentStep.teacherPrompt,
      tvScene: currentStep.tvScene,
      controllerScene: currentStep.controllerScene,
      interaction: currentStep.interaction,
      feedback: currentStep.feedback,
      controllerMode: currentStep.controllerMode,
      highlights: currentStep.highlights || [],
      resources: currentStep.resources || [],
    },
  };
}

function StepControlWidget({ currentStep, lesson }) {
  const visual = getLessonVisualMeta(lesson, currentStep);

  if (currentStep.controllerMode === 'shake') {
    return (
      <div className="relative overflow-hidden rounded-[32px] bg-slate-950 px-6 py-7 text-white">
        <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-rose-400/20 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.22em] text-amber-200">手机大控件</p>
        <div className="mt-6 flex flex-col items-center justify-center">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-[radial-gradient(circle,_rgba(251,191,36,0.9),_rgba(245,158,11,0.88)_55%,_rgba(120,53,15,0.95)_100%)] shadow-[0_24px_80px_rgba(245,158,11,0.4)]">
            <div className="absolute inset-[-12px] rounded-full border-2 border-amber-200/35 animate-pulse" />
            <div className="text-center">
              <div className="mx-auto h-16 w-14 rounded-t-[999px] border-[6px] border-amber-50/90 border-b-0" />
              <div className="mx-auto -mt-1 h-6 w-8 rounded-b-full bg-amber-50/90" />
              <div className="mx-auto mt-2 h-3 w-3 rounded-full bg-amber-900/70" />
            </div>
          </div>
          <p className="mt-6 text-2xl font-black">摇一摇，唤醒课堂</p>
          <p className="mt-3 max-w-md text-center text-sm leading-7 text-slate-300">
            当前是开场动作。孩子拿着手机摇动后，电视端进入 {visual.motif} 的分镜。
          </p>
        </div>
      </div>
    );
  }

  if (currentStep.controllerMode === 'voice') {
    return (
      <div className="overflow-hidden rounded-[32px] bg-slate-950 px-6 py-7 text-white">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">手机大控件</p>
        <div className="mt-6 flex flex-col items-center">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.95),_rgba(59,130,246,0.88)_58%,_rgba(15,23,42,1)_100%)] shadow-[0_24px_80px_rgba(34,211,238,0.35)]">
            <div className="absolute inset-[-16px] rounded-full border border-cyan-200/40 animate-ping" />
            <div className="relative h-24 w-16 rounded-full bg-white/92">
              <div className="absolute inset-x-3 top-3 h-12 rounded-full bg-cyan-400/80" />
              <div className="absolute inset-x-6 bottom-[-16px] h-10 rounded-full border-4 border-white/92 border-t-0" />
              <div className="absolute bottom-[-30px] left-1/2 h-8 w-1 -translate-x-1/2 bg-white/92" />
            </div>
          </div>
          <div className="mt-6 flex w-full max-w-md items-end justify-center gap-2">
            {[28, 54, 80, 58, 34].map((height, index) => (
              <div
                key={height}
                className={`w-4 rounded-full bg-cyan-300/80 ${index % 2 === 0 ? 'animate-pulse' : ''}`}
                style={{ height }}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-sm leading-7 text-slate-300">
            对着手机跟读，电视端会用气球、波形或角色动作来承接声音反馈。
          </p>
        </div>
      </div>
    );
  }

  if (currentStep.controllerMode === 'spotlight') {
    return (
      <div className="overflow-hidden rounded-[32px] bg-slate-950 px-6 py-7 text-white">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">手机大控件</p>
        <div className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_#0f172a,_#020617)] p-5">
          <div className="relative h-56 overflow-hidden rounded-[24px] bg-slate-900">
            <div className="absolute left-[18%] top-[18%] h-32 w-32 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-[18%] top-[34%] h-28 w-28 rounded-full bg-amber-200/75 blur-2xl" />
            <div className="absolute inset-0 flex items-center justify-center text-[7rem] font-black text-white/18">
              {getLessonVisualMeta(lesson, currentStep).symbol}
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            手指在手机上滑动时，电视端对应结构高亮。这个控件用于字形拆解和观察记忆。
          </p>
        </div>
      </div>
    );
  }

  if (currentStep.controllerMode === 'choices') {
    return (
      <div className="overflow-hidden rounded-[32px] bg-white px-6 py-7 text-slate-900 shadow-xl shadow-orange-200/40">
        <p className="text-xs uppercase tracking-[0.22em] text-orange-500">手机大控件</p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {['1', '2', '3', '4'].map((value, index) => (
            <button
              key={value}
              type="button"
              className={`rounded-[28px] px-6 py-8 text-center text-3xl font-black shadow-lg transition ${
                index === 0
                  ? 'bg-[linear-gradient(135deg,_#f97316,_#fb7185)] text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>{value}</div>
              <div className="mt-2 text-sm font-semibold">
                {['ā', 'á', 'ǎ', 'à'][index] || `选项 ${value}`}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (currentStep.controllerMode === 'joystick') {
    return (
      <div className="overflow-hidden rounded-[32px] bg-slate-950 px-6 py-7 text-white">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">手机大控件</p>
        <div className="mt-6 flex justify-center">
          <div className="grid grid-cols-3 gap-3">
            <div />
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/10 text-3xl">↑</div>
            <div />
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/10 text-3xl">←</div>
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-300 text-4xl font-black text-slate-950 shadow-[0_16px_40px_rgba(110,231,183,0.45)]">
              ●
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/10 text-3xl">→</div>
            <div />
            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/10 text-3xl">↓</div>
            <div />
          </div>
        </div>
        <p className="mt-5 text-center text-sm leading-7 text-slate-300">
          这个控件用于森林闯关、采蘑菇和寻宝环节，电视端角色会实时响应。
        </p>
      </div>
    );
  }

  if (currentStep.controllerMode === 'trace') {
    return (
      <div className="overflow-hidden rounded-[32px] bg-white px-6 py-7 text-slate-900 shadow-xl shadow-fuchsia-200/40">
        <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-500">手机大控件</p>
        <div className="mt-6 rounded-[28px] border-2 border-dashed border-fuchsia-200 bg-[linear-gradient(180deg,_#ffffff,_#fdf2f8)] p-5">
          <div className="grid h-52 grid-rows-4 overflow-hidden rounded-[20px] border border-fuchsia-100 bg-white">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="relative border-b border-fuchsia-100 last:border-b-0">
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-fuchsia-200" />
              </div>
            ))}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[7rem] font-black text-fuchsia-100">
              {getLessonVisualMeta(lesson, currentStep).symbol}
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            横屏后就是孩子的描写板，电视端同步显示闪光笔迹和礼花反馈。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] bg-white px-6 py-7 text-slate-900 shadow-xl shadow-slate-200">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">手机大控件</p>
      <div className="mt-6 rounded-[28px] bg-[linear-gradient(135deg,_#fff7ed,_#ffffff)] p-6">
        <button
          type="button"
          className="w-full rounded-[24px] bg-slate-950 px-6 py-8 text-center text-2xl font-black text-white shadow-lg shadow-slate-300"
        >
          开始当前环节
        </button>
      </div>
    </div>
  );
}

function ScenePreview({ lesson, currentStep, currentFlowStage }) {
  const stageTone = STAGE_TONE[currentFlowStage?.title] || STAGE_TONE['核心教学：看与读'];
  const visual = getLessonVisualMeta(lesson, currentStep);

  return (
    <div className={`relative overflow-hidden rounded-[36px] ${stageTone.panel} p-6 shadow-xl shadow-orange-100/50`}>
      <div className="absolute right-[-60px] top-[-40px] h-44 w-44 rounded-full bg-white/45 blur-3xl" />
      <div className="absolute bottom-[-50px] left-[-30px] h-40 w-40 rounded-full bg-white/30 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-slate-700">
              {stageTone.badge}
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900">{currentStep.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{currentFlowStage?.summary}</p>
          </div>
          <div className={`flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br ${visual.orbClassName} text-5xl font-black text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]`}>
            {visual.symbol}
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[32px] bg-gradient-to-br ${visual.skyClassName} px-6 py-6`}>
          <div className="absolute inset-x-6 top-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span>电视将看到</span>
            <span>{visual.motif}</span>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] bg-white/80 p-5 shadow-lg shadow-white/50">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">电视画面</p>
              <p className="mt-3 text-base leading-7 text-slate-700">{currentStep.tvScene}</p>
            </div>
            <div className="rounded-[28px] bg-slate-950 px-5 py-5 text-white shadow-xl shadow-slate-300/30">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">老师引导</p>
              <p className="mt-3 text-lg leading-8">{currentStep.teacherPrompt}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pinyin() {
  const [stages, setStages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [deviceMessage, setDeviceMessage] = useState('');
  const [deviceError, setDeviceError] = useState('');

  const loadPinyinOverview = useEffectEvent(async () => {
    const response = await pinyinApi.getOverview();
    const nextStages = response.data.stages || [];
    const nextSummary = response.data.summary || null;
    const lessons = flattenLessons(nextStages);
    const firstLesson = lessons[0] || null;

    setStages(nextStages);
    setSummary(nextSummary);
    setSelectedLessonId(nextSummary?.currentLessonId || firstLesson?.id || null);
  });

  const loadDevices = useEffectEvent(async () => {
    try {
      const response = await displayApi.getDevices();
      const nextDevices = response.data.devices || [];
      const preferredDevice = pickPreferredDevice(nextDevices);

      setDevices(nextDevices);
      setSelectedDeviceId((current) => {
        if (current && nextDevices.some((device) => device.id === current)) {
          return current;
        }

        return preferredDevice?.id || null;
      });
      setDeviceError('');
    } catch (error) {
      setDevices([]);
      setSelectedDeviceId(null);
      setDeviceError(error.message || '获取展示设备失败');
    }
  });

  const bootstrap = useEffectEvent(async () => {
    try {
      setLoading(true);
      setMessage('');
      await Promise.all([loadPinyinOverview(), loadDevices()]);
    } catch (error) {
      setMessage(error.message || '加载拼音课程失败');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    bootstrap();
  }, []);

  const lessons = flattenLessons(stages);
  const completedSet = new Set(summary?.completedLessonIds || []);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) || lessons[0] || null;
  const selectedStage = stages.find((stage) => stage.id === selectedLesson?.stageId) || null;
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) || null;
  const currentStep = selectedLesson?.steps?.[currentStepIndex] || selectedLesson?.steps?.[0] || null;
  const currentFlowStage = selectedLesson?.teachingFlow.find((stage) => (
    stage.steps.some((step) => step.id === currentStep?.id)
  )) || selectedLesson?.teachingFlow?.[0] || null;
  const currentModeMeta = MODE_META[currentStep?.controllerMode] || MODE_META.tap;

  useEffect(() => {
    setCurrentStepIndex(0);
  }, [selectedLessonId]);

  const syncDisplaySelection = useEffectEvent(async () => {
    if (!selectedLesson || !selectedDevice || !currentStep || !summary) {
      return;
    }

    try {
      setSyncing(true);
      const payload = buildDisplayPayload({
        summary,
        selectedLesson,
        currentStep,
        currentStage: currentFlowStage,
        completedSet,
      });

      await displayApi.updateDeviceState(selectedDevice.id, {
        screenType: 'pinyin',
        payload,
      });
      setDeviceMessage(`已同步到 ${selectedDevice.name}`);
    } catch (error) {
      setDeviceMessage('');
      setMessage(error.message || '同步展示端失败');
    } finally {
      setSyncing(false);
    }
  });

  useEffect(() => {
    if (!selectedLesson || !selectedDevice || !currentStep || !summary) {
      return;
    }

    syncDisplaySelection();
  }, [
    currentStep,
    selectedLesson,
    selectedDevice,
    summary,
    currentStepIndex,
    selectedLessonId,
    selectedDeviceId,
    summary?.updatedAt,
    summary?.completedLessons,
  ]);

  const handleCompleteLesson = async () => {
    if (!selectedLesson || completedSet.has(selectedLesson.id)) {
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      const response = await pinyinApi.completeLesson(selectedLesson.id);
      setSummary(response.data.summary);
      setMessage(`已完成《${selectedLesson.title}》，进度已更新。`);
    } catch (error) {
      setMessage(error.message || '记录课程进度失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#fef3c7,_#fff7ed_30%,_#eff6ff)] px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-10 text-center text-slate-600 shadow-lg">
          正在准备拼音互动课堂...
        </div>
      </div>
    );
  }

  if (!selectedLesson || !summary || !currentStep) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#fef3c7,_#fff7ed_30%,_#eff6ff)] px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-10 text-center text-slate-600 shadow-lg">
          当前没有可用的拼音课程内容。
        </div>
      </div>
    );
  }

  const atFirstStep = currentStepIndex === 0;
  const atLastStep = currentStepIndex === selectedLesson.totalStepCount - 1;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed,_#fefce8_18%,_#ecfeff_58%,_#ffffff)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="overflow-hidden rounded-[38px] bg-[linear-gradient(135deg,_#111827,_#0f172a_48%,_#1e293b)] p-6 text-white shadow-2xl shadow-slate-300/40">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-amber-100">
                  点击课程后进入单课课堂
                </span>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-cyan-100">
                  手机端控制展示端节奏
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-400">{selectedStage?.title}</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {selectedLesson.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  {selectedLesson.tagline}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">当前步骤</p>
                  <p className="mt-2 text-3xl font-black">{currentStep.stepIndex} / {selectedLesson.totalStepCount}</p>
                  <p className="mt-2 text-xs text-slate-300">{currentFlowStage?.title}</p>
                </div>
                <div className="rounded-[24px] bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">控制方式</p>
                  <p className="mt-2 text-2xl font-black">{currentModeMeta.label}</p>
                  <p className="mt-2 text-xs text-slate-300">{currentModeMeta.hint}</p>
                </div>
                <div className="rounded-[24px] bg-white p-4 text-slate-900">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">总进度</p>
                  <p className="mt-2 text-3xl font-black">{summary.completionRate}%</p>
                  <p className="mt-2 text-xs text-slate-500">
                    已完成 {summary.completedLessons} / {summary.totalLessons}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] bg-white/8 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-cyan-200">展示端联动</p>
                  <h2 className="mt-2 text-2xl font-black">
                    {selectedDevice ? selectedDevice.name : '尚未选择展示设备'}
                  </h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedDevice ? getDeviceStatusMeta(selectedDevice.status).className : 'bg-slate-700 text-slate-200'}`}>
                  {selectedDevice ? getDeviceStatusMeta(selectedDevice.status).label : '未连接'}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {devices.length > 0 ? devices.map((device) => {
                  const isSelected = device.id === selectedDeviceId;

                  return (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => setSelectedDeviceId(device.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isSelected
                          ? 'bg-cyan-300 text-slate-950'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {device.name}
                    </button>
                  );
                }) : (
                  <Link
                    to="/control"
                    className="inline-flex rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    去绑定展示端
                  </Link>
                )}
              </div>

              <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/35 p-4 text-sm leading-7 text-slate-300">
                {devices.length === 0 && '当前没有可同步的展示端，请先去控制台绑定电视或投影。'}
                {devices.length > 0 && selectedDevice && !syncing && !deviceMessage && !deviceError && `手机点击“上一步 / 下一步”后，${selectedDevice.name} 会切到相同分镜。`}
                {syncing && '正在把当前课堂分镜同步到展示端...'}
                {!syncing && deviceMessage && deviceMessage}
                {deviceError && deviceError}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex((current) => Math.max(current - 1, 0))}
                  disabled={atFirstStep}
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(0)}
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  回到开场
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex((current) => Math.min(current + 1, selectedLesson.totalStepCount - 1))}
                  disabled={atLastStep}
                  className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  下一步
                </button>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-[24px] border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-800">
            {message}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[34px] bg-white p-5 shadow-xl shadow-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">36 节课</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">课程目录</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                单击切课
              </span>
            </div>

            <div className="mt-5 max-h-[calc(100vh-250px)] space-y-5 overflow-y-auto pr-1">
              {stages.map((stage) => (
                <div key={stage.id}>
                  <div className="rounded-[22px] bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">{stage.title}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{stage.description}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {stage.lessons.map((lesson) => {
                      const isSelected = lesson.id === selectedLesson.id;
                      const isCompleted = completedSet.has(lesson.id);

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                            isSelected
                              ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-orange-200 hover:bg-orange-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isSelected ? 'text-amber-200' : 'text-slate-400'}`}>
                                Lesson {lesson.order}
                              </p>
                              <p className="mt-1 text-sm font-bold">{lesson.title}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              isSelected
                                ? 'bg-white/15 text-white'
                                : isCompleted
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isCompleted ? '已完成' : '待学习'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="space-y-6">
            <ScenePreview lesson={selectedLesson} currentStep={currentStep} currentFlowStage={currentFlowStage} />

            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-6">
                <StepControlWidget currentStep={currentStep} lesson={selectedLesson} />

                <div className="rounded-[34px] bg-white p-6 shadow-xl shadow-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">当前操作脚本</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-950">{currentStep.title}</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {currentModeMeta.label}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[24px] bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">手机操作</p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{currentStep.controllerScene}</p>
                    </div>
                    <div className="rounded-[24px] bg-orange-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">交互内容</p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{currentStep.interaction}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[34px] bg-white p-6 shadow-xl shadow-slate-200">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">课堂板块</p>
                  <div className="mt-4 grid gap-3">
                    {selectedLesson.teachingFlow.map((flowStage) => {
                      const isActive = flowStage.id === currentFlowStage?.id;
                      const isDone = flowStage.steps.every((step) => step.stepIndex < currentStep.stepIndex);

                      return (
                        <div
                          key={flowStage.id}
                          className={`rounded-[24px] border p-4 ${
                            isActive
                              ? 'border-amber-300 bg-amber-50'
                              : isDone
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-base font-black text-slate-900">{flowStage.title}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                              {flowStage.stepCount} 步
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{flowStage.summary}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[34px] bg-white p-6 shadow-xl shadow-slate-200">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">本课目标与提示</p>
                  <div className="mt-4 space-y-3">
                    {selectedLesson.goals.map((goal) => (
                      <div key={goal} className="flex gap-3">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                        <p className="text-sm leading-7 text-slate-700">{goal}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedLesson.focus.map((item) => (
                      <span key={item} className="rounded-full bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">练习句</p>
                    <p className="mt-2 text-base font-semibold leading-7 text-slate-900">{selectedLesson.practiceSentence}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{selectedLesson.miniTask}</p>
                  </div>
                </div>

                <div className="rounded-[34px] bg-white p-6 shadow-xl shadow-slate-200">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">资源待补方案</p>
                  <div className="mt-4 space-y-3">
                    {(currentStep.resources || []).length > 0 ? currentStep.resources.map((resource) => (
                      <div key={resource.label} className="rounded-[22px] bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-900">{resource.label}</span>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            待补
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{resource.solution}</p>
                      </div>
                    )) : (
                      selectedLesson.assetNotes.map((resource) => (
                        <div key={resource.label} className="rounded-[22px] bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-900">{resource.label}</span>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              待补
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{resource.solution}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCompleteLesson}
                    disabled={saving || completedSet.has(selectedLesson.id)}
                    className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {completedSet.has(selectedLesson.id)
                      ? '本课已完成'
                      : saving
                        ? '正在记录进度...'
                        : '完成本课并更新进度'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Pinyin;
