import { useEffect, useState } from 'react';
import { starPrepApi } from '../api/config';
import { useAuthStore } from '../stores/authStore';

function TodayActivity({ onCheckin, onNavigateToGenerate }) {
  const { user } = useAuthStore();
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      const response = await starPrepApi.getToday();
      if (response.success) {
        setTodayData(response.data);
      }
    } catch (error) {
      console.error('加载今日活动失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    try {
      setCheckingIn(true);
      const response = await starPrepApi.createCheckin({
        templateId: todayData?.template?.id,
      });
      
      if (response.success) {
        // 更新本地状态
        setTodayData(prev => ({ ...prev, checked: true }));
        if (onCheckin) onCheckin();
      }
    } catch (error) {
      console.error('打卡失败:', error);
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  // 没有今日活动
  if (!todayData?.hasActivity) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">今日暂无活动安排</h3>
        <p className="text-gray-600 mb-6">{todayData?.message || '当前没有活跃的活动模板'}</p>
        <button 
          onClick={onNavigateToGenerate}
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          生成活动模板
        </button>
      </div>
    );
  }

  const { activities, checked, template } = todayData;

  return (
    <div className="space-y-6">
      {/* 打卡状态卡片 */}
      <div className={`rounded-xl shadow-lg p-6 ${checked ? 'bg-green-50 border-2 border-green-200' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${checked ? 'bg-green-100' : 'bg-gray-100'}`}>
              {checked ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {checked ? '今日已打卡' : '今日还未打卡'}
              </h3>
              <p className="text-gray-600">
                {checked ? '继续加油！保持好习惯' : '进入星星预备班即可完成打卡'}
              </p>
            </div>
          </div>
          {!checked && (
            <button
              onClick={handleCheckin}
              disabled={checkingIn}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {checkingIn ? '打卡中...' : '立即打卡'}
            </button>
          )}
        </div>
      </div>

      {/* 今日活动安排 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{activities.theme}</h3>
            <p className="text-gray-500 mt-1">{activities.day} · {activities.date}</p>
          </div>
          {template && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {template.name}
            </span>
          )}
        </div>

        {/* 活动列表 */}
        <div className="space-y-4">
          {activities.activities?.map((activity, index) => (
            <div 
              key={index}
              className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-medium">{index + 1}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{activity.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {activity.duration}分钟
                  </span>
                  {activity.location && (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {activity.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 温馨提示 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-yellow-900">温馨提示</h4>
            <p className="text-sm text-yellow-800 mt-1">
              星星预备班建议每晚固定时间进行，有助于孩子建立良好的作息习惯。记得在活动过程中多给予孩子鼓励和陪伴哦！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TodayActivity;
