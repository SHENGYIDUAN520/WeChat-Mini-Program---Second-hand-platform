// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { goodsId } = event
  
  if (!goodsId) {
    return {
      success: false,
      errMsg: '商品ID不能为空'
    }
  }
  
  try {
    // 增加商品浏览量
    await db.collection('goods').doc(goodsId).update({
      data: {
        viewCount: _.inc(1)
      }
    })
    
    return {
      success: true
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      errMsg: '增加浏览量失败'
    }
  }
} 