import { useState } from 'react'
import { api } from '../api/config'

function TemplateGenerator({ onTemplateGenerated }) {
  const [formData, setFormData] = useState({
    childAge: 5,
    theme: '',
    preferences: '',
    avoidances: '',
    season: 'spring',
    duration: 120,
    provider: 'volcano', // 默认使用火山引擎
    stream: false,
  })
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setProgress('')
    setError('')

    try {
      const params = {
        ...formData,
        preferences: formData.preferences.split(',').filter(Boolean),
        avoidances: formData.avoidances.split(',').filter(Boolean),
      }

      // 调用一周模板生成接口
      if (params.stream && params.provider === 'volcano') {
        await handleStreamGenerate(params)
      } else {
        // 普通响应 - 使用一周模板接口
        const response = await fetch(`${api.baseURL}/star-prep/templates/generate-week`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(params),
        })
        const data = await response.json()
        
        if (data.success) {
          onTemplateGenerated(data.template)
        } else {
          setError(data.message || data.error || '生成失败')
        }
      }
    } catch (err) {
      setError(err.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  const handleStreamGenerate = async (params) => {
    const response = await fetch(`${api.baseURL}/star-prep/templates/generate-week`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(params),
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullTemplate = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'start') {
              setProgress(data.message)
            } else if (data.type === 'progress') {
              setProgress(data.message)
            } else if (data.type === 'chunk') {
              setProgress('正在生成内容...')
            } else if (data.type === 'complete') {
              fullTemplate = data.template
              onTemplateGenerated(data.template)
            } else if (data.type === 'error') {
              setError(data.message)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">AI 生成活动模板</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 孩子年龄 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              孩子年龄 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.childAge}
              onChange={(e) => setFormData({ ...formData, childAge: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[3, 4, 5, 6, 7, 8].map((age) => (
                <option key={age} value={age}>{age} 岁</option>
              ))}
            </select>
          </div>

          {/* 主题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              活动主题
            </label>
            <input
              type="text"
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              placeholder="例如：恐龙探险、海洋世界、太空旅行..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">留空将由 AI 自动推荐</p>
          </div>

          {/* 兴趣爱好 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              孩子的兴趣爱好
            </label>
            <input
              type="text"
              value={formData.preferences}
              onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
              placeholder="例如：恐龙、画画、乐高...（用逗号分隔）"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 避讳内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              需要避讳的内容
            </label>
            <input
              type="text"
              value={formData.avoidances}
              onChange={(e) => setFormData({ ...formData, avoidances: e.target.value })}
              placeholder="例如：恐怖内容、太吵的声音...（用逗号分隔）"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 季节 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前季节
            </label>
            <select
              value={formData.season}
              onChange={(e) => setFormData({ ...formData, season: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="spring">春季</option>
              <option value="summer">夏季</option>
              <option value="autumn">秋季</option>
              <option value="winter">冬季</option>
            </select>
          </div>

          {/* AI 供应商 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI 供应商
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="volcano"
                  checked={formData.provider === 'volcano'}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="mr-2"
                />
                <span>AI生成</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="mock"
                  checked={formData.provider === 'mock'}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="mr-2"
                />
                <span>Mock（测试）</span>
              </label>
            </div>
          </div>

          {/* 流式响应 */}
          {formData.provider === 'volcano' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="stream"
                checked={formData.stream}
                onChange={(e) => setFormData({ ...formData, stream: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="stream" className="text-sm text-gray-700">
                启用流式响应（实时显示生成进度）
              </label>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* 进度提示 */}
          {progress && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {progress}
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '生成中...' : '生成模板'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default TemplateGenerator
