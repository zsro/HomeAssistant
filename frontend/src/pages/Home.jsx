import { useEffect, useEffectEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { pinyinApi } from '../api/config';

function Home() {
  const { user, family } = useAuthStore();
  const [summary, setSummary] = useState(null);

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

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#fff7ed_30%,_#f8fafc_70%)] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 px-8 py-10 text-white shadow-2xl shadow-slate-300/40">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-sm text-amber-200">
                家庭成长面板
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                  {user?.name}，今天先学十分钟，再去探索。
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  首页把家庭管理和基础学习放在一起。你可以直接进入拼音课程，按天完成小学一到三年级的拼音内容。
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full bg-white/10 px-4 py-2">
                  {family ? `当前家庭：${family.name}` : '当前还未加入家庭'}
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2">
                  拼音课程共 36 课，每课约 10 分钟
                </span>
              </div>
            </div>

            <div className="grid gap-4 rounded-[28px] bg-white/8 p-5 backdrop-blur">
              <div className="rounded-3xl bg-white px-5 py-4 text-slate-900">
                <p className="text-sm font-medium text-slate-500">拼音学习进度</p>
                <p className="mt-2 text-4xl font-black">
                  {summary ? `${summary.completedLessons}/${summary.totalLessons}` : '--'}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {summary?.currentLesson
                    ? `下一课：${summary.currentLesson.title}`
                    : '完成后会自动记录并推荐下一课'}
                </p>
              </div>
              <div className="rounded-3xl border border-white/15 px-5 py-4">
                <p className="text-sm text-slate-300">今天建议</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {summary?.currentLesson?.title || '从拼音启蒙开始'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  先完成一节拼音小课，再安排亲子活动，学习和陪伴都不会挤在一起。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-1">
          <Link
            to="/pinyin"
            className="group overflow-hidden rounded-[28px] bg-[#fff8ee] p-7 shadow-lg shadow-orange-200/60 transition-transform hover:-translate-y-1"
          >
            <div className="space-y-4">
              <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
                子栏目 01
              </span>
              <div>
                <h2 className="text-2xl font-black text-slate-900">中文拼音小课</h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  每天十分钟，覆盖小学 1-3 年级拼音内容。完成一课就自动记录，下次打开直接回到当前学习进度。
                </p>
              </div>
              <div className="grid gap-3 rounded-3xl bg-white p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>课程进度</span>
                  <span className="font-semibold text-slate-900">
                    {summary ? `${summary.completedLessons}/${summary.totalLessons}` : '未开始'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-orange-100">
                  <div
                    className="h-2 rounded-full bg-orange-500 transition-all"
                    style={{ width: `${summary?.completionRate || 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>{summary?.currentLesson?.title || '准备开始第一课'}</span>
                  <span className="font-semibold text-slate-900 group-hover:translate-x-1 transition-transform">开始</span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}

export default Home;
