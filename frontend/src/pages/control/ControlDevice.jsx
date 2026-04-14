import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { displayApi } from '../../api/config';

const INITIAL_FORM_STATE = {
  home: {
    title: '欢迎来到家庭展示屏',
    subtitle: '可以开始今天的家庭安排',
    hint: '请在手机端继续切换内容',
  },
  pinyin: {
    title: '拼音练习时间',
    focusText: 'ai ei ui',
    note: '先读三遍，再跟着拼读',
  },
  star_prep: {
    title: '星星预备班',
    schedule: '1. 热身 2. 拼音 3. 亲子活动',
    footer: '完成后记得打卡',
  },
  message: {
    title: '休息一下',
    subtitle: '五分钟后继续',
  },
  image: {
    title: '图片展示',
    imageUrl: '',
    caption: '请输入一张公开可访问的图片地址',
  },
};

function buildPayload(screenType, formState) {
  switch (screenType) {
    case 'home':
      return {
        title: formState.home.title,
        subtitle: formState.home.subtitle,
        hint: formState.home.hint,
      };
    case 'pinyin':
      return {
        title: formState.pinyin.title,
        focusText: formState.pinyin.focusText,
        note: formState.pinyin.note,
      };
    case 'star_prep':
      return {
        title: formState.star_prep.title,
        schedule: formState.star_prep.schedule,
        footer: formState.star_prep.footer,
      };
    case 'message':
      return {
        title: formState.message.title,
        subtitle: formState.message.subtitle,
      };
    case 'image':
      return {
        title: formState.image.title,
        imageUrl: formState.image.imageUrl,
        caption: formState.image.caption,
      };
    default:
      return {};
  }
}

function ControlDevice() {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [screenType, setScreenType] = useState('home');
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [currentState, setCurrentState] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDeviceState() {
      try {
        const [devicesResponse, stateResponse] = await Promise.all([
          displayApi.getDevices(),
          displayApi.getDeviceState(deviceId),
        ]);

        if (!active) {
          return;
        }

        const matchedDevice = (devicesResponse.data.devices || []).find((item) => item.id === deviceId) || null;
        const nextState = stateResponse.data || null;

        setDevice(matchedDevice);
        setCurrentState(nextState);
        if (nextState?.screenType) {
          setScreenType(nextState.screenType);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || '获取展示设备失败');
        }
      }
    }

    loadDeviceState();
    const intervalId = window.setInterval(loadDeviceState, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [deviceId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await displayApi.updateDeviceState(deviceId, {
        screenType,
        payload: buildPayload(screenType, formState),
      });

      setCurrentState(response.data);
      setSuccessMessage(response.msg || '展示内容已更新');
    } catch (submitError) {
      setError(submitError.message || '更新展示内容失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateSection(section, field, value) {
    setFormState((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc,_#ffffff_30%,_#ecfeff)] px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[30px] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-300/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link to="/control" className="text-sm text-slate-400 transition hover:text-white">
                返回控制台
              </Link>
              <h1 className="mt-3 text-3xl font-black">
                {device?.name || '展示设备'}
              </h1>
            </div>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
              {device?.status === 'active' ? '在线' : device?.status === 'idle' ? '待机' : '离线'}
            </span>
          </div>

          <div className="mt-6 grid gap-4 rounded-[28px] bg-white/8 p-5">
            <div>
              <p className="text-sm text-slate-400">当前画面</p>
              <p className="mt-2 text-2xl font-bold">{currentState?.screenType || '未设置'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">设备编号</p>
              <p className="mt-2 break-all font-mono text-sm text-slate-200">{deviceId}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">最后在线</p>
              <p className="mt-2 text-sm text-slate-200">
                {device?.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : '暂无'}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">当前 payload</p>
            <pre className="mt-3 overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-slate-100">
              {JSON.stringify(currentState?.payload || {}, null, 2)}
            </pre>
          </div>
        </section>

        <section className="rounded-[30px] bg-white p-7 shadow-xl shadow-slate-200">
          <h2 className="text-2xl font-black text-slate-900">切换展示内容</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            第一阶段先用状态覆盖的方式切换画面。电视端会自动轮询并刷新内容。
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">展示类型</span>
              <select
                value={screenType}
                onChange={(event) => setScreenType(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400"
              >
                <option value="home">家庭欢迎页</option>
                <option value="pinyin">拼音展示</option>
                <option value="star_prep">预备班安排</option>
                <option value="message">全屏消息</option>
                <option value="image">图片展示</option>
              </select>
            </label>

            {screenType === 'home' && (
              <>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">标题</span>
                  <input
                    value={formState.home.title}
                    onChange={(event) => updateSection('home', 'title', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">副标题</span>
                  <input
                    value={formState.home.subtitle}
                    onChange={(event) => updateSection('home', 'subtitle', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">提示语</span>
                  <input
                    value={formState.home.hint}
                    onChange={(event) => updateSection('home', 'hint', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
              </>
            )}

            {screenType === 'pinyin' && (
              <>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">标题</span>
                  <input
                    value={formState.pinyin.title}
                    onChange={(event) => updateSection('pinyin', 'title', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">重点内容</span>
                  <input
                    value={formState.pinyin.focusText}
                    onChange={(event) => updateSection('pinyin', 'focusText', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">提示</span>
                  <input
                    value={formState.pinyin.note}
                    onChange={(event) => updateSection('pinyin', 'note', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
              </>
            )}

            {screenType === 'star_prep' && (
              <>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">标题</span>
                  <input
                    value={formState.star_prep.title}
                    onChange={(event) => updateSection('star_prep', 'title', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">安排内容</span>
                  <textarea
                    rows="4"
                    value={formState.star_prep.schedule}
                    onChange={(event) => updateSection('star_prep', 'schedule', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">底部说明</span>
                  <input
                    value={formState.star_prep.footer}
                    onChange={(event) => updateSection('star_prep', 'footer', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
              </>
            )}

            {screenType === 'message' && (
              <>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">主标题</span>
                  <input
                    value={formState.message.title}
                    onChange={(event) => updateSection('message', 'title', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">副标题</span>
                  <input
                    value={formState.message.subtitle}
                    onChange={(event) => updateSection('message', 'subtitle', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
              </>
            )}

            {screenType === 'image' && (
              <>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">标题</span>
                  <input
                    value={formState.image.title}
                    onChange={(event) => updateSection('image', 'title', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">图片地址</span>
                  <input
                    value={formState.image.imageUrl}
                    onChange={(event) => updateSection('image', 'imageUrl', event.target.value)}
                    placeholder="https://..."
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">说明</span>
                  <input
                    value={formState.image.caption}
                    onChange={(event) => updateSection('image', 'caption', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400"
                  />
                </label>
              </>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '更新中...' : '推送到展示端'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ControlDevice;
