import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { displayApi } from '../../api/config';
import { useAuthStore } from '../../stores/authStore';

function ControlHome() {
  const { family } = useAuthStore();
  const [devices, setDevices] = useState([]);
  const [pairCode, setPairCode] = useState('');
  const [deviceName, setDeviceName] = useState('客厅电视');
  const [isPairing, setIsPairing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDevices() {
      try {
        const response = await displayApi.getDevices();
        if (active) {
          setDevices(response.data.devices || []);
          setError('');
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || '获取展示设备失败');
        }
      }
    }

    loadDevices();
    const intervalId = window.setInterval(loadDevices, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handlePairSubmit(event) {
    event.preventDefault();
    setIsPairing(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await displayApi.pair({
        pairCode,
        deviceName,
      });

      setSuccessMessage(response.msg || '展示端绑定成功');
      setPairCode('');

      const devicesResponse = await displayApi.getDevices();
      setDevices(devicesResponse.data.devices || []);
    } catch (pairError) {
      setError(pairError.message || '绑定展示端失败');
    } finally {
      setIsPairing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc,_#eff6ff_45%,_#fff7ed)] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-[32px] bg-slate-950 px-8 py-8 text-white shadow-2xl shadow-slate-300/40">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm text-cyan-200">
                控制端
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                  家庭展示控制台
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  手机登录后管理展示设备。先在电视上打开展示端，再输入配对码完成绑定，随后可以切换家庭欢迎页、拼音大字卡、预备班安排和全屏提示。
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full bg-white/10 px-4 py-2">
                  {family ? `当前家庭：${family.name}` : '当前未加入家庭'}
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2">
                  展示端入口：/display
                </span>
              </div>
            </div>

            <form
              onSubmit={handlePairSubmit}
              className="rounded-[28px] bg-white/8 p-6 backdrop-blur"
            >
              <h2 className="text-xl font-bold">绑定展示端</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                先在电视上打开展示端，输入 6 位配对码，把它绑定到当前家庭。
              </p>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm text-slate-200">配对码</span>
                  <input
                    type="text"
                    value={pairCode}
                    onChange={(event) => setPairCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="输入电视上的 6 位数字"
                    className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-lg tracking-[0.3em] text-white outline-none transition focus:border-cyan-300"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-slate-200">设备名称</span>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(event) => setDeviceName(event.target.value)}
                    placeholder="例如：客厅电视"
                    className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                  />
                </label>

                {error && (
                  <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {successMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPairing || !pairCode}
                  className="rounded-2xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPairing ? '绑定中...' : '绑定展示端'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {devices.length > 0 ? devices.map((device) => (
            <Link
              key={device.id}
              to={`/control/device/${device.id}`}
              className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    展示设备
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{device.name}</h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    device.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : device.status === 'idle'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {device.status === 'active' ? '在线' : device.status === 'idle' ? '待机' : '离线'}
                </span>
              </div>

              <div className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>当前画面</span>
                  <span className="font-semibold text-slate-900">{device.currentScreenType || '未设置'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>最后在线</span>
                  <span className="font-semibold text-slate-900">
                    {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : '暂无'}
                  </span>
                </div>
              </div>
            </Link>
          )) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-8 text-slate-600">
              <h2 className="text-xl font-bold text-slate-900">还没有展示设备</h2>
              <p className="mt-3 leading-7">
                先在电视、投影或平板上打开 `/display`，页面会生成一组 6 位配对码。回到这里输入配对码，就能开始控制显示内容。
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ControlHome;
