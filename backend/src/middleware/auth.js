const jwt = require('jsonwebtoken');
const db = require('../models/dbAdapter');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 生成 JWT Token
function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username,
      role: user.role,
      familyId: user.familyId 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 验证 Token 中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效或已过期' });
    }
    
    // 获取完整用户信息
    const user = await db.user.findById(decoded.userId);
    if (!user) {
      return res.status(403).json({ error: '用户不存在' });
    }
    
    req.user = user;
    next();
  });
}

// 可选认证（用于某些公共接口）
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (!err) {
        const user = await db.user.findById(decoded.userId);
        if (user) {
          req.user = user;
        }
      }
      next();
    });
  } else {
    next();
  }
}

module.exports = {
  generateToken,
  authenticateToken,
  optionalAuth,
  JWT_SECRET,
};
