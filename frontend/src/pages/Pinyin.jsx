import { useEffect, useEffectEvent, useState } from 'react';
import { pinyinApi } from '../api/config';

function flattenLessons(stages) {
  return stages.flatMap((stage) => stage.lessons);
}

function formatUpdatedAt(value) {
  if (!value) {
    return '尚未记录';
  }

  return new Date(value).toLocaleString();
}

function Pinyin() {
  const [stages, setStages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadOverview = useEffectEvent(async () => {
    try {
      setLoading(true);
      const response = await pinyinApi.getOverview();

      if (response.success) {
        const nextStages = response.data.stages;
        const nextSummary = response.data.summary;
        const firstLesson = flattenLessons(nextStages)[0] || null;

        setStages(nextStages);
        setSummary(nextSummary);
        setSelectedLessonId(nextSummary.currentLessonId || firstLesson?.id || null);
      }
    } catch (error) {
      setMessage(error.message || '加载拼音课程失败');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    loadOverview();
  }, []);

  const lessons = flattenLessons(stages);
  const completedSet = new Set(summary?.completedLessonIds || []);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) || summary?.currentLesson || lessons[0] || null;
  const selectedStage = stages.find((stage) => stage.id === selectedLesson?.stageId) || null;

  const handleCompleteLesson = async () => {
    if (!selectedLesson || completedSet.has(selectedLesson.id)) {
      return;
    }

    try {
      setSaving(true);
      const response = await pinyinApi.completeLesson(selectedLesson.id);

      if (response.success) {
        const nextSummary = response.data.summary;
        setSummary(nextSummary);
        setSelectedLessonId(nextSummary.currentLessonId || selectedLesson.id);
        setMessage(`已完成《${selectedLesson.title}》，进度已自动保存。`);
      }
    } catch (error) {
      setMessage(error.message || '记录学习进度失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-[28px] bg-white p-10 text-center text-slate-600 shadow-lg">
          正在准备拼音课程...
        </div>
      </div>
    );
  }

  if (!selectedLesson) {
    return (
      <div className="min-h-screen bg-orange-50 px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-[28px] bg-white p-10 text-center text-slate-600 shadow-lg">
          当前没有可用的课程内容。
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed,_#ffffff_24%,_#f8fafc)] px-4 py-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl">
            <p className="text-sm text-amber-200">拼音学习总览</p>
            <h1 className="mt-3 text-3xl font-black">中文拼音小课</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              每课约 10 分钟，按小学 1-3 年级内容递进。完成后自动保存，下次直接接着学。
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">已完成</p>
                <p className="mt-2 text-3xl font-black">
                  {summary?.completedLessons ?? 0}
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">总课程</p>
                <p className="mt-2 text-3xl font-black">
                  {summary?.totalLessons ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-white px-4 py-4 text-slate-900">
              <div className="flex items-center justify-between text-sm">
                <span>整体进度</span>
                <span className="font-semibold">{summary?.completionRate ?? 0}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-orange-100">
                <div
                  className="h-2 rounded-full bg-orange-500 transition-all"
                  style={{ width: `${summary?.completionRate ?? 0}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                最近记录：{formatUpdatedAt(summary?.updatedAt)}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between px-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">课程目录</h2>
                <p className="text-xs text-slate-500">点击任意一课可回看</p>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                当前课：{selectedLesson.order}
              </span>
            </div>

            <div className="space-y-4">
              {stages.map((stage) => (
                <div key={stage.id} className="rounded-3xl bg-slate-50 p-3">
                  <div className="mb-3 px-2">
                    <p className="text-sm font-semibold text-slate-900">{stage.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{stage.description}</p>
                  </div>
                  <div className="space-y-2">
                    {stage.lessons.map((lesson) => {
                      const isCompleted = completedSet.has(lesson.id);
                      const isSelected = selectedLesson.id === lesson.id;

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                            isSelected
                              ? 'bg-slate-900 text-white'
                              : isCompleted
                                ? 'bg-emerald-50 text-slate-900'
                                : 'bg-white text-slate-900 hover:bg-orange-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                              Lesson {lesson.order}
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold">{lesson.title}</p>
                          </div>
                          <span className={`ml-3 shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                            isSelected
                              ? 'bg-white/15 text-white'
                              : isCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isCompleted ? '已完成' : '待学习'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          {message && (
            <div className="rounded-3xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-800">
              {message}
            </div>
          )}

          <section className="overflow-hidden rounded-[32px] bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_#fff7ed,_#ffffff)] px-7 py-7">
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

                <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">当前推荐</p>
                  <p className="mt-2 text-lg font-semibold">
                    {summary?.currentLesson?.id === selectedLesson.id
                      ? '就是这一课'
                      : summary?.currentLesson?.title || '已完成全部课程'}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {completedSet.has(selectedLesson.id) ? '这节课已经完成，可以随时回看。' : '完成后会自动切到下一课。'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-7 py-7 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div className="rounded-3xl bg-slate-50 p-5">
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

                <div className="rounded-3xl border border-slate-200 p-5">
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

                <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
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
                  <div className="mt-5 rounded-3xl bg-white px-4 py-4 text-sm leading-7 text-slate-700 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">练习句</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{selectedLesson.practiceSentence}</p>
                    <p className="mt-3 text-sm text-slate-600">{selectedLesson.miniTask}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl bg-slate-950 p-5 text-white">
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

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <h3 className="text-lg font-black text-slate-900">完成标准</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                    {selectedLesson.checkpoints.map((point) => (
                      <li key={point} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <h3 className="text-lg font-black text-slate-900">今天学完后</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    点下面的按钮就会自动记录。下次打开时，系统会优先把你带回当前推荐课程。
                  </p>
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
        </main>
      </div>
    </div>
  );
}

export default Pinyin;
