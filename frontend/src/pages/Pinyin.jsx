import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { displayApi, pinyinApi } from '../api/config';

const PICKER_SCROLL_DEBOUNCE_MS = 80;

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

function buildPinyinDisplayPayload({ summary, selectedLesson, selectedStage, lessons, completedSet }) {
  return {
    title: '拼音课程选择',
    subtitle: summary?.currentLesson?.title || '从当前推荐课程开始',
    updatedAt: summary?.updatedAt || null,
    summary: {
      completedLessons: summary?.completedLessons || 0,
      totalLessons: summary?.totalLessons || 0,
      completionRate: summary?.completionRate || 0,
      currentLessonId: summary?.currentLessonId || null,
    },
    selectedLesson: {
      id: selectedLesson.id,
      order: selectedLesson.order,
      title: selectedLesson.title,
      tagline: selectedLesson.tagline,
      durationMinutes: selectedLesson.durationMinutes,
      stageTitle: selectedStage?.title || '拼音课程',
      practiceSentence: selectedLesson.practiceSentence,
      miniTask: selectedLesson.miniTask,
      goals: selectedLesson.goals.slice(0, 3),
      focus: selectedLesson.focus.slice(0, 4),
    },
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      order: lesson.order,
      title: lesson.title,
      stageId: lesson.stageId,
      isCompleted: completedSet.has(lesson.id),
      isCurrent: lesson.id === selectedLesson.id,
      isRecommended: lesson.id === summary?.currentLessonId,
    })),
  };
}

function Pinyin() {
  const [stages, setStages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [deviceMessage, setDeviceMessage] = useState('');
  const [deviceError, setDeviceError] = useState('');
  const pickerRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const hasCenteredSelectionRef = useRef(false);

  const loadPinyinOverview = useEffectEvent(async () => {
    const response = await pinyinApi.getOverview();
    const nextStages = response.data.stages || [];
    const nextSummary = response.data.summary || null;
    const firstLesson = flattenLessons(nextStages)[0] || null;

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
      await Promise.all([
        loadPinyinOverview(),
        loadDevices(),
      ]);
    } catch (error) {
      setMessage(error.message || '加载拼音模块失败');
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

  const centerPickerOnLesson = useEffectEvent((lessonId, behavior = 'smooth') => {
    const container = pickerRef.current;
    if (!container || !lessonId) {
      return;
    }

    const element = container.querySelector(`[data-lesson-id="${lessonId}"]`);
    if (!element) {
      return;
    }

    const nextTop = element.offsetTop - ((container.clientHeight - element.clientHeight) / 2);
    container.scrollTo({
      top: Math.max(nextTop, 0),
      behavior,
    });
  });

  const syncDisplaySelection = useEffectEvent(async () => {
    if (!selectedDevice || !selectedLesson || !summary) {
      return;
    }

    try {
      setSyncing(true);
      const payload = buildPinyinDisplayPayload({
        summary,
        selectedLesson,
        selectedStage,
        lessons,
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
    if (!selectedLesson) {
      return;
    }

    const behavior = hasCenteredSelectionRef.current ? 'smooth' : 'auto';
    hasCenteredSelectionRef.current = true;
    centerPickerOnLesson(selectedLesson.id, behavior);
  }, [selectedLessonId, selectedLesson]);

  useEffect(() => {
    if (!selectedLessonId || !selectedDeviceId || !summary?.totalLessons) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      syncDisplaySelection();
    }, PICKER_SCROLL_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    selectedLessonId,
    selectedDeviceId,
    summary?.completedLessons,
    summary?.completionRate,
    summary?.currentLessonId,
    summary?.totalLessons,
    summary?.updatedAt,
  ]);

  const updateSelectedLessonFromScroll = () => {
    const container = pickerRef.current;
    if (!container || lessons.length === 0) {
      return;
    }

    const containerCenter = container.scrollTop + (container.clientHeight / 2);
    let nearestLessonId = selectedLessonId;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const lesson of lessons) {
      const element = container.querySelector(`[data-lesson-id="${lesson.id}"]`);
      if (!element) {
        continue;
      }

      const elementCenter = element.offsetTop + (element.clientHeight / 2);
      const distance = Math.abs(elementCenter - containerCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestLessonId = lesson.id;
      }
    }

    if (nearestLessonId && nearestLessonId !== selectedLessonId) {
      setSelectedLessonId(nearestLessonId);
    }
  };

  const handlePickerScroll = () => {
    if (scrollAnimationRef.current) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
    }

    scrollAnimationRef.current = window.requestAnimationFrame(() => {
      updateSelectedLessonFromScroll();
    });
  };

  useEffect(() => (
    () => {
      if (scrollAnimationRef.current) {
        window.cancelAnimationFrame(scrollAnimationRef.current);
      }
    }
  ), []);

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
      setSelectedLessonId(nextSummary.currentLessonId || selectedLesson.id);
      setMessage(`已完成《${selectedLesson.title}》，进度已更新。`);
    } catch (error) {
      setMessage(error.message || '记录学习进度失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed,_#ffffff_24%,_#ecfeff)] px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-10 text-center text-slate-600 shadow-lg">
          正在准备拼音课程与展示端联动...
        </div>
      </div>
    );
  }

  if (!selectedLesson || !summary) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed,_#ffffff_24%,_#ecfeff)] px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-[32px] bg-white p-10 text-center text-slate-600 shadow-lg">
          当前没有可用的拼音课程内容。
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed,_#ffffff_24%,_#ecfeff)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 px-6 py-6 text-white shadow-2xl shadow-slate-300/40 sm:px-7">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-orange-300/30 bg-orange-300/10 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-orange-200">
                  拼音联动模块
                </span>
                <span className="text-sm text-slate-400">
                  进入后即准备和展示端同步
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  当前进度与课程选择
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  控制端优先按手机操作设计。上下滑动课程列表时，会把当前选中的拼音课程实时推送到电视展示端，形成同步 pickerview。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">已完成</p>
                  <p className="mt-2 text-3xl font-black">{summary.completedLessons}</p>
                  <p className="mt-2 text-xs text-slate-400">总课数 {summary.totalLessons}</p>
                </div>
                <div className="rounded-[24px] bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">当前推荐</p>
                  <p className="mt-2 text-lg font-black">{recommendedLesson?.title || '全部完成'}</p>
                  <p className="mt-2 text-xs text-slate-400">最近记录 {formatUpdatedAt(summary.updatedAt)}</p>
                </div>
                <div className="rounded-[24px] bg-white p-4 text-slate-900">
                  <div className="flex items-center justify-between text-sm">
                    <span>整体进度</span>
                    <span className="font-semibold">{summary.completionRate}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-orange-100">
                    <div
                      className="h-2 rounded-full bg-orange-500 transition-all"
                      style={{ width: `${summary.completionRate}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    Lesson {selectedLesson.order}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white/8 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-cyan-200">展示端同步</p>
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

              <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/40 p-4 text-sm leading-7 text-slate-300">
                {devices.length === 0 && '当前没有可同步的展示端，先去控制端完成绑定。'}
                {devices.length > 0 && selectedDevice && !deviceError && !deviceMessage && !syncing && `当前会把 ${selectedLesson.title} 推送到 ${selectedDevice.name}。`}
                {syncing && '正在同步选课状态到展示端...'}
                {!syncing && deviceMessage && deviceMessage}
                {deviceError && deviceError}
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-[26px] border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-800">
            {message}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-[32px] bg-white p-5 shadow-xl shadow-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
                  课程选择
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  上下滑动选课
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                苹果式 pickerview
              </span>
            </div>

            <div className="relative mt-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 rounded-t-[28px] bg-gradient-to-b from-white via-white/85 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 rounded-b-[28px] bg-gradient-to-t from-white via-white/85 to-transparent" />
              <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-[76px] -translate-y-1/2 rounded-[24px] border border-orange-200 bg-orange-50/70 shadow-[0_12px_30px_rgba(251,146,60,0.12)]" />

              <div
                ref={pickerRef}
                onScroll={handlePickerScroll}
                className="no-scrollbar h-[360px] snap-y snap-mandatory overflow-y-auto rounded-[28px] bg-[linear-gradient(180deg,_#fff7ed,_#ffffff_24%,_#eff6ff)] px-3 py-[142px]"
              >
                <div className="space-y-3">
                  {lessons.map((lesson) => {
                    const isSelected = lesson.id === selectedLesson.id;
                    const isCompleted = completedSet.has(lesson.id);
                    const isRecommended = summary.currentLessonId === lesson.id;

                    return (
                      <button
                        key={lesson.id}
                        data-lesson-id={lesson.id}
                        type="button"
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`flex w-full snap-center items-center justify-between rounded-[24px] px-4 py-4 text-left transition ${
                          isSelected
                            ? 'scale-[1.01] bg-slate-950 text-white shadow-lg shadow-slate-200'
                            : 'bg-white/80 text-slate-900 shadow-sm shadow-slate-100 hover:bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isSelected ? 'text-orange-200' : 'text-slate-400'}`}>
                            Lesson {lesson.order}
                          </p>
                          <p className="mt-1 truncate text-base font-bold">{lesson.title}</p>
                        </div>
                        <div className="ml-3 flex shrink-0 flex-col items-end gap-2">
                          {isRecommended && (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? 'bg-white/15 text-white' : 'bg-orange-100 text-orange-700'}`}>
                              当前推荐
                            </span>
                          )}
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              手机端上下滑动选择课程时，电视会同步切到相同课程高亮。
            </p>
          </div>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-[32px] bg-white shadow-xl shadow-slate-200">
              <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff)] px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        {selectedStage?.title || '拼音课程'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        约 {selectedLesson.durationMinutes} 分钟
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Lesson {selectedLesson.order}
                      </p>
                      <h2 className="mt-2 text-3xl font-black text-slate-900">{selectedLesson.title}</h2>
                      <p className="mt-3 text-base leading-7 text-slate-600">{selectedLesson.tagline}</p>
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-slate-950 px-5 py-4 text-white">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">展示端同步状态</p>
                    <p className="mt-2 text-lg font-semibold">
                      {selectedDevice ? selectedDevice.name : '未绑定展示端'}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {selectedDevice
                        ? syncing
                          ? '滑动中，正在同步到电视'
                          : '当前课程已可在大屏同步展示'
                        : '先绑定展示端后再同步到电视'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  <div className="rounded-[28px] bg-slate-50 p-5">
                    <h3 className="text-lg font-black text-slate-900">本课目标</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                      {selectedLesson.goals.map((goal) => (
                        <li key={goal} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 p-5">
                    <h3 className="text-lg font-black text-slate-900">10 分钟学习步骤</h3>
                    <ol className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
                      {selectedLesson.teachingSteps.map((step, index) => (
                        <li key={step} className="flex gap-4">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[28px] bg-slate-950 p-5 text-white">
                    <h3 className="text-lg font-black">本课关注点</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedLesson.focus.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/15 px-3 py-1 text-sm text-slate-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-5">
                    <h3 className="text-lg font-black text-slate-900">小练习</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedLesson.practiceWords.map((word) => (
                        <span
                          key={word}
                          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 rounded-[24px] bg-white px-4 py-4 text-sm leading-7 text-slate-700 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">练习句</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{selectedLesson.practiceSentence}</p>
                      <p className="mt-3 text-sm text-slate-600">{selectedLesson.miniTask}</p>
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <h3 className="text-lg font-black text-slate-900">完成标准</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                      {selectedLesson.checkpoints.map((point) => (
                        <li key={point} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={handleCompleteLesson}
                      disabled={saving || completedSet.has(selectedLesson.id)}
                      className="mt-5 w-full rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {completedSet.has(selectedLesson.id)
                        ? '本课已完成'
                        : saving
                          ? '正在记录进度...'
                          : '完成今天课程并记录进度'}
                    </button>
                  </div>
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
