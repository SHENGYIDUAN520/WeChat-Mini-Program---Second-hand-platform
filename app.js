// 在全局范围内提供基本兼容
(function() {
  // 确保全局对象可用
  var globalObj = typeof window !== 'undefined' ? window : 
                 typeof global !== 'undefined' ? global : this;
  
  // 为类型数组提供兼容
  if (typeof Int8Array === 'undefined') {
    console.log('提供Int8Array兼容');
    try {
      globalObj.Int8Array = Array;
      globalObj.Uint8Array = Array;
      globalObj.Uint8ClampedArray = Array;
      globalObj.Int16Array = Array;
      globalObj.Uint16Array = Array;
      globalObj.Int32Array = Array;
      globalObj.Uint32Array = Array;
      globalObj.Float32Array = Array;
      globalObj.Float64Array = Array;
    } catch (e) {
      console.error('设置类型数组兼容失败', e);
    }
  }
  
  // 为模块系统提供兼容
  if (typeof define === 'undefined') {
    try {
      globalObj.define = function(factory) {
        try {
          var module = { exports: {} };
          factory(function(name) { return module.exports; }, module.exports, module);
          return module.exports;
        } catch (e) {
          console.error('定义模块出错:', e);
          return {};
        }
      };
    } catch (e) {
      console.error('设置define兼容失败', e);
    }
  }
  
  if (typeof require === 'undefined') {
    try {
      globalObj.require = function(path) {
        console.log('模拟require:', path);
        return {};
      };
    } catch (e) {
      console.error('设置require兼容失败', e);
    }
  }
  
  // 提供Trace对象兼容
  if (typeof Trace === 'undefined') {
    try {
      globalObj.Trace = {
        start: function() {},
        end: function() {},
        logData: function() {},
        log: function() {},
        push: function() {}
      };
    } catch (e) {
      console.error('设置Trace兼容失败', e);
    }
  }
  
  // 提供SystemError对象兼容
  if (typeof SystemError === 'undefined') {
    try {
      globalObj.SystemError = function(message) {
        this.name = 'SystemError';
        this.message = message || '';
        this.stack = (new Error()).stack;
      };
      globalObj.SystemError.prototype = Object.create(Error.prototype);
      globalObj.SystemError.prototype.constructor = globalObj.SystemError;
    } catch (e) {
      console.error('设置SystemError兼容失败', e);
    }
  }
})();

// app.js
App({
  onLaunch: function () {
    // 在这里执行业务代码
    
    // 初始化云环境
    this.initCloud();

    this.globalData = {
      userInfo: null,
      isLogin: false
    }
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 设置全局错误处理
    this.setupErrorHandling();
  },
  
  // 初始化云环境
  initCloud: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      wx.showToast({
        title: '基础库版本过低',
        icon: 'none'
      });
      return false;
    } else {
      try {
        wx.cloud.init({
          env: 'cloud1-7gv3a2fb5a1258e5',
          traceUser: true,
        });
        console.log('云环境初始化成功');
        return true;
      } catch (e) {
        console.error('云环境初始化失败', e);
        wx.showToast({
          title: '云服务初始化失败',
          icon: 'none'
        });
        return false;
      }
    }
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLogin = true;
    }
  },
  
  // 获取用户信息
  getUserInfo: function(callback) {
    const that = this;
    
    if (this.globalData.userInfo) {
      if (callback && typeof callback === 'function') {
        callback(this.globalData.userInfo);
      }
      return;
    }
    
    // 从本地存储获取
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        that.globalData.userInfo = res.data;
        that.globalData.isLogin = true;
        
        if (callback && typeof callback === 'function') {
          callback(res.data);
        }
      },
      fail: function() {
        that.globalData.isLogin = false;
        
        if (callback && typeof callback === 'function') {
          callback(null);
        }
      }
    });
  },
  
  // 登录方法
  login: function(userInfo, callback) {
    // 保存用户信息到全局数据
    this.globalData.userInfo = userInfo;
    this.globalData.isLogin = true;
    
    // 保存到本地存储
    wx.setStorage({
      key: 'userInfo',
      data: userInfo,
      success: function() {
        if (callback && typeof callback === 'function') {
          callback(true);
        }
      },
      fail: function() {
        if (callback && typeof callback === 'function') {
          callback(false);
        }
      }
    });
  },
  
  // 退出登录
  logout: function(callback) {
    this.globalData.userInfo = null;
    this.globalData.isLogin = false;
    
    // 清除本地存储
    wx.removeStorage({
      key: 'userInfo',
      success: function() {
        if (callback && typeof callback === 'function') {
          callback(true);
        }
      },
      fail: function() {
        if (callback && typeof callback === 'function') {
          callback(false);
        }
      }
    });
  },
  
  // 错误处理
  setupErrorHandling: function() {
    // 捕获全局JS错误
    wx.onError(err => {
      console.error('全局错误:', err);
      
      // 忽略一些已知的公共库错误
      if (err.includes('Int8Array') || 
          err.includes('define is not defined') || 
          err.includes('Trace is not defined') || 
          err.includes('SystemError')) {
        console.log('忽略已知公共库错误');
        return;
      }
    });
    
    // 捕获未处理的Promise错误
    wx.onUnhandledRejection(res => {
      console.error('未处理的Promise错误:', res.reason);
    });
  }
});
