const db = wx.cloud.database()

Page({
  data: {
    orderId: '',
    order: null,
    goods: null,
    seller: null,
    buyer: null,
    loading: true,
    isSeller: false,
    isBuyer: false,
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
    },
    hasReviewedSeller: false,
    hasReviewedBuyer: false
  },

  onLoad: function(options) {
    const orderId = options.id
    this.setData({
      orderId: orderId
    })
    this.loadOrderDetail()
    
    // 检查评价状态
    this.checkReviewStatus()
  },

  // 加载订单详情
  loadOrderDetail: function(orderId) {
    this.setData({
      loading: true
    })
    
    // 获取订单信息
    db.collection('orders')
      .doc(orderId)
      .get()
      .then(res => {
        const order = res.data
        const currentUserId = getApp().globalData.userInfo.openid
        
        // 判断当前用户是买家还是卖家
        const isSeller = currentUserId === order.sellerId
        const isBuyer = currentUserId === order.buyerId
        
        this.setData({
          order: order,
          isSeller: isSeller,
          isBuyer: isBuyer
        })
        
        // 获取商品信息
        return db.collection('goods')
          .doc(order.goodsId)
          .get()
      })
      .then(res => {
        this.setData({
          goods: res.data
        })
        
        // 获取卖家信息
        return db.collection('users')
          .where({
            openid: this.data.order.sellerId
          })
          .get()
      })
      .then(res => {
        this.setData({
          seller: res.data[0] || { nickName: '未知用户' }
        })
        
        // 获取买家信息
        return db.collection('users')
          .where({
            openid: this.data.order.buyerId
          })
          .get()
      })
      .then(res => {
        this.setData({
          buyer: res.data[0] || { nickName: '未知用户' },
          loading: false
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      })
  },

  // 确认订单（卖家）
  confirmOrder: function() {
    wx.showModal({
      title: '确认订单',
      content: '确认接受该订单？确认后买家将可以与您联系进行交易。',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(1)
        }
      }
    })
  },

  // 完成交易
  completeOrder: function() {
    wx.showModal({
      title: '完成交易',
      content: '确认已完成交易？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(2)
        }
      }
    })
  },

  // 取消订单
  cancelOrder: function() {
    wx.showModal({
      title: '取消订单',
      content: '确认取消该订单？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(3)
        }
      }
    })
  },

  // 更新订单状态
  updateOrderStatus: function(status) {
    wx.showLoading({
      title: '处理中...',
      mask: true
    })
    
    wx.cloud.callFunction({
      name: 'updateOrder',
      data: {
        orderId: this.data.orderId,
        status: status
      },
      success: (res) => {
        if (res.result && res.result.success) {
          wx.hideLoading()
          wx.showToast({
            title: '操作成功',
            icon: 'success'
          })
          
          // 刷新订单详情
          this.loadOrderDetail(this.data.orderId)
        } else {
          wx.hideLoading()
          wx.showToast({
            title: res.result.message || '操作失败，请重试',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error(err)
        wx.hideLoading()
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 联系对方
  contactUser: function() {
    const targetUserId = this.data.isSeller ? this.data.order.buyerId : this.data.order.sellerId
    
    wx.navigateTo({
      url: `/pages/chat/chat?targetUserId=${targetUserId}&goodsId=${this.data.order.goodsId}`
    })
  },

  // 查看商品详情
  viewGoods: function() {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${this.data.order.goodsId}`
    })
  },

  // 支付订单
  payOrder: function() {
    wx.showToast({
      title: '支付功能暂未开放',
      icon: 'none'
    })
  },

  // 添加评价功能
  goToReview: function(e) {
    const { orderId } = this.data
    const type = e.currentTarget.dataset.type // 'buyer' 或 'seller'
    
    wx.navigateTo({
      url: `/pages/review/review?orderId=${orderId}&type=${type}`
    })
  },

  // 检查评价状态
  checkReviewStatus: function() {
    const { orderId } = this.data
    
    // 检查买家是否已评价卖家
    wx.cloud.callFunction({
      name: 'checkReview',
      data: {
        orderId: orderId,
        reviewType: 'seller'
      },
      success: (res) => {
        if (res.result && res.result.success) {
          this.setData({
            hasReviewedSeller: res.result.data.hasReviewed
          })
        }
      }
    })
    
    // 检查卖家是否已评价买家
    wx.cloud.callFunction({
      name: 'checkReview',
      data: {
        orderId: orderId,
        reviewType: 'buyer'
      },
      success: (res) => {
        if (res.result && res.result.success) {
          this.setData({
            hasReviewedBuyer: res.result.data.hasReviewed
          })
        }
      }
    })
  }
}) 