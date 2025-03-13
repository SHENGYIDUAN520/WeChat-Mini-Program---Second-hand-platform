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
    // 查询双方的聊天记录
    const messagesRes = await db.collection('messages')
      .where(_.or([
        {
          fromId: userId,
          toId: targetUserId,
          goodsId: goodsId
        },
        {
          fromId: targetUserId,
          toId: userId,
          goodsId: goodsId
        }
      ]))
      .orderBy('createTime', 'asc')
      .get()
    
    const messages = messagesRes.data
    
    // 标记对方发来的消息为已读
    const unreadMessages = messages.filter(msg => 
      msg.toId === userId && 
      msg.fromId === targetUserId && 
      !msg.isRead
    )
    
    // 批量更新已读状态
    for (const msg of unreadMessages) {
      await db.collection('messages').doc(msg._id).update({
        data: {
          isRead: true
        }
      })
    }
    
    return {
      success: true,
      data: messages
    }
  } catch (err) {
    console.error('获取聊天记录失败', err)
    return {
      success: false,
      message: '获取聊天记录失败',
      error: err
    }
  }
} 