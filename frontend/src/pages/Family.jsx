import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { familyApi } from '../api/config';

function Family() {
  const { user, family, setFamily } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [familyCode, setFamilyCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      const [familyRes, membersRes] = await Promise.all([
        familyApi.getFamily(),
        familyApi.getMembers(),
      ]);
      
      if (familyRes.success) {
        setFamily(familyRes.data.family);
      }
      if (membersRes.success) {
        setMembers(membersRes.data.members);
      }
    } catch (error) {
      console.error('获取家庭数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e) => {
    e.preventDefault();
    try {
      const response = await familyApi.joinFamily({ familyCode });
      if (response.success) {
        setFamily(response.data.family);
        setMembers(response.data.members);
        setShowJoinForm(false);
        setFamilyCode('');
        setMessage('加入家庭成功！');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(error.message || '加入家庭失败');
    }
  };

  const handleCreateFamily = async () => {
    try {
      const response = await familyApi.createFamily({});
      if (response.success) {
        setFamily(response.data.family);
        setMembers(response.data.members);
        setMessage('创建新家庭成功！');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(error.message || '创建家庭失败');
    }
  };

  const handleLeaveFamily = async () => {
    if (!confirm('确定要离开当前家庭吗？')) return;
    
    try {
      const response = await familyApi.leaveFamily();
      if (response.success) {
        setFamily(null);
        setMembers([]);
        setMessage('已离开家庭');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(error.message || '离开家庭失败');
    }
  };

  const copyFamilyCode = () => {
    if (family?.code) {
      navigator.clipboard.writeText(family.code);
      setMessage('家庭码已复制到剪贴板');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getRoleLabel = (role) => {
    const labels = { father: '爸爸', mother: '妈妈', child: '孩子' };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      father: 'bg-blue-100 text-blue-800',
      mother: 'bg-pink-100 text-pink-800',
      child: 'bg-green-100 text-green-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">家庭管理</h1>

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {message}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">您还没有加入家庭</h2>
              <p className="text-gray-600">创建新家庭或加入已有家庭开始使用</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleCreateFamily}
                className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建新家庭
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">或</span>
                </div>
              </div>

              {!showJoinForm ? (
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="w-full py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  加入已有家庭
                </button>
              ) : (
                <form onSubmit={handleJoinFamily} className="space-y-3">
                  <input
                    type="text"
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                    placeholder="输入家庭码（6位）"
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest uppercase"
                  />
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowJoinForm(false)}
                      className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={familyCode.length !== 6}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      加入
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 有家庭的情况
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">家庭管理</h1>

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {message}
          </div>
        )}

        {/* 家庭信息卡片 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{family.name}</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {members.length} 位成员
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">家庭码</p>
                <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">
                  {family.code}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  分享给家人，让他们加入家庭
                </p>
              </div>
              <button
                onClick={copyFamilyCode}
                className="p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="复制家庭码"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={handleLeaveFamily}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            离开家庭
          </button>
        </div>

        {/* 成员列表 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">家庭成员</h3>
          
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-medium">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    {member.id === user?.id && (
                      <span className="text-xs text-gray-500">（我）</span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                  {getRoleLabel(member.role)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full py-3 px-6 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>邀请更多成员</span>
            </button>
          </div>
        </div>

        {/* 加入家庭弹窗 */}
        {showJoinForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">加入家庭</h3>
              <form onSubmit={handleJoinFamily} className="space-y-4">
                <input
                  type="text"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                  placeholder="输入家庭码（6位）"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest uppercase"
                />
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinForm(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={familyCode.length !== 6}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    加入
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Family;
