import { useState } from 'react'

function TemplateCard({ template }) {
  const [expandedActivity, setExpandedActivity] = useState(null)

  if (!template) return null

  const { dayOfWeek, theme, themeDescription, targetSkills, activities, materialsSummary, overallTips } = template

  const getActivityTypeColor = (type) => {
    const colors = {
      warmup: 'bg-orange-100 text-orange-800 border-orange-200',
      main: 'bg-blue-100 text-blue-800 border-blue-200',
      transition: 'bg-green-100 text-green-800 border-green-200',
      quiet: 'bg-purple-100 text-purple-800 border-purple-200',
      bedtime: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getActivityTypeLabel = (type) => {
    const labels = {
      warmup: '热身',
      main: '主题活动',
      transition: '过渡',
      quiet: '安静时间',
      bedtime: '睡前准备',
    }
    return labels[type] || type
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* 头部信息 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-block px-3 py-1 bg-white/20 text-white text-sm rounded-full mb-2">
              {dayOfWeek || '周一'}
            </span>
            <h3 className="text-2xl font-bold text-white">{theme}</h3>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm">目标能力</div>
            <div className="flex flex-wrap gap-1 mt-1 justify-end">
              {targetSkills?.map((skill, index) => (
                <span key={index} className="px-2 py-1 bg-white/20 text-white text-xs rounded">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
        {themeDescription && (
          <p className="mt-2 text-white/90 text-sm">{themeDescription}</p>
        )}
      </div>

      {/* 活动时间线 */}
      <div className="p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">活动安排</h4>
        <div className="space-y-4">
          {activities?.map((activity, index) => (
            <div
              key={index}
              className="border rounded-lg overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* 活动头部 */}
              <div
                className={`p-4 cursor-pointer ${getActivityTypeColor(activity.type)}`}
                onClick={() => setExpandedActivity(expandedActivity === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-medium">
                      {activity.startTime} - {activity.endTime}
                    </span>
                    <span className="px-2 py-1 bg-white/50 rounded text-xs font-medium">
                      {getActivityTypeLabel(activity.type)}
                    </span>
                    <span className="font-medium">{activity.name}</span>
                  </div>
                  <svg
                    className={`w-5 h-5 transform transition-transform ${
                      expandedActivity === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p className="mt-2 text-sm opacity-80">{activity.description}</p>
              </div>

              {/* 活动详情 */}
              {expandedActivity === index && (
                <div className="p-4 bg-gray-50 border-t">
                  {/* 步骤 */}
                  {activity.steps && activity.steps.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">活动步骤</h5>
                      <ol className="list-decimal list-inside space-y-1">
                        {activity.steps.map((step, stepIndex) => (
                          <li key={stepIndex} className="text-gray-600 text-sm">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* 材料 */}
                  {activity.materials && activity.materials.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">所需材料</h5>
                      <div className="flex flex-wrap gap-2">
                        {activity.materials.map((material, materialIndex) => (
                          <span
                            key={materialIndex}
                            className="px-2 py-1 bg-white border rounded text-sm text-gray-600"
                          >
                            {material}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 提示 */}
                  {activity.tips && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h5 className="font-medium text-yellow-800 mb-1">💡 家长提示</h5>
                      <p className="text-yellow-700 text-sm">{activity.tips}</p>
                    </div>
                  )}

                  {/* 教育价值 */}
                  {activity.educationalValue && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h5 className="font-medium text-green-800 mb-1">🎯 教育价值</h5>
                      <p className="text-green-700 text-sm">{activity.educationalValue}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 材料清单 */}
        {materialsSummary && materialsSummary.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-3">📦 材料清单</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {materialsSummary.map((item, index) => (
                <li key={index} className="flex items-center text-gray-600 text-sm">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 整体建议 */}
        {overallTips && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💝 整体建议</h4>
            <p className="text-blue-700 text-sm">{overallTips}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="mt-6 flex space-x-3">
          <button className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            使用此模板
          </button>
          <button className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            保存到收藏
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateCard
