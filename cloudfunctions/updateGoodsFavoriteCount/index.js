// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { goodsId, type } = event
  
  if (!goodsId) {
    return {
      success: false,
      errMsg: '商品ID不能为空'
    }
  }
  
  try {
    // 根据类型增加或减少收藏数
    const updateData = {}
    if (type === 'increase') {
      updateData.favoriteCount = _.inc(1)
    } else if (type === 'decrease') {
      updateData.favoriteCount = _.inc(-1)
    } else {
      return {
        success: false,
        errMsg: '操作类型错误'
      }
    }
    
    // 更新商品收藏数
    await db.collection('goods').doc(goodsId).update({
      data: updateData
    })
    
    return {
      success: true
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      errMsg: '更新收藏数失败'
    }
  }
} 