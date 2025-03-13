// pages/settings/settings.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLogin: false,
    notificationEnabled: true,
    currentTheme: '粉色',
    currentLanguage: '简体中文',
    cacheSize: '0.00MB'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.checkLoginStatus();
    this.calculateCacheSize();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus: function () {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        isLogin: true
      });
    } else {
      this.setData({
        isLogin: false
      });
    }
  },

  /**
   * 返回上一页
   */
  navigateBack: function () {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 切换消息通知
   */
  toggleNotification: function (e) {
    const value = e.detail.value;
    this.setData({
      notificationEnabled: value
    });
    
    wx.showToast({
      title: value ? '已开启消息通知' : '已关闭消息通知',
      icon: 'none'
    });
    
    // 保存设置到本地
    wx.setStorageSync('notificationEnabled', value);
  },

  /**
   * 计算缓存大小
   */
  calculateCacheSize: function () {
    // 模拟计算缓存大小
    const size = (Math.random() * 10).toFixed(2);
    this.setData({
      cacheSize: size + 'MB'
    });
  },

  /**
   * 清除缓存
   */
  clearCache: function () {
    const that = this;
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？',
      confirmColor: '#FB7299',
      success: function (res) {
        if (res.confirm) {
          // 显示加载中
          wx.showLoading({
            title: '清除中...',
            mask: true
          });
          
          // 模拟清除过程
          setTimeout(function () {
            wx.hideLoading();
            wx.showToast({
              title: '缓存已清除',
              icon: 'success'
            });
            
            that.setData({
              cacheSize: '0.00MB'
            });
          }, 1500);
        }
      }
    });
  },

  /**
   * 退出登录
   */
  logout: function () {
    const that = this;
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      confirmColor: '#FB7299',
      success: function (res) {
        if (res.confirm) {
          // 显示加载中
          wx.showLoading({
            title: '退出中...',
            mask: true
          });
          
          // 模拟退出过程
          setTimeout(function () {
            // 清除用户信息
            wx.removeStorageSync('userInfo');
            wx.removeStorageSync('token');
            
            that.setData({
              isLogin: false
            });
            
            wx.hideLoading();
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            });
            
            // 返回到个人中心页面
            setTimeout(function () {
              wx.navigateBack({
                delta: 1
              });
            }, 1500);
          }, 1000);
        }
      }
    });
  }
}) 