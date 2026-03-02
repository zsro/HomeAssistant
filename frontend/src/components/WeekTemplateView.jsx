function WeekTemplateView({ template }) {
  const days = template.days || [];
  
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="space-y-6">
      {/* 模板信息 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
        <p className="text-gray-600 mt-2">{template.description}</p>
        <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
          <span>适合年龄: {template.childAge}岁</span>
          <span>·</span>
          <span>季节: {template.season}</span>
          <span>·</span>
          <span>每日时长: {template.duration}分钟</span>
        </div>
      </div>

      {/* 一周活动 */}
      <div className="grid gap-4">
        {days.map((day, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{weekDays[index]}</h3>
                  <p className="text-blue-100 text-sm">{day.date}</p>
                </div>
                <span className="px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-sm">
                  {day.theme}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-3">
                {day.activities?.map((activity, actIndex) => (
                  <div 
                    key={actIndex}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 text-sm font-medium">{actIndex + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{activity.name}</h4>
                      <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                      <span className="text-xs text-gray-400 mt-1">{activity.duration}分钟</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeekTemplateView;
