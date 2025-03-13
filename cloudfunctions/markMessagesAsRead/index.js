// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const { targetUserId, goodsId = '' } = event
  
  // 检查参数
  if (!targetUserId) {
    return {
      success: false,
      message: '参数不完整'
    }
  }
  
  try {
    // 查询未读消息
    const messagesRes = await db.collection('messages')
      .where({
        fromId: targetUserId,
        toId: userId,
        goodsId: goodsId,
        isRead: false
      })
      .get()
    
    const messages = messagesRes.data
    
    // 如果没有未读消息，直接返回
    if (messages.length === 0) {
      return {
        success: true,
        data: {
          updated: 0
        }
      }
    }
    
    // 批量更新已读状态
    const updatePromises = messages.map(msg => {
      return db.collection('messages').doc(msg._id).update({
        data: {
          isRead: true
        }
      })
    })
    
    await Promise.all(updatePromises)
    
    return {
      success: true,
      data: {
        updated: messages.length
      }
    }
  } catch (err) {
    console.error('标记消息已读失败', err)
    return {
      success: false,
      message: '标记消息已读失败',
      error: err
    }
  }
} 