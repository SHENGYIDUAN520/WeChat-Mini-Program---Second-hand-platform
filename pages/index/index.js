// pages/index/index.js
// 不要在页面顶部直接初始化云数据库
// const db = wx.cloud.database()
// const _ = db.command

// 确保define和require函数存在
if (typeof define === 'undefined') {
  try {
    define = function(factory) {
      try {
        var module = { exports: {} };
        factory(function(name) { return module.exports; }, module.exports, module);
        return module.exports;
      } catch (e) {
        console.error('define模块加载出错', e);
        return {};
      }
    };
  } catch (e) {
    console.error('设置define函数失败', e);
  }
}

if (typeof require === 'undefined') {
  try {
    require = function(path) {
      console.log('模拟require:', path);
      return {};
    };
  } catch (e) {
    console.error('设置require函数失败', e);
  }
}

// 保证类型数组可用
if (typeof Int8Array === 'undefined') {
  console.log('页面内提供类型数组兼容');
  try {
    var globalObj = typeof window !== 'undefined' ? window : 
                  typeof global !== 'undefined' ? global : this;
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

// 安全获取数据库对象
const getDB = function() {
  try {
    return wx.cloud.database();
  } catch (e) {
    console.error('获取数据库对象失败', e);
    return null;
  }
};

Page({
  data: {
    goodsList: [],
    loading: true,
    searchValue: '',
    showMoreCategories: false,
    categories: [
      {
        id: 1,
        name: '电子产品',
        icon: '/images/category/digital.png',
        sort: 1
      },
      {
        id: 2,
        name: '图书教材',
        icon: '/images/category/books.png',
        sort: 2
      },
      {
        id: 3,
        name: '生活用品',
        icon: '/images/category/daily.png',
        sort: 3
      },
      {
        id: 4,
        name: '服装鞋帽',
        icon: '/images/category/clothing.png',
        sort: 4
      },
      {
        id: 5,
        name: '运动户外',
        icon: '/images/category/sports.png',
        sort: 5
      },
      {
        id: 6,
        name: '美妆护肤',
        icon: '/images/category/beauty.png',
        sort: 6
      },
      {
        id: 7,
        name: '乐器',
        icon: '/images/category/music.png',
        sort: 7
      },
      {
        id: 8,
        name: '其他',
        icon: '/images/category/other.png',
        sort: 8
      }
    ],
    selectedCategory: '',
    sortType: 'time', // time-最新发布, price-价格升序, price-desc-价格降序
    hasMore: true,
    page: 0,
    pageSize: 10,
    banners: [
      {
        id: 1,
        image: '/images/covers/banner1.jpg',
        title: '校园二手交易平台',
        url: '/pages/about/about'
      },
    ],
    recommendGoods: [], // 推荐商品
    newGoods: [], // 最新上架商品
    isError: false, // 加载错误标记
    errorMsg: '', // 错误信息
    isCloudReady: false, // 云服务是否准备就绪
  },
  
  // 获取云数据库实例
  getDB: function() {
    try {
      const app = getApp();
      // 确保云环境已初始化
      if (!app || !wx.cloud) {
        this.setData({
          isError: true,
          errorMsg: '云服务未初始化，请重启小程序'
        });
        return null;
      }
      
      // 如果云环境还未初始化，立即执行初始化
      if (!this.data.isCloudReady) {
        console.log('初始化云环境');
        app.initCloud();
        this.setData({
          isCloudReady: true
        });
      }
      
      return wx.cloud.database();
    } catch (e) {
      console.error('获取云数据库失败', e);
      this.setData({
        isError: true,
        errorMsg: '云服务初始化失败，请重启小程序'
      });
      return null;
    }
  },

  onLoad: function() {
    try {
      // 检查云服务是否可用
      setTimeout(() => {
        this.loadInitialData();
      }, 500); // 延迟500ms，确保app.js中的云初始化有足够时间完成
    } catch (e) {
      console.error('首页加载失败', e);
      this.setData({
        loading: false,
        isError: true,
        errorMsg: '页面加载异常，请重试'
      });
    }
  },
  
  // 安全加载初始数据
  loadInitialData: function() {
    // 确保每个函数都返回Promise
    const safePromise = (fn) => {
      try {
        const result = fn.call(this);
        // 如果函数没有返回Promise，则包装成Promise
        if (result && typeof result.then === 'function') {
          return result.catch(err => {
            console.error(`执行${fn.name || '函数'}失败`, err);
            return []; // 出错时返回空数组
          });
        } else {
          console.log(`函数${fn.name || ''}没有返回Promise，进行包装`);
          return Promise.resolve([]);
        }
      } catch (e) {
        console.error('执行函数出错', e);
        return Promise.resolve([]);
      }
    };
    
    // 执行安全加载
    Promise.all([
      safePromise(this.loadCategories),
      safePromise(this.loadRecommendGoods),
      safePromise(this.loadNewGoods),
      safePromise(this.loadGoods)
    ]).catch(err => {
      console.error('数据加载过程出错', err);
      this.setData({
        loading: false
      });
    });
  },

  // 加载商品列表
  loadGoods: function() {
    this.setData({
      loading: true
    });
    
    // 获取数据库实例
    const db = getDB();
    if (!db) {
      this.setData({
        loading: false,
        isError: true,
        errorMsg: '数据库连接失败'
      });
      return Promise.resolve([]);
    }
    
    const _ = db.command;
    
    // 添加错误处理和超时控制
    return new Promise((resolve, reject) => {
      try {
        // 构建查询条件
        let query = {
          status: 'on_sale' // 只查询在售商品
        };
        
        // 如果选择了分类，添加分类条件
        if (this.data.selectedCategory) {
          query.category = this.data.selectedCategory;
        }
        
        // 如果有搜索关键词，添加搜索条件
        if (this.data.searchValue) {
          query.title = db.RegExp({
            regexp: this.data.searchValue,
            options: 'i' // 不区分大小写
          });
        }
        
        // 确定排序方式
        let orderField = 'createTime';
        let orderDirection = 'desc';
        
        if (this.data.sortType === 'price') {
          orderField = 'price';
          orderDirection = 'asc';
        } else if (this.data.sortType === 'price-desc') {
          orderField = 'price';
          orderDirection = 'desc';
        }
        
        // 执行查询
        db.collection('goods')
          .where(query)
          .orderBy(orderField, orderDirection)
          .skip(this.data.page * this.data.pageSize)
          .limit(this.data.pageSize)
          .get()
          .then(res => {
            // 处理数据
            const goods = res.data.map(item => {
              // 处理日期格式
              if (item.createTime) {
                try {
                  const date = new Date(item.createTime);
                  item.createTime = `${date.getMonth() + 1}月${date.getDate()}日`;
                } catch (e) {
                  item.createTime = '未知日期';
                }
              }
              
              // 判断是否为新品（7天内发布）
              item.isNew = false; // 默认不是新品
              try {
                if (item.createTime) {
                  const now = new Date();
                  const createTime = new Date(item.createTime);
                  const diffDays = Math.floor((now - createTime) / (24 * 3600 * 1000));
                  item.isNew = diffDays <= 7;
                }
              } catch (e) {
                console.error('处理商品日期失败', e);
              }
              
              return item;
            });
            
            this.setData({
              goodsList: [...this.data.goodsList, ...goods],
              loading: false,
              hasMore: goods.length === this.data.pageSize,
              page: this.data.page + 1,
              isError: false
            });
            
            resolve(goods);
          })
          .catch(err => {
            console.error('加载商品列表失败', err);
            this.setData({
              loading: false,
              isError: true,
              errorMsg: '加载失败，请下拉刷新重试'
            });
            resolve([]);
          });
      } catch (e) {
        console.error('加载商品列表异常', e);
        this.setData({
          loading: false,
          isError: true,
          errorMsg: '加载失败，请下拉刷新重试'
        });
        resolve([]);
      }
    });
  },

  onPullDownRefresh: function() {
    this.setData({
      goodsList: [],
      recommendGoods: [],
      newGoods: [],
      page: 0,
      hasMore: true
    });

    // 使用安全的Promise包装
    const safePromise = (fn) => {
      try {
        const result = fn.call(this);
        if (result && typeof result.then === 'function') {
          return result.catch(err => {
            console.error(`下拉刷新执行${fn.name || '函数'}失败`, err);
            return []; 
          });
        } else {
          return Promise.resolve([]);
        }
      } catch (e) {
        console.error('下拉刷新执行函数出错', e);
        return Promise.resolve([]);
      }
    };

    Promise.all([
      safePromise(this.loadRecommendGoods),
      safePromise(this.loadNewGoods),
      safePromise(this.loadGoods)
    ]).then(() => {
      wx.stopPullDownRefresh();
    }).catch(err => {
      console.error('下拉刷新失败', err);
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    });
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreGoods()
    }
  },

  // 加载分类
  loadCategories: function() {
    // 获取数据库实例
    const db = getDB();
    if (!db) {
      console.error('获取数据库实例失败');
      return Promise.resolve(this.data.categories);
    }
    
    return db.collection('categories')
      .orderBy('sort', 'asc')
      .get()
      .then(res => {
        if (res.data && res.data.length > 0) {
          console.log('从数据库加载分类成功', res.data);
          this.setData({
            categories: res.data
          });
          return res.data;
        } else {
          console.log('数据库中没有分类数据，使用本地数据');
          return this.data.categories;
        }
      })
      .catch(err => {
        console.error('加载分类数据失败', err);
        return this.data.categories;
      });
  },

  // 加载推荐商品
  loadRecommendGoods: function() {
    // 获取数据库实例
    const db = getDB();
    if (!db) {
      return Promise.resolve([]);
    }
    
    return db.collection('goods')
      .where({
        status: 'on_sale' // 只查询在售商品
      })
      .orderBy('views', 'desc') // 按浏览量降序排序
      .limit(4) // 只取4个
      .get()
      .then(res => {
        // 处理数据
        const goods = res.data.map(item => {
          // 处理日期格式
          if (item.createTime) {
            try {
              const date = new Date(item.createTime);
              item.createTime = `${date.getMonth() + 1}月${date.getDate()}日`;
            } catch (e) {
              console.error('日期处理错误', e);
              item.createTime = '未知';
            }
          }

          // 判断是否为新品（7天内发布）
          item.isNew = false;
          try {
            if (item.createTime) {
              const now = new Date();
              const createTime = new Date(item.createTime);
              const diffDays = Math.floor((now - createTime) / (24 * 3600 * 1000));
              item.isNew = diffDays <= 7;
            }
          } catch (e) {
            console.error('日期处理错误', e);
          }

          return item;
        });

        this.setData({
          recommendGoods: goods
        });
        
        return goods;
      })
      .catch(err => {
        console.error('加载推荐商品失败', err);
        return [];
      });
  },
  
  // 加载最新商品
  loadNewGoods: function() {
    // 获取数据库实例
    const db = getDB();
    if (!db) {
      return Promise.resolve([]);
    }
    
    return db.collection('goods')
      .where({
        status: 'on_sale' // 只查询在售商品
      })
      .orderBy('createTime', 'desc') // 按创建时间降序排序
      .limit(6) // 只取6个
      .get()
      .then(res => {
        // 处理数据
        const goods = res.data.map(item => {
          // 处理日期格式
          if (item.createTime) {
            try {
              const date = new Date(item.createTime);
              item.createTime = `${date.getMonth() + 1}月${date.getDate()}日`;
            } catch (e) {
              console.error('日期处理错误', e);
              item.createTime = '未知';
            }
          }

          // 标记为新品
          item.isNew = true;

          return item;
        });

        this.setData({
          newGoods: goods
        });
        
        return goods;
      })
      .catch(err => {
        console.error('加载最新商品失败', err);
        return [];
      });
  },

  // 加载更多商品
  loadMoreGoods: function() {
    if (this.data.loading) return Promise.resolve([]); 
    
    return this.loadGoods();
  },

  // 搜索输入变化
  onSearchInput: function(e) {
    this.setData({
      searchValue: e.detail.value
    })
  },

  // 执行搜索
  onSearch: function() {
    this.setData({
      goodsList: [],
      page: 0,
      hasMore: true
    })
    this.loadGoods()
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchValue: '',
      goodsList: [],
      page: 0,
      hasMore: true
    })
    this.loadGoods()
  },

  // 选择分类
  selectCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id
    
    this.setData({
      selectedCategory: this.data.selectedCategory === categoryId ? '' : categoryId,
      goodsList: [],
      page: 0,
      hasMore: true
    })
    
    this.loadGoods()
  },

  // 切换排序方式
  changeSortType: function(e) {
    const type = e.currentTarget.dataset.type
    
    this.setData({
      sortType: type,
      goodsList: [],
      page: 0,
      hasMore: true
    })
    
    this.loadGoods()
  },

  // 查看商品详情
  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 导航到分类页面
  navigateToCategory: function(e) {
    const id = e.currentTarget.dataset.id;
    const categoryItem = this.data.categories.find(item => item.id === id);
    
    if (!categoryItem) {
      wx.showToast({
        title: '分类不存在',
        icon: 'none'
      });
      return;
    }
    
    console.log('跳转到分类:', categoryItem.name, '分类ID:', id);
    
    const url = `/pages/goods/goods?category=${id}&categoryName=${encodeURIComponent(categoryItem.name)}`;
    console.log('跳转URL:', url);
    
    wx.navigateTo({
      url: url,
      success: () => {
        console.log('分类跳转成功');
      },
      fail: (err) => {
        console.error('分类跳转失败', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 导航到更多页面
  navigateToMore() {
    wx.navigateTo({
      url: '/pages/goods/goods'
    })
  },

  // 导航到商品详情
  navigateToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    })
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return Promise.resolve(false);
    
    this.setData({ loading: true });
    
    // 返回Promise
    return new Promise((resolve) => {
      // 调用加载更多商品函数
      setTimeout(() => {
        this.loadMoreGoods().then(() => {
          resolve(true);
        }).catch(err => {
          console.error('加载更多失败', err);
          this.setData({
            loading: false
          });
          resolve(false);
        });
      }, 300);
    });
  },

  // 页面上拉触底事件
  onReachBottom() {
    this.loadMore()
  },

  // 下拉刷新
  onPullDownRefresh() {
    // 重新加载数据
    this.setData({
      loading: true,
      hasMore: true
    })
    
    setTimeout(() => {
      this.setData({
        loading: false
      })
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 跳转到搜索页面
  navigateToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/search'
    })
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '二手物品交易平台',
      query: ''
    }
  },

  // 轮播图切换事件
  swiperChange: function(e) {
    // 可以在这里处理轮播图切换事件
    // console.log('当前轮播图索引：', e.detail.current)
  },

  // 点击轮播图跳转
  navigateToBanner: function(e) {
    const id = e.currentTarget.dataset.id;
    const banner = this.data.banners.find(item => item.id === id);
    if (banner && banner.url) {
      wx.navigateTo({
        url: banner.url
      });
    }
  },

  // 添加一个方法来调用updateGoodsStatus云函数
  updateGoodsStatus: function() {
    wx.showLoading({
      title: '更新中...',
    })

    wx.cloud.callFunction({
      name: 'updateGoodsStatus',
      success: res => {
        wx.hideLoading()
        console.log('更新商品状态成功', res)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      },
      fail: err => {
        wx.hideLoading()
        console.error('更新商品状态失败', err)
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      }
    })
  },

  // 页面重试时，重新初始化云环境
  retryLoad: function() {
    try {
      const app = getApp();
      if (app && app.initCloud) {
        // 重新初始化云环境
        console.log('重试页面加载，重新初始化云环境');
        app.initCloud();
      } else {
        console.error('获取应用实例失败或无法初始化云环境');
      }
      
      // 重置页面数据
      this.setData({
        goodsList: [],
        recommendGoods: [],
        newGoods: [],
        page: 0,
        hasMore: true,
        isError: false,
        errorMsg: '',
        isCloudReady: true,
        loading: true
      });
      
      // 重新加载数据
      setTimeout(() => {
        this.loadInitialData();
      }, 1000); // 增加延迟时间至1000ms，给云环境初始化更多时间
    } catch (e) {
      console.error('重试加载失败', e);
      this.setData({
        isError: true,
        errorMsg: '重试失败，请重启小程序',
        loading: false
      });
      
      wx.showToast({
        title: '重试失败，请重启小程序',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 切换分类展示状态
  toggleCategories: function() {
    this.setData({
      showMoreCategories: !this.data.showMoreCategories
    });
  },
})
