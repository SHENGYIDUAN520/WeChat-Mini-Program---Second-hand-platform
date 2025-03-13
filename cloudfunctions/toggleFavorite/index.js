// 云函数入口文件
const cloud = require('wx-server-sdk')

// 使用固定的环境ID
cloud.init({
  env: 'cloud1-7gv3a2fb5a1258e5'
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const goodsId = event.goodsId

  if (!userId || !goodsId) {
    return {
      success: false,
      message: '参数错误'
    }
  }

  try {
    // 查询是否已收藏
    const favoriteRes = await db.collection('favorites')
      .where({
        userId: userId,
        goodsId: goodsId
      })
      .get()

    const isFavorite = favoriteRes.data.length > 0

    if (isFavorite) {
      // 已收藏，取消收藏
      await db.collection('favorites')
        .where({
          userId: userId,
          goodsId: goodsId
        })
        .remove()

      // 更新商品收藏数量
      await db.collection('goods').doc(goodsId).update({
        data: {
          favoriteCount: _.inc(-1)
        }
      })

      return {
        success: true,
        isFavorite: false,
        message: '已取消收藏'
      }
    } else {
      // 未收藏，添加收藏
      await db.collection('favorites').add({
        data: {
          userId: userId,
          goodsId: goodsId,
          createTime: db.serverDate()
        }
      })

      // 更新商品收藏数量
      await db.collection('goods').doc(goodsId).update({
        data: {
          favoriteCount: _.inc(1)
        }
      })

      return {
        success: true,
        isFavorite: true,
        message: '收藏成功'
      }
    }
  } catch (err) {
    console.error('收藏操作失败：', err)
    return {
      success: false,
      message: '操作失败，请重试',
      error: err
    }
  }
} 