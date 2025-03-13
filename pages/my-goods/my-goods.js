const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    goodsList: [],
    loading: true,
    status: 'all', // all, on_sale, sold, removed
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
    // 每次显示页面时刷新商品列表
    this.loadGoodsList()
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const app = getApp()
    if (app.globalData.isLogin && app.globalData.userInfo) {
      this.loadGoodsList()
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

  // 切换标签页
  switchTab: function (e) {
    const status = e.currentTarget.dataset.status
    this.setData({
      status: status,
      loading: true
    })
    this.loadGoodsList()
  },

  // 加载商品列表
  loadGoodsList: function () {
    const that = this
    const userInfo = app.globalData.userInfo

    if (!userInfo || !userInfo.openid) {
      this.setData({
        loading: false,
        goodsList: []
      })
      return
    }

    // 构建查询条件
    let query = {
      _openid: userInfo.openid
    }

    // 根据状态筛选
    if (this.data.status !== 'all') {
      query.status = this.data.status
    }

    db.collection('goods')
      .where(query)
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        // 格式化时间
        const goodsList = res.data.map(item => {
          return {
            ...item,
            formattedTime: this.formatTime(item.createTime)
          }
        })

        this.setData({
          goodsList: goodsList,
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
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 编辑商品
  editGoods: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/publish/publish?id=${id}`
    })
  },

  // 切换商品状态（上架/下架）
  toggleGoodsStatus: function (e) {
    const id = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status
    const newStatus = status === 'on_sale' ? 'removed' : 'on_sale'

    wx.showLoading({
      title: status === 'on_sale' ? '下架中...' : '上架中...'
    })

    db.collection('goods').doc(id).update({
      data: {
        status: newStatus
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({
        title: status === 'on_sale' ? '已下架' : '已上架',
        icon: 'success'
      })
      this.loadGoodsList()
    }).catch(err => {
      console.error(err)
      wx.hideLoading()
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    })
  },

  // 删除商品
  deleteGoods: function (e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定要删除这个商品吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...'
          })

          db.collection('goods').doc(id).remove().then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.loadGoodsList()
          }).catch(err => {
            console.error(err)
            wx.hideLoading()
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  // 跳转到发布页面
  navigateToPublish: function () {
    wx.switchTab({
      url: '/pages/publish/publish'
    })
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadGoodsList()
    wx.stopPullDownRefresh()
  }
}) 