Page({
  /**
   * 页面的初始数据
   */
  data: {
    canIUseGetUserProfile: false,
    isLoading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 判断是否可以使用getUserProfile接口
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
    
    // 获取回调页面
    if (options.redirect) {
      this.setData({
        redirect: decodeURIComponent(options.redirect)
      });
    }
  },

  /**
   * 获取用户信息（新接口）
   */
  getUserProfile: function () {
    this.setData({
      isLoading: true
    });
    
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.processLogin(res);
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
        this.setData({
          isLoading: false
        });
      }
    });
  },

  /**
   * 获取用户信息（旧接口）
   */
  getUserInfo: function (e) {
    if (e.detail.userInfo) {
      this.setData({
        isLoading: true
      });
      this.processLogin(e.detail);
    } else {
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    }
  },

  /**
   * 处理登录逻辑
   */
  processLogin: function (userInfo) {
    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        const openid = res.result.openid;
        
        // 存储用户信息到本地
        wx.setStorageSync('userInfo', userInfo.userInfo);
        wx.setStorageSync('openid', openid);
        
        // 更新用户数据到数据库
        const db = wx.cloud.database();
        db.collection('users').where({
          _openid: openid
        }).get().then(result => {
          if (result.data.length === 0) {
            // 新用户，添加到数据库
            db.collection('users').add({
              data: {
                ...userInfo.userInfo,
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            }).then(() => {
              this.loginSuccess();
            }).catch(err => {
              console.error('添加用户失败', err);
              this.loginSuccess(); // 仍然允许登录
            });
          } else {
            // 更新现有用户信息
            db.collection('users').doc(result.data[0]._id).update({
              data: {
                ...userInfo.userInfo,
                updateTime: db.serverDate()
              }
            }).then(() => {
              this.loginSuccess();
            }).catch(err => {
              console.error('更新用户失败', err);
              this.loginSuccess(); // 仍然允许登录
            });
          }
        }).catch(err => {
          console.error('查询用户失败', err);
          this.loginSuccess(); // 仍然允许登录
        });
      },
      fail: err => {
        console.error('云函数调用失败', err);
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
        this.setData({
          isLoading: false
        });
      }
    });
  },

  /**
   * 登录成功后的处理
   */
  loginSuccess: function () {
    this.setData({
      isLoading: false
    });
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
    
    // 返回上一页或首页
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 取消登录
   */
  cancelLogin: function () {
    // 返回上一页或首页
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 跳转到用户协议页面
   */
  goToAgreement: function () {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  /**
   * 跳转到隐私政策页面
   */
  goToPrivacy: function () {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  /**
   * 获取手机号
   */
  getPhoneNumber: function (e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 用户同意授权手机号
      wx.showToast({
        title: '手机号授权成功',
        icon: 'success'
      });
      
      // 这里可以添加获取手机号的逻辑
      // 需要通过云函数解密获取真实手机号
    } else {
      wx.showToast({
        title: '手机号授权失败',
        icon: 'none'
      });
    }
  }
}) 