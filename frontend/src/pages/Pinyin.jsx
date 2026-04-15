import { useEffect, useEffectEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { displayApi, pinyinApi } from '../api/config';

const STEP_MODE_LABELS = {
  choices: '点击选择',
  joystick: '方向控制',
  shake: '摇一摇',
  spotlight: '探照灯',
  tap: '点击触发',
  trace: '跟写同步',
  voice: '语音跟读',
};

function flattenLessons(stages) {
  return stages.flatMap((stage) => stage.lessons);
}

function formatUpdatedAt(value) {
  if (!value) {
    return '尚未记录';
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const recommendedLesson = lessons.find((lesson) => lesson.id === summary?.currentLessonId) || null;
  const selectedLessonIndex = selectedLesson ? lessons.findIndex((lesson) => lesson.id === selectedLesson.id) : -1;
  const nextLesson = selectedLessonIndex >= 0 ? lessons[selectedLessonIndex + 1] || null : null;
  const currentStep = selectedLesson?.steps?.[currentStepIndex] || selectedLesson?.steps?.[0] || null;
  const currentFlowStage = selectedLesson?.teachingFlow.find((stage) => (
    stage.steps.some((step) => step.id === currentStep?.id)
  )) || selectedLesson?.teachingFlow?.[0] || null;

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
    selectedLessonId,
    selectedLesson,
    selectedDeviceId,
    selectedDevice,
    currentStepIndex,
    summary?.completedLessons,
    summary?.updatedAt,
    summary,
  ]);

  const handleCompleteLesson = async () => {
    if (!selectedLesson || completedSet.has(selectedLesson.id)) {
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      const response = await pinyinApi.completeLesson(selectedLesson.id);
      const nextSummary = response.data.summary;

      setSummary(nextSummary);
      setMessage(`已完成《${selectedLesson.title}》，学习进度已更新。`);
    } catch (error) {
      setMessage(error.message || '记录课程进度失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePrevStep = () => {
    setCurrentStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleNextStep = () => {
    if (!selectedLesson) {
      return;
    }

    setCurrentStepIndex((current) => Math.min(current + 1, selectedLesson.totalStepCount - 1));
  };

  const handleResetLesson = () => {
    setCurrentStepIndex(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#fef3c7,_#fff7ed_30%,_#eff6ff)] px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-10 text-center text-slate-600 shadow-lg">
          正在准备 36 节拼音互动课程...
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
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fef3c7,_#fff7ed_26%,_#eff6ff_72%,_#ffffff)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,_#111827,_#0f172a_45%,_#1e293b)] p-6 text-white shadow-2xl shadow-slate-300/40">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-amber-100">
                  拼音互动课堂
                </span>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-cyan-100">
                  {selectedLesson.lessonType}
                </span>
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  {selectedStage?.title} · Lesson {selectedLesson.order}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {selectedLesson.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  {selectedLesson.tagline}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">课程进度</p>
                  <p className="mt-2 text-3xl font-black">
                    {currentStep.stepIndex} / {selectedLesson.totalStepCount}
                  </p>
                  <p className="mt-2 text-xs text-slate-300">
                    当前板块：{currentFlowStage?.title}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">整体进度</p>
                  <p className="mt-2 text-3xl font-black">{summary.completionRate}%</p>
                  <p className="mt-2 text-xs text-slate-300">
                    已完成 {summary.completedLessons} / {summary.totalLessons}
                  </p>
                </div>
                <div className="rounded-[24px] bg-white p-4 text-slate-900">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">当前推荐</p>
                  <p className="mt-2 text-lg font-black">{recommendedLesson?.title || '全部完成'}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    最近更新 {formatUpdatedAt(summary.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white/8 p-5 backdrop-blur">
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
                {devices.length === 0 && '当前没有可同步的展示端，请先到控制台绑定电视或投影。'}
                {devices.length > 0 && selectedDevice && !syncing && !deviceMessage && !deviceError && `手机端会把“${currentStep.title}”实时推送到 ${selectedDevice.name}。`}
                {syncing && '正在把当前步骤同步到展示端...'}
                {!syncing && deviceMessage && deviceMessage}
                {deviceError && deviceError}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={atFirstStep}
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  上一步
                </button>
                <button
                  type="button"
                  onClick={handleResetLesson}
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  回到开场
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
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

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[32px] bg-white p-5 shadow-xl shadow-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">36 节课程</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">点击进入单课</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                可直接切课
              </span>
            </div>

            <div className="mt-5 space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {stages.map((stage) => (
                <div key={stage.id} className="space-y-3">
                  <div className="rounded-[24px] bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">{stage.title}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{stage.description}</p>
                  </div>

                  <div className="space-y-2">
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
            <section className="rounded-[32px] bg-white p-6 shadow-xl shadow-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      {selectedLesson.lessonBadge}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      约 {selectedLesson.durationMinutes} 分钟
                    </span>
                  </div>
                  <h2 className="mt-3 text-3xl font-black text-slate-950">
                    {selectedLesson.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                    {selectedLesson.tagline}
                  </p>
                </div>

                <div className="rounded-[24px] bg-slate-950 px-5 py-4 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">当前步骤</p>
                  <p className="mt-2 text-xl font-black">
                    第 {currentStep.stepIndex} 步 · {currentStep.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    手机操作：{STEP_MODE_LABELS[currentStep.controllerMode] || currentStep.controllerMode}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-4">
                {selectedLesson.teachingFlow.map((flowStage) => {
                  const isActive = flowStage.id === currentFlowStage?.id;
                  const isDone = flowStage.steps.every((step) => step.stepIndex < currentStep.stepIndex);

                  return (
                    <div
                      key={flowStage.id}
                      className={`rounded-[24px] border p-4 transition ${
                        isActive
                          ? 'border-amber-300 bg-amber-50'
                          : isDone
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        板块 {flowStage.order}
                      </p>
                      <p className="mt-2 text-base font-black text-slate-900">{flowStage.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{flowStage.summary}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="rounded-[32px] bg-[linear-gradient(135deg,_#0f172a,_#1e293b_55%,_#0f172a)] p-6 text-white shadow-xl shadow-slate-300/30">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.22em] text-cyan-200">当前分镜</p>
                      <h3 className="mt-2 text-3xl font-black">{currentStep.title}</h3>
                    </div>
                    <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                      {currentStep.stageTitle}
                    </span>
                  </div>

                  <div className="mt-6 rounded-[28px] bg-white/8 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">教师引导语</p>
                    <p className="mt-3 text-lg leading-8 text-white">{currentStep.teacherPrompt}</p>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[28px] bg-white p-5 text-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">电视画面</p>
                      <p className="mt-3 text-base leading-7">{currentStep.tvScene}</p>
                    </div>
                    <div className="rounded-[28px] bg-amber-50 p-5 text-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">手机操作</p>
                      <p className="mt-3 text-base leading-7">{currentStep.controllerScene}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] bg-cyan-50 p-5 text-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">交互内容</p>
                    <p className="mt-3 text-base leading-7">{currentStep.interaction}</p>
                    <div className="mt-4 rounded-[22px] bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">反馈表现</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{currentStep.feedback}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">高亮提示</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(currentStep.highlights || []).map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[30px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">资源状态</p>
                    <div className="mt-4 space-y-3">
                      {(currentStep.resources || []).length > 0 ? currentStep.resources.map((resource) => (
                        <div key={resource.label} className="rounded-[20px] bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-900">{resource.label}</span>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              待补充
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{resource.solution}</p>
                        </div>
                      )) : (
                        <p className="text-sm leading-7 text-slate-600">
                          当前步骤暂无额外素材依赖，可先用文字与动效占位实现。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[32px] bg-white p-6 shadow-xl shadow-slate-200">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">本课目标</p>
                  <div className="mt-4 space-y-3">
                    {selectedLesson.goals.map((goal) => (
                      <div key={goal} className="flex gap-3">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                        <p className="text-sm leading-7 text-slate-700">{goal}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[24px] bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">本课聚焦</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedLesson.focus.map((item) => (
                        <span key={item} className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] bg-white p-6 shadow-xl shadow-slate-200">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">课堂练习</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedLesson.practiceWords.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[24px] bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">练习句</p>
                    <p className="mt-2 text-base font-semibold leading-7 text-slate-900">
                      {selectedLesson.practiceSentence}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{selectedLesson.miniTask}</p>
                  </div>
                </div>

                <div className="rounded-[32px] bg-white p-6 shadow-xl shadow-slate-200">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">验收与资源方案</p>
                  <div className="mt-4 space-y-3">
                    {selectedLesson.checkpoints.map((point) => (
                      <div key={point} className="flex gap-3">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                        <p className="text-sm leading-7 text-slate-700">{point}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedLesson.assetNotes.map((item) => (
                      <div key={item.label} className="rounded-[22px] bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            待接入
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.solution}</p>
                      </div>
                    ))}
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

                <div className="rounded-[32px] bg-[linear-gradient(135deg,_#fff7ed,_#ffffff)] p-6 shadow-xl shadow-orange-100">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">下一步</p>
                  <p className="mt-3 text-lg font-black text-slate-900">
                    {selectedLesson.previewLesson}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {nextLesson
                      ? `如果要连续上课，可以直接切到《${nextLesson.title}》。`
                      : '当前已经是最后一节，可以收尾做总复习或结课展示。'}
                  </p>
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
