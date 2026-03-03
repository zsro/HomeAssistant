#!/usr/bin/env node

/**
 * 清理数据库脚本
 * 删除所有表数据，保留表结构
 */

const dotenv = require('dotenv');
dotenv.config();

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function clearDatabase() {
  const useRealDatabase = process.env.USE_REAL_DB === 'true';
  
  if (!useRealDatabase) {
    console.log('当前使用内存数据库，无需清理');
    process.exit(0);
  }

  console.log('警告: 这将删除 MySQL 数据库中的所有数据！');
  console.log(`数据库: ${process.env.DB_NAME || 'homeassistant'}`);
  console.log(`主机: ${process.env.DB_HOST || 'localhost'}`);
  
  rl.question('\n确认要清理吗? 输入 "yes" 继续: ', async (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('已取消');
      rl.close();
      process.exit(0);
    }

    try {
      const { sequelize, User, Family, Template, Checkin } = require('../src/models/database');
      
      console.log('\n正在连接数据库...');
      await sequelize.authenticate();
      console.log('数据库连接成功');

      console.log('\n正在清理数据...');
      
      // 按外键依赖顺序删除数据
      await Checkin.destroy({ where: {}, truncate: true });
      console.log('✓ 清理打卡记录');
      
      await Template.destroy({ where: {}, truncate: true });
      console.log('✓ 清理模板数据');
      
      await User.destroy({ where: {}, truncate: true });
      console.log('✓ 清理用户数据');
      
      await Family.destroy({ where: {}, truncate: true });
      console.log('✓ 清理家庭数据');

      console.log('\n✅ 数据库清理完成！');
      
      await sequelize.close();
      rl.close();
      process.exit(0);
      
    } catch (error) {
      console.error('\n❌ 清理失败:', error.message);
      rl.close();
      process.exit(1);
    }
  });
}

clearDatabase();
