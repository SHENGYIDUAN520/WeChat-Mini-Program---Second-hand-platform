const db = wx.cloud.database()

Page({
  data: {
    messageList: [],
    loading: true,
    isLogin: false
  },

  onLoad: function() {
    this.checkLogin()
  },

  onShow: function() {
    const app = getApp()
    const isLogin = app.globalData.isLogin && app.globalData.userInfo
    
    this.setData({
      isLogin: isLogin
    })
    
    if (isLogin) {
      this.loadMessages()
    } else {
      this.setData({
        messageList: [],
        loading: false
      })
    }
  },

  checkLogin: function() {
    const app = getApp()
    const isLogin = app.globalData.isLogin && app.globalData.userInfo
    
    this.setData({
      isLogin: isLogin
    })
    
    if (!isLogin) {
      this.setData({
        messageList: [],
        loading: false
      })
      
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看消息',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
    } else {
      this.loadMessages()
    }
  },

  loadMessages: function() {
    if (!this.data.isLogin) {
      this.setData({
        loading: false,
        messageList: []
      })
      return
    }
    
    this.setData({
      loading: true
    })

    const app = getApp()
    const openid = app.globalData.userInfo.openid
    
    if (!openid) {
      this.setData({
        loading: false,
        messageList: []
      })
      return
    }

    db.collection('messages')
      .where({
        toId: openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        const messages = res.data
        const userPromises = []
        const goodsPromises = []

        messages.forEach(msg => {
          if (msg.fromId) {
            userPromises.push(
              db.collection('users')
                .doc(msg.fromId)
                .get()
                .then(userRes => {
                  msg.fromUser = userRes.data
                  return msg
                })
                .catch(() => {
                  msg.fromUser = { nickName: '未知用户' }
                  return msg
                })
            )
          } else {
            msg.fromUser = { nickName: '未知用户' }
          }

          if (msg.goodsId) {
            goodsPromises.push(
              db.collection('goods')
                .doc(msg.goodsId)
                .get()
                .then(goodsRes => {
                  msg.goods = goodsRes.data
                  return msg
                })
                .catch(() => {
                  msg.goods = { title: '商品已删除' }
                  return msg
                })
            )
          } else {
            msg.goods = { title: '未关联商品' }
          }
        })

        this.messages = messages;
        return Promise.all([...userPromises, ...goodsPromises])
      })
      .then(() => {
        this.setData({
          messageList: this.messages || [],
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

  goToChat: function(e) {
    if (!this.data.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看消息',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }
    
    const { fromId, goodsId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/chat/chat?targetUserId=${fromId}&goodsId=${goodsId}`
    })
  }
}) 