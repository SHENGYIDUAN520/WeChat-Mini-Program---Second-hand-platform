// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

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
    
    // 获取订单总数
    const totalOrdersRes = await db.collection('orders').count()
    const totalOrders = totalOrdersRes.total
    
    // 获取各状态订单数量
    const orderStatusRes = await db.collection('orders')
      .aggregate()
      .group({
        _id: '$status',
        count: $.sum(1)
      })
      .end()
    
    // 解析订单状态数据
    let completedOrders = 0
    let canceledOrders = 0
    let pendingOrders = 0
    
    orderStatusRes.list.forEach(item => {
      if (item._id === 2) { // 已完成
        completedOrders = item.count
      } else if (item._id === 3) { // 已取消
        canceledOrders = item.count
      } else { // 待确认或交易中
        pendingOrders += item.count
      }
    })
    
    // 计算总交易额（已完成订单）
    const totalTradeRes = await db.collection('orders')
      .where({
        status: 2 // 已完成
      })
      .aggregate()
      .group({
        _id: null,
        total: $.sum('$price')
      })
      .end()
    
    const totalTrade = totalTradeRes.list.length > 0 ? totalTradeRes.list[0].total : 0
    
    // 获取周交易趋势（最近7天）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const weeklyTrendRes = await db.collection('orders')
      .where({
        createTime: _.gte(sevenDaysAgo)
      })
      .orderBy('createTime', 'asc')
      .get()
    
    // 按日期分组
    const weeklyTrend = []
    const dateMap = {}
    
    // 初始化最近7天的日期
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dateStr = formatDate(date)
      dateMap[dateStr] = {
        date: dateStr,
        count: 0,
        amount: 0
      }
    }
    
    // 统计每天的订单数和金额
    weeklyTrendRes.data.forEach(order => {
      const dateStr = formatDate(new Date(order.createTime))
      if (dateMap[dateStr]) {
        dateMap[dateStr].count++
        if (order.status === 2) { // 只计算已完成订单的金额
          dateMap[dateStr].amount += order.price
        }
      }
    })
    
    // 转换为数组
    for (const key in dateMap) {
      weeklyTrend.push(dateMap[key])
    }
    
    return {
      success: true,
      data: {
        totalTrade,
        totalOrders,
        completedOrders,
        canceledOrders,
        pendingOrders,
        weeklyTrend
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