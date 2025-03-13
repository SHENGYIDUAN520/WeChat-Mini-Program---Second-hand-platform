// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 检查是否为管理员
    const adminCheck = await db.collection('admins')
      .where({
        userId: wxContext.OPENID
      })
      .get()
    
    if (adminCheck.data.length === 0) {
      return {
        success: false,
        message: '无权限访问'
      }
    }
    
    // 获取用户总数
    const totalUsersRes = await db.collection('users').count()
    const totalUsers = totalUsersRes.total
    
    // 获取活跃用户数（最近7天有登录记录的用户）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const activeUsersRes = await db.collection('users')
      .where({
        lastLoginTime: _.gte(sevenDaysAgo)
      })
      .count()
    
    const activeUsers = activeUsersRes.total
    
    // 获取新增用户数（最近7天注册的用户）
    const newUsersRes = await db.collection('users')
      .where({
        createTime: _.gte(sevenDaysAgo)
      })
      .count()
    
    const newUsers = newUsersRes.total
    
    // 获取用户增长趋势（最近30天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const userGrowthRes = await db.collection('users')
      .where({
        createTime: _.gte(thirtyDaysAgo)
      })
      .orderBy('createTime', 'asc')
      .get()
    
    // 按日期分组
    const userGrowth = []
    const dateMap = {}
    
    // 初始化最近30天的日期
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const dateStr = formatDate(date)
      dateMap[dateStr] = {
        date: dateStr,
        count: 0,
        total: 0
      }
    }
    
    // 统计每天的新增用户数
    userGrowthRes.data.forEach(user => {
      const dateStr = formatDate(new Date(user.createTime))
      if (dateMap[dateStr]) {
        dateMap[dateStr].count++
      }
    })
    
    // 计算累计用户数
    let runningTotal = totalUsers - userGrowthRes.data.length
    
    // 转换为数组并计算累计用户数
    for (const key in dateMap) {
      runningTotal += dateMap[key].count
      dateMap[key].total = runningTotal
      userGrowth.push(dateMap[key])
    }
    
    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsers,
        userGrowth
      }
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '获取数据失败'
    }
  }
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
} 