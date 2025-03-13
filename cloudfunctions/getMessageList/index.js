// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 如果没有传入userId或userId与当前用户不匹配，则返回错误
  const userId = event.userId
  if (!userId || userId !== openid) {
    return {
      success: false,
      message: '权限不足',
      data: []
    }
  }
  
  try {
    // 获取与当前用户相关的所有消息
    const messagesRes = await db.collection('messages')
      .where(_.or([
        { fromId: userId },
        { toId: userId }
      ]))
      .orderBy('createTime', 'desc')
      .get()
    
    const messages = messagesRes.data
    
    // 如果没有消息，直接返回空数组
    if (messages.length === 0) {
      return {
        success: true,
        data: []
      }
    }
    
    // 获取所有聊天对象的ID
    const chatUserIds = new Set()
    messages.forEach(msg => {
      if (msg.fromId !== userId) {
        chatUserIds.add(msg.fromId)
      }
      if (msg.toId !== userId) {
        chatUserIds.add(msg.toId)
      }
    })
    
    // 获取所有聊天对象的用户信息
    const userInfoRes = await db.collection('users')
      .where({
        openid: _.in([...chatUserIds])
      })
      .get()
    
    const userInfoMap = {}
    userInfoRes.data.forEach(user => {
      userInfoMap[user.openid] = user
    })
    
    // 按聊天对象和商品分组，获取最新消息
    const chatList = []
    const chatMap = {}
    
    messages.forEach(msg => {
      const targetUserId = msg.fromId === userId ? msg.toId : msg.fromId
      const goodsId = msg.goodsId || ''
      const chatKey = `${targetUserId}_${goodsId}`
      
      if (!chatMap[chatKey]) {
        chatMap[chatKey] = {
          targetUserId,
          goodsId,
          lastMessage: msg,
          lastContent: msg.content,
          lastTime: formatTime(msg.createTime),
          unreadCount: msg.toId === userId && !msg.isRead ? 1 : 0,
          targetUserInfo: userInfoMap[targetUserId] || { nickName: '未知用户' }
        }
        chatList.push(chatMap[chatKey])
      } else {
        // 比较消息时间，保留最新的消息
        const existingMsgTime = new Date(chatMap[chatKey].lastMessage.createTime).getTime()
        const currentMsgTime = new Date(msg.createTime).getTime()
        
        if (currentMsgTime > existingMsgTime) {
          chatMap[chatKey].lastMessage = msg
          chatMap[chatKey].lastContent = msg.content
          chatMap[chatKey].lastTime = formatTime(msg.createTime)
        }
        
        // 统计未读消息数
        if (msg.toId === userId && !msg.isRead) {
          chatMap[chatKey].unreadCount++
        }
      }
    })
    
    // 如果有商品ID，获取商品信息
    const goodsIds = chatList.filter(chat => chat.goodsId).map(chat => chat.goodsId)
    
    if (goodsIds.length > 0) {
      const goodsRes = await db.collection('goods')
        .where({
          _id: _.in(goodsIds)
        })
        .get()
      
      const goodsMap = {}
      goodsRes.data.forEach(goods => {
        goodsMap[goods._id] = goods
      })
      
      // 添加商品信息
      chatList.forEach(chat => {
        if (chat.goodsId && goodsMap[chat.goodsId]) {
          chat.goods = goodsMap[chat.goodsId]
        }
      })
    }
    
    // 按最后消息时间排序
    chatList.sort((a, b) => {
      return new Date(b.lastMessage.createTime) - new Date(a.lastMessage.createTime)
    })
    
    return {
      success: true,
      data: chatList
    }
  } catch (err) {
    console.error('获取消息列表失败', err)
    return {
      success: false,
      message: '获取消息列表失败',
      error: err
    }
  }
}

// 格式化时间
function formatTime(dateStr) {
  try {
    let date
    if (typeof dateStr === 'object') {
      // 如果是Date对象或云数据库日期对象
      if (dateStr instanceof Date) {
        date = dateStr
      } else if (dateStr.getTime) {
        date = new Date(dateStr.getTime())
      } else if (dateStr.$date) {
        // 云数据库日期可能是这种格式
        date = new Date(dateStr.$date)
      } else {
        console.log('未知日期对象格式:', JSON.stringify(dateStr))
        return ''
      }
    } else if (typeof dateStr === 'string') {
      // 如果是字符串
      date = new Date(dateStr)
    } else if (typeof dateStr === 'number') {
      // 如果是时间戳
      date = new Date(dateStr)
    } else {
      console.log('未知日期格式:', typeof dateStr)
      return ''
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.log('无效日期:', dateStr)
      return ''
    }
    
    // 调整为中国时区（UTC+8）
    const chinaDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    
    const now = new Date()
    // 将当前时间也调整为中国时区
    const chinaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const diff = chinaNow - chinaDate
    
    // 今天的消息只显示时间
    if (diff < 24 * 60 * 60 * 1000 && 
        chinaDate.getUTCDate() === chinaNow.getUTCDate() &&
        chinaDate.getUTCMonth() === chinaNow.getUTCMonth() &&
        chinaDate.getUTCFullYear() === chinaNow.getUTCFullYear()) {
      return `${chinaDate.getUTCHours().toString().padStart(2, '0')}:${chinaDate.getUTCMinutes().toString().padStart(2, '0')}`
    }
    
    // 昨天的消息显示"昨天"
    const yesterday = new Date(chinaNow)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    if (chinaDate.getUTCDate() === yesterday.getUTCDate() &&
        chinaDate.getUTCMonth() === yesterday.getUTCMonth() &&
        chinaDate.getUTCFullYear() === yesterday.getUTCFullYear()) {
      return `昨天 ${chinaDate.getUTCHours().toString().padStart(2, '0')}:${chinaDate.getUTCMinutes().toString().padStart(2, '0')}`
    }
    
    // 今年的消息显示"月-日"
    if (chinaDate.getUTCFullYear() === chinaNow.getUTCFullYear()) {
      return `${(chinaDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${chinaDate.getUTCDate().toString().padStart(2, '0')}`
    }
    
    // 其他时间显示"年-月-日"
    return `${chinaDate.getUTCFullYear()}-${(chinaDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${chinaDate.getUTCDate().toString().padStart(2, '0')}`
  } catch (error) {
    console.error('格式化时间出错:', error, dateStr)
    return ''
  }
} 