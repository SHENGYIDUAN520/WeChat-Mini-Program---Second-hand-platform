const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    messageList: [],
    loading: true,
    userInfo: null,
    isLogin: false
  },

  onLoad: function() {
    // 检查是否已登录
    if (app.globalData.isLogin && app.globalData.userInfo) {
      this.setData({
        isLogin: true,
        userInfo: app.globalData.userInfo
      })
      this.loadMessageList()
    } else {
      this.setData({
        loading: false
      })
    }
  },
  
  onShow: function() {
    if (app.globalData.isLogin && app.globalData.userInfo) {
      this.setData({
        isLogin: true,
        userInfo: app.globalData.userInfo
      })
      this.loadMessageList()
    }
  },
  
  // 加载消息列表
  loadMessageList: function() {
    if (!this.data.isLogin) return
    
    this.setData({
      loading: true
    })
    
    const userId = this.data.userInfo.openid
    
    // 获取最近的消息列表
    wx.cloud.callFunction({
      name: 'getMessageList',
      data: {
        userId: userId
      },
      success: (res) => {
        if (res.result && res.result.success) {
          // 处理消息列表中的时间
          const messageList = res.result.data.map(item => {
            return {
              ...item,
              lastTime: item.lastTime || ''
            }
          })
          
          this.setData({
            messageList: messageList,
            loading: false
          })
          
          // 更新未读消息数量
          this.updateUnreadCount()
        } else {
          this.setData({
            loading: false
          })
          wx.showToast({
            title: '加载消息失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error(err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载消息失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 更新未读消息数量
  updateUnreadCount: function() {
    let unreadCount = 0
    
    this.data.messageList.forEach(item => {
      unreadCount += item.unreadCount || 0
    })
    
    // 更新全局数据
    if (app.globalData.unreadMessageCount !== unreadCount) {
      app.globalData.unreadMessageCount = unreadCount
      
      // 如果有未读消息，显示红点
      if (unreadCount > 0) {
        wx.showTabBarRedDot({
          index: 2 // 消息标签页的索引
        })
      } else {
        wx.hideTabBarRedDot({
          index: 2
        })
      }
    }
  },
  
  // 进入聊天页面
  goToChat: function(e) {
    const targetUserId = e.currentTarget.dataset.userid
    const goodsId = e.currentTarget.dataset.goodsid || ''
    
    wx.navigateTo({
      url: `/pages/chat/chat?targetUserId=${targetUserId}&goodsId=${goodsId}`
    })
  },
  
  // 登录
  login: function() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadMessageList()
    wx.stopPullDownRefresh()
  }
}) 