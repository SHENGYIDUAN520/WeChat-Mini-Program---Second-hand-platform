const db = wx.cloud.database()

Page({
  data: {
    userInfo: {
      nickName: '',
      avatarUrl: '',
      campus: '信息学部',
      buyerRating: 4.8,
      sellerRating: 4.5,
      buyerReviewCount: 12,
      sellerReviewCount: 8
    },
    isLogin: false,
    myGoods: [],
    myOrders: [],
    activeTab: 0,
    loading: false,
    unreadCount: 3
  },

  onLoad: function (options) {
    // 检查登录状态
    this.checkLoginStatus();
  },

  onShow: function () {
    // 每次显示页面时更新未读消息数和登录状态
    this.getUnreadCount();
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const app = getApp();
    app.getUserInfo(userInfo => {
      if (userInfo) {
        this.setData({
          isLogin: true,
          userInfo: userInfo
        });
      } else {
        this.setData({
          isLogin: false
        });
      }
    });
  },

  // 登录
  login: function () {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 退出登录
  logout: function () {
    const app = getApp();
    const that = this;
    
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          app.logout(success => {
            if (success) {
              that.setData({
                isLogin: false,
                userInfo: {}
              });
              
              wx.showToast({
                title: '已退出登录',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 获取未读消息数
  getUnreadCount: function () {
    // 这里应该是调用API获取未读消息数
    // 为了演示，使用固定值
    this.setData({
      unreadCount: 3
    });
  },

  // 切换标签页
  switchTab: function(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index
    })
    
    if (index === 0) {
      this.loadMyGoods()
    } else {
      this.loadMyOrders()
    }
  },

  // 加载我发布的商品
  loadMyGoods: function() {
    if (!this.data.isLogin) return
    
    this.setData({
      loading: true
    })
    
    db.collection('goods')
      .where({
        _openid: this.data.userInfo.openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        this.setData({
          myGoods: res.data,
          loading: false
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false
        })
      })
  },

  // 加载我的订单
  loadMyOrders: function() {
    if (!this.data.isLogin) return
    
    this.setData({
      loading: true
    })
    
    db.collection('orders')
      .where({
        buyerId: this.data.userInfo.openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        const orders = res.data
        const goodsPromises = []
        
        // 获取订单关联的商品信息
        orders.forEach(order => {
          goodsPromises.push(
            db.collection('goods')
              .doc(order.goodsId)
              .get()
              .then(goodsRes => {
                order.goods = goodsRes.data
                return order
              })
              .catch(() => {
                order.goods = { title: '商品已删除' }
                return order
              })
          )
        })
        
        return Promise.all(goodsPromises)
      })
      .then(() => {
        this.setData({
          myOrders: orders,
          loading: false
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false
        })
      })
  },

  // 编辑个人资料
  editProfile: function() {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    })
  },

  // 查看商品详情
  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 查看评价
  viewReviews: function (e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/pages/reviews/reviews?type=${type}`
    });
  },

  /**
   * 导航到指定页面
   */
  navigateTo: function (e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({
      url: url
    });
  },
  
  // 跳转到设置页面
  navigateToSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  }
}) 