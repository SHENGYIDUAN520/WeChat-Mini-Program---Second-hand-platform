const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    activeTab: 0, // 0-我买到的，1-我卖出的
    buyerOrders: [],
    sellerOrders: [],
    loading: true,
    statusText: {
      0: '待确认',
      1: '交易中',
      2: '已完成',
      3: '已取消'
    },
    statusClass: {
      0: 'pending',
      1: 'processing',
      2: 'completed',
      3: 'canceled'
    }
  },

  onLoad: function() {
    // 检查是否已登录
    if (!app.globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看订单',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }
    
    this.loadOrders()
  },
  
  onShow: function() {
    if (app.globalData.isLogin) {
      this.loadOrders()
    }
  },
  
  // 切换标签页
  switchTab: function(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index
    })
  },
  
  // 加载订单数据
  loadOrders: function() {
    this.setData({
      loading: true
    })
    
    const userId = app.globalData.userInfo.openid
    
    // 加载买家订单
    const buyerPromise = db.collection('orders')
      .where({
        buyerId: userId
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        return this.processOrders(res.data, 'buyer')
      })
    
    // 加载卖家订单
    const sellerPromise = db.collection('orders')
      .where({
        sellerId: userId
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        return this.processOrders(res.data, 'seller')
      })
    
    // 等待所有请求完成
    Promise.all([buyerPromise, sellerPromise])
      .then(([buyerOrders, sellerOrders]) => {
        this.setData({
          buyerOrders: buyerOrders,
          sellerOrders: sellerOrders,
          loading: false
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载订单失败',
          icon: 'none'
        })
      })
  },
  
  // 处理订单数据，获取关联的商品和用户信息
  processOrders: function(orders, role) {
    if (!orders || orders.length === 0) {
      return Promise.resolve([])
    }
    
    const promises = orders.map(order => {
      // 获取商品信息
      return db.collection('goods')
        .doc(order.goodsId)
        .get()
        .then(goodsRes => {
          order.goods = goodsRes.data
          
          // 获取对方用户信息
          const targetUserId = role === 'buyer' ? order.sellerId : order.buyerId
          return db.collection('users')
            .where({
              openid: targetUserId
            })
            .get()
        })
        .then(userRes => {
          if (role === 'buyer') {
            order.seller = userRes.data[0] || { nickName: '未知用户' }
          } else {
            order.buyer = userRes.data[0] || { nickName: '未知用户' }
          }
          
          // 格式化时间
          if (order.createTime) {
            order.createTimeFormat = this.formatTime(order.createTime)
          }
          
          return order
        })
        .catch(err => {
          console.error(err)
          order.goods = { title: '商品信息加载失败' }
          return order
        })
    })
    
    return Promise.all(promises)
  },
  
  // 格式化时间
  formatTime: function(dateStr) {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hour}:${minute}`
  },
  
  // 查看订单详情
  goToOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${orderId}`
    })
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadOrders()
    wx.stopPullDownRefresh()
  }
}) 