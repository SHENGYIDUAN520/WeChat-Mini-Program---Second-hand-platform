const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    favoritesList: [],
    loading: true,
    statusText: {
      'on_sale': '在售',
      'sold': '已售',
      'removed': '已下架'
    }
  },

  onLoad: function (options) {
    // 检查登录状态
    this.checkLoginStatus()
  },

  onShow: function () {
    // 每次显示页面时刷新收藏列表
    this.loadFavoritesList()
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const app = getApp()
    if (app.globalData.isLogin && app.globalData.userInfo) {
      this.loadFavoritesList()
    } else {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: function (res) {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
    }
  },

  // 加载收藏列表
  loadFavoritesList: function () {
    const that = this
    const userInfo = app.globalData.userInfo

    if (!userInfo || !userInfo.openid) {
      this.setData({
        loading: false,
        favoritesList: []
      })
      return
    }

    this.setData({
      loading: true
    })

    db.collection('favorites')
      .where({
        _openid: userInfo.openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        const favorites = res.data
        const goodsPromises = []

        // 获取收藏关联的商品信息
        favorites.forEach(favorite => {
          goodsPromises.push(
            db.collection('goods')
              .doc(favorite.goodsId)
              .get()
              .then(goodsRes => {
                favorite.goods = goodsRes.data
                favorite.formattedTime = this.formatTime(favorite.createTime)
                return favorite
              })
              .catch(() => {
                favorite.goods = { 
                  title: '商品已删除',
                  price: 0,
                  images: ['/images/default-goods.png'],
                  status: 'removed'
                }
                favorite.goodsId = null;
                favorite.formattedTime = this.formatTime(favorite.createTime)
                return favorite
              })
          )
        })

        return Promise.all(goodsPromises)
      })
      .then(favoritesList => {
        this.setData({
          favoritesList: favoritesList,
          loading: false
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 格式化时间
  formatTime: function (dateStr) {
    if (!dateStr) return ''

    let date
    try {
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

      const now = new Date()
      const diff = now - date

      // 今天的消息只显示时间
      if (diff < 24 * 60 * 60 * 1000 &&
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      }

      // 昨天的消息显示"昨天"
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()) {
        return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      }

      // 今年的消息显示"月-日"
      if (date.getFullYear() === now.getFullYear()) {
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
      }

      // 其他时间显示"年-月-日"
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    } catch (error) {
      console.error('格式化时间出错:', error, dateStr)
      return ''
    }
  },

  // 跳转到商品详情
  goToDetail: function (e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    const item = this.data.favoritesList[index]
    
    // 检查商品是否已删除
    if (item && item.goods && item.goods.status === 'removed') {
      wx.showToast({
        title: '商品已下架或删除',
        icon: 'none'
      })
      return
    }
    
    // 确保ID有效
    if (!id || id === '1') {
      wx.showToast({
        title: '商品不存在或已删除',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 移除收藏
  removeFavorite: function (e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定要取消收藏这个商品吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '取消收藏中...'
          })

          db.collection('favorites').doc(id).remove().then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            })
            this.loadFavoritesList()
          }).catch(err => {
            console.error(err)
            wx.hideLoading()
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  // 跳转到首页
  navigateToHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadFavoritesList()
    wx.stopPullDownRefresh()
  }
}) 