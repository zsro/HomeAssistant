const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 必须先加载环境变量
dotenv.config();

const { syncDatabase } = require('./src/models/database');
const authRoutes = require('./src/routes/auth');
const familyRoutes = require('./src/routes/family');
const starPrepRoutes = require('./src/routes/starPrep');

const app = express();
const PORT = process.env.PORT || 3001;

// 设置超时时间为 5 分钟（AI 生成可能需要较长时间）
app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    console.log('Request timeout');
    res.status(504).json({ error: '请求超时' });
  });
  next();
});

app.use(cors());
app.use(express.json());

// 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/star-prep', starPrepRoutes);

// 启动服务器
async function startServer() {
  try {
    // 同步数据库
    await syncDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
