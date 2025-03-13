// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  if (!openid) {
    return {
      isAdmin: false,
      errMsg: '未获取到用户身份'
    }
  }
  
  try {
    // 查询管理员集合
    const adminRes = await db.collection('admins').where({
      openid: openid
    }).get()
    
    // 如果找到记录，则是管理员
    const isAdmin = adminRes.data.length > 0
    
    return {
      isAdmin: isAdmin
    }
  } catch (err) {
    console.error(err)
    return {
      isAdmin: false,
      errMsg: '检查管理员状态失败'
    }
  }
} 