import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { starPrepApi } from '../api/config';
import TemplateGenerator from '../components/TemplateGenerator';
import WeekTemplateView from '../components/WeekTemplateView';
import CalendarView from '../components/CalendarView';
import TodayActivity from '../components/TodayActivity';

function StarPrep() {
  const { family } = useAuthStore();
  const [templates, setTemplates] = useState([]);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // today | generate | calendar | templates
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesRes, statsRes] = await Promise.all([
        starPrepApi.getTemplates(),
        starPrepApi.getStats(),
      ]);
      
      if (templatesRes.success) {
        setTemplates(templatesRes.data.templates);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateGenerated = (template) => {
    setGeneratedTemplate(template);
    setActiveTab('preview');
  };

  const handleSaveTemplate = async () => {
    if (!generatedTemplate) return;
    
    try {
      const data = {
        name: generatedTemplate.name,
        description: generatedTemplate.description,
        activities: generatedTemplate.days || generatedTemplate.activities,
        weekStart: generatedTemplate.weekStart,
      };
      
      const response = await starPrepApi.createTemplate(data);
      if (response.success) {
        alert('模板保存成功！');
        loadData();
        setActiveTab('templates');
      }
    } catch (error) {
      alert('保存失败: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  // 没有家庭的情况
  if (!family) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">需要先加入家庭</h2>
            <p className="text-gray-600 mb-6">星星预备班是家庭共享功能，请先创建或加入一个家庭</p>
            <a 
              href="/family" 
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              去家庭管理
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">星星预备班</h1>
              <p className="mt-2 text-gray-600">每晚亲子活动日程与引导</p>
            </div>
            {stats && (
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.streak}</p>
                  <p className="text-gray-500">连续打卡</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.totalCheckins}</p>
                  <p className="text-gray-500">总打卡</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 导航标签 */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'today'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            今日活动
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            日历
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'generate'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            AI 生成
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            我的模板
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 今日活动 */}
        {activeTab === 'today' && (
          <TodayActivity 
            onCheckin={loadData} 
            onNavigateToGenerate={() => setActiveTab('generate')}
          />
        )}

        {/* 日历 */}
        {activeTab === 'calendar' && (
          <CalendarView />
        )}

        {/* AI 生成 */}
        {activeTab === 'generate' && (
          <TemplateGenerator 
            onTemplateGenerated={handleTemplateGenerated}
            isWeekTemplate={true}
          />
        )}

        {/* 预览生成的模板 */}
        {activeTab === 'preview' && generatedTemplate && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">生成的模板</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  重新生成
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存并应用
                </button>
              </div>
            </div>
            <WeekTemplateView template={generatedTemplate} />
          </div>
        )}

        {/* 我的模板 */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">我的模板</h2>
              <button
                onClick={() => setActiveTab('generate')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                生成新模板
              </button>
            </div>
            {templates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">暂无保存的模板</p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  生成第一个模板
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div 
                    key={template.id} 
                    className={`bg-white rounded-lg shadow p-6 ${template.isActive ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          创建于 {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {template.isActive && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            使用中
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default StarPrep;
