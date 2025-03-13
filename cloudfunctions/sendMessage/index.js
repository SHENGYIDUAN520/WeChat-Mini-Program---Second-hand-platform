// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const fromId = wxContext.OPENID
  const { targetUserId, content, goodsId = '' } = event
  
  // 检查参数
  if (!targetUserId || !content) {
    return {
      success: false,
      message: '参数不完整'
    }
  }
  
  try {
    // 创建消息
    const messageData = {
      fromId: fromId,
      toId: targetUserId,
      content: content,
      goodsId: goodsId,
      isRead: false,
      createTime: db.serverDate()
    }
    
    // 添加消息到数据库
    const messageRes = await db.collection('messages').add({
      data: messageData
    })
    
    // 获取发送者信息
    const userRes = await db.collection('users')
      .where({
        openid: fromId
      })
      .get()
    
    const user = userRes.data[0] || { nickName: '未知用户' }
    
    // 构建返回的消息对象
    const message = {
      _id: messageRes._id,
      ...messageData,
      createTime: new Date(),
      user: {
        _id: user._id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl
      }
    }
    
    return {
      success: true,
      data: message
    }
  } catch (err) {
    console.error('发送消息失败', err)
    return {
      success: false,
      message: '发送消息失败',
      error: err
    }
  }
} 