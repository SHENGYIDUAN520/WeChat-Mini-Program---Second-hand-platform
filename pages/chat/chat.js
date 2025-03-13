const db = wx.cloud.database()

Page({
  data: {
    targetUserId: '',
    goodsId: '',
    goods: null,
    targetUser: null,
    userInfo: null,
    messages: [],
    inputContent: '',
    scrollIntoView: '',
    loading: true
  },

  onLoad: function(options) {
    const { targetUserId, goodsId } = options
    
    if (!targetUserId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    this.setData({
      targetUserId,
      goodsId
    })
    
    // 获取当前用户信息
    this.getUserInfo().then(userInfo => {
      if (userInfo) {
        this.setData({
          userInfo: userInfo
        })
        
        // 加载目标用户信息
        this.loadTargetUserInfo()
        
        // 如果有商品ID，加载商品信息
        if (goodsId) {
          this.loadGoodsInfo()
        }
        
        // 加载聊天记录
        this.loadMessages()
        
        // 设置定时器，定期刷新消息
        this.messageTimer = setInterval(() => {
          this.loadMessages(false)
        }, 5000)
      } else {
        // 未登录状态，跳转到登录页面
        wx.showModal({
          title: '提示',
          content: '您需要登录后才能发送消息',
          confirmText: '去登录',
          cancelText: '返回',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              })
            } else {
              wx.navigateBack()
            }
          }
        })
      }
    })
  },
  
  onUnload: function() {
    // 清除定时器
    if (this.messageTimer) {
      clearInterval(this.messageTimer)
    }
  },
  
  // 加载目标用户信息
  loadTargetUserInfo: function() {
    db.collection('users')
      .where({
        openid: this.data.targetUserId
      })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          this.setData({
            targetUser: res.data[0]
          })
        }
      })
  },
  
  // 加载商品信息
  loadGoodsInfo: function() {
    // 检查goodsId是否存在
    if (!this.data.goodsId) {
      this.setData({
        goods: { title: '未关联商品' }
      });
      return;
    }
    
    db.collection('goods')
      .doc(this.data.goodsId)
      .get()
      .then(res => {
        this.setData({
          goods: res.data
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          goods: { title: '商品已删除' }
        })
      })
  },
  
  // 加载聊天记录
  loadMessages: function(showLoading = true) {
    if (showLoading) {
      this.setData({
        loading: true
      })
    }
    
    if (!this.data.userInfo || !this.data.userInfo.openid) {
      console.error('用户未登录或openid不存在')
      this.setData({
        loading: false
      })
      return
    }
    
    const currentUserId = this.data.userInfo.openid
    
    // 查询双方的聊天记录
    db.collection('messages')
      .where(db.command.or([
        {
          fromId: currentUserId,
          toId: this.data.targetUserId
        },
        {
          fromId: this.data.targetUserId,
          toId: currentUserId
        }
      ]))
      .orderBy('createTime', 'asc')
      .get()
      .then(res => {
        let messages = res.data
        
        // 为每条消息添加格式化的时间
        messages = messages.map(msg => {
          try {
            return {
              ...msg,
              formattedTime: this.formatTime(msg.createTime)
            }
          } catch (error) {
            console.error('处理消息时间出错:', error, msg)
            return {
              ...msg,
              formattedTime: ''
            }
          }
        })
        
        // 标记对方发来的消息为已读
        const unreadMessages = messages.filter(msg => 
          msg.toId === currentUserId && 
          msg.fromId === this.data.targetUserId && 
          !msg.isRead
        )
        
        // 批量更新已读状态
        unreadMessages.forEach(msg => {
          db.collection('messages').doc(msg._id).update({
            data: {
              isRead: true
            }
          })
        })
        
        this.setData({
          messages,
          loading: false,
          scrollIntoView: messages.length > 0 ? `msg-${messages[messages.length - 1]._id}` : ''
        })
      })
      .catch(err => {
        console.error('加载消息失败:', err)
        this.setData({
          loading: false
        })
      })
  },
  
  // 输入框内容变化
  onInputChange: function(e) {
    this.setData({
      inputContent: e.detail.value
    })
  },
  
  // 发送消息
  sendMessage: function() {
    const content = this.data.inputContent.trim()
    if (!content) return
    
    if (!this.data.userInfo || !this.data.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    const currentUserId = this.data.userInfo.openid
    
    // 添加消息到数据库
    db.collection('messages').add({
      data: {
        fromId: currentUserId,
        toId: this.data.targetUserId,
        content: content,
        goodsId: this.data.goodsId || '',
        isRead: false,
        createTime: db.serverDate()
      }
    }).then(res => {
      // 清空输入框
      this.setData({
        inputContent: ''
      })
      
      // 重新加载消息
      this.loadMessages()
    }).catch(err => {
      console.error(err)
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      })
    })
  },
  
  // 查看商品详情
  viewGoodsDetail: function() {
    if (this.data.goodsId) {
      wx.navigateTo({
        url: `/pages/detail/detail?id=${this.data.goodsId}`
      })
    }
  },
  
  // 格式化时间
  formatTime: function(dateStr) {
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
      
      // 调整为中国时区（UTC+8）
      const chinaDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
      
      const now = new Date()
      // 将当前时间也调整为中国时区
      const chinaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
      const diff = chinaNow - chinaDate
      
      // 今天的消息只显示时间
      if (diff < 24 * 60 * 60 * 1000 && 
          chinaDate.getUTCDate() === chinaNow.getUTCDate() &&
          chinaDate.getUTCMonth() === chinaNow.getUTCMonth() &&
          chinaDate.getUTCFullYear() === chinaNow.getUTCFullYear()) {
        return `${chinaDate.getUTCHours().toString().padStart(2, '0')}:${chinaDate.getUTCMinutes().toString().padStart(2, '0')}`
      }
      
      // 昨天的消息显示"昨天 时间"
      const yesterday = new Date(chinaNow)
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      if (chinaDate.getUTCDate() === yesterday.getUTCDate() &&
          chinaDate.getUTCMonth() === yesterday.getUTCMonth() &&
          chinaDate.getUTCFullYear() === yesterday.getUTCFullYear()) {
        return `昨天 ${chinaDate.getUTCHours().toString().padStart(2, '0')}:${chinaDate.getUTCMinutes().toString().padStart(2, '0')}`
      }
      
      // 其他时间显示完整日期
      return `${chinaDate.getUTCFullYear()}-${(chinaDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${chinaDate.getUTCDate().toString().padStart(2, '0')} ${chinaDate.getUTCHours().toString().padStart(2, '0')}:${chinaDate.getUTCMinutes().toString().padStart(2, '0')}`
    } catch (error) {
      console.error('格式化时间出错:', error, dateStr)
      return ''
    }
  },
  
  // 获取用户信息的方法
  getUserInfo: function() {
    return new Promise((resolve, reject) => {
      // 先从全局数据获取
      const app = getApp()
      if (app.globalData.userInfo && app.globalData.userInfo.openid) {
        resolve(app.globalData.userInfo)
        return
      }
      
      // 再从缓存获取
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.openid) {
        // 更新全局数据
        if (app.globalData) {
          app.globalData.userInfo = userInfo
        }
        resolve(userInfo)
        return
      }
      
      // 尝试从云函数获取openid
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(res => {
        if (res.result && res.result.openid) {
          // 查询用户信息
          return db.collection('users').where({
            openid: res.result.openid
          }).get()
        } else {
          throw new Error('获取openid失败')
        }
      }).then(res => {
        if (res.data && res.data.length > 0) {
          const userInfo = res.data[0]
          // 存入缓存
          wx.setStorageSync('userInfo', userInfo)
          // 更新全局数据
          if (app.globalData) {
            app.globalData.userInfo = userInfo
          }
          resolve(userInfo)
        } else {
          resolve(null)
        }
      }).catch(err => {
        console.error('获取用户信息失败:', err)
        resolve(null)
      })
    })
  }
}) 