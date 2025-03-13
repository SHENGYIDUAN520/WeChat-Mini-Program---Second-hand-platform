// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env 参数说明：
        // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        // 此处请填入环境 ID, 环境 ID 可打开云控制台查看
        // 如不填则使用默认环境（第一个创建的环境）
        env: 'cloud1-7gv3a2fb5a1258e5', // 替换为你的环境ID
        traceUser: true,
      })
    }

    this.globalData = {
      userInfo: null,
      isLogin: false
    }
    
    // 检查登录状态
    this.checkLoginStatus()
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
    const that = this
    // 获取本地存储的用户信息
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        that.globalData.userInfo = res.data
        that.globalData.isLogin = true
      },
      fail: function() {
        that.globalData.isLogin = false
      }
    })
  },
  
  // 登录方法
  login: function(userInfo, callback) {
    const that = this
    
    // 保存用户信息到全局数据
    this.globalData.userInfo = userInfo
    this.globalData.isLogin = true
    
    // 保存到本地存储
    wx.setStorage({
      key: 'userInfo',
      data: userInfo,
      success: function() {
        if (callback && typeof callback === 'function') {
          callback(true)
        }
      },
      fail: function() {
        if (callback && typeof callback === 'function') {
          callback(false)
        }
      }
    })
    
    // 尝试将用户信息保存到云数据库
    this.saveUserInfoToCloud(userInfo)
  },
  
  // 保存用户信息到云数据库
  saveUserInfoToCloud: function(userInfo) {
    const db = wx.cloud.database()
    
    // 查询用户是否已存在
    db.collection('users').where({
      _openid: userInfo.openid || wx.cloud.getWXContext().OPENID
    }).get().then(res => {
      if (res.data.length === 0) {
        // 用户不存在，创建新用户
        db.collection('users').add({
          data: {
            ...userInfo,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        }).then(() => {
          console.log('用户信息保存成功')
        }).catch(err => {
          console.error('保存用户信息失败', err)
        })
      } else {
        // 用户已存在，更新用户信息
        db.collection('users').doc(res.data[0]._id).update({
          data: {
            ...userInfo,
            updateTime: db.serverDate()
          }
        }).then(() => {
          console.log('用户信息更新成功')
        }).catch(err => {
          console.error('更新用户信息失败', err)
        })
      }
    }).catch(err => {
      console.error('查询用户信息失败', err)
    })
  },
  
  // 退出登录
  logout: function(callback) {
    this.globalData.userInfo = null
    this.globalData.isLogin = false
    
    // 清除本地存储
    wx.removeStorage({
      key: 'userInfo',
      success: function() {
        if (callback && typeof callback === 'function') {
          callback(true)
        }
      },
      fail: function() {
        if (callback && typeof callback === 'function') {
          callback(false)
        }
      }
    })
  },
  
  // 获取用户信息
  getUserInfo: function(callback) {
    const that = this
    
    if (this.globalData.userInfo) {
      if (callback && typeof callback === 'function') {
        callback(this.globalData.userInfo)
      }
      return
    }
    
    // 从本地存储获取
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        that.globalData.userInfo = res.data
        that.globalData.isLogin = true
        
        if (callback && typeof callback === 'function') {
          callback(res.data)
        }
      },
      fail: function() {
        that.globalData.isLogin = false
        
        if (callback && typeof callback === 'function') {
          callback(null)
        }
      }
    })
  },

  // 检查管理员状态
  checkAdminStatus: function () {
    // 为了测试，直接设置为管理员
    this.setData({
      isAdmin: true
    });
    
    // 原来的代码可以注释掉
    /*
    const that = this;
    
    // 获取用户信息
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: function(res) {
        if (res.result && res.result.data) {
          that.setData({
            isAdmin: true
          });
        }
      },
      fail: function(err) {
        console.error('获取用户信息失败', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
    */
  }
})
