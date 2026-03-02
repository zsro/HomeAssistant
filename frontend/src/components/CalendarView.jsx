import { useEffect, useState } from 'react';
import { starPrepApi } from '../api/config';

function CalendarView() {
  const [calendar, setCalendar] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState(null);

  useEffect(() => {
    loadCalendar();
  }, [currentDate]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await starPrepApi.getCalendar({ year, month });
      if (response.success) {
        setCalendar(response.data.calendar);
        setActiveTemplate(response.data.activeTemplate);
      }
    } catch (error) {
      console.error('加载日历失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 当前模板信息 */}
      {activeTemplate && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">当前使用模板</h3>
              <p className="text-blue-700 text-sm mt-1">{activeTemplate.name}</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              进行中
            </span>
          </div>
        </div>
      )}

      {/* 日历头部 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              今天
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-2">
          {calendar.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-[100px] p-2 rounded-lg border transition-colors
                ${isToday(day.date) ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}
                ${day.hasActivity ? 'cursor-pointer' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${isToday(day.date) ? 'text-blue-600' : 'text-gray-700'}`}>
                  {day.day}
                </span>
                {day.checkedCount > 0 && (
                  <span className="text-xs text-green-600">
                    {day.checkedCount}人打卡
                  </span>
                )}
              </div>
              
              {day.hasActivity && (
                <div className="space-y-1">
                  <div className="text-xs text-blue-600 font-medium truncate">
                    {day.activityInfo?.theme}
                  </div>
                  <div className="text-xs text-gray-400">
                    {day.activityInfo?.activityCount}个活动
                  </div>
                </div>
              )}
              
              {/* 打卡用户头像 */}
              {day.checkedUsers?.length > 0 && (
                <div className="flex -space-x-1 mt-2">
                  {day.checkedUsers.slice(0, 3).map((user, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full bg-green-100 border border-white flex items-center justify-center"
                      title={user.name}
                    >
                      <span className="text-xs text-green-700">{user.name.charAt(0)}</span>
                    </div>
                  ))}
                  {day.checkedUsers.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center">
                      <span className="text-xs text-gray-600">+{day.checkedUsers.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 rounded bg-blue-50"></div>
          <span>今天</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border border-gray-200 rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <span>有活动</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-xs text-green-700">A</span>
          </div>
          <span>已打卡</span>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
