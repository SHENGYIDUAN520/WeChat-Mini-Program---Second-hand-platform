Page({
  /**
   * 页面的初始数据
   */
  data: {
    keyword: '',
    historyKeywords: [],
    hotKeywords: ['二手书籍', '电子产品', '自行车', '运动器材', '考研资料', '乐器'],
    searchResults: [],
    loading: false,
    hasMore: true,
    page: 0,
    pageSize: 10,
    showHistory: true,
    showHot: true,
    showResults: false,
    categories: [
      { id: 1, name: '电子产品', icon: '/images/category/digital.png' },
      { id: 2, name: '图书教材', icon: '/images/category/books.png' },
      { id: 3, name: '生活用品', icon: '/images/category/daily.png' },
      { id: 4, name: '服装鞋帽', icon: '/images/category/clothing.png' },
      { id: 5, name: '运动户外', icon: '/images/category/others.png' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 如果有关键词参数，直接搜索
    if (options.keyword) {
      this.setData({
        keyword: options.keyword
      });
      this.search();
    }
    
    // 获取历史搜索记录
    const historyKeywords = wx.getStorageSync('historyKeywords') || [];
    this.setData({
      historyKeywords: historyKeywords
    });
  },

  /**
   * 输入框内容变化事件
   */
  onInputChange: function (e) {
    this.setData({
      keyword: e.detail.value
    });
    
    // 如果清空了输入框，显示历史记录和热门搜索
    if (!e.detail.value) {
      this.setData({
        showHistory: true,
        showHot: true,
        showResults: false
      });
    }
  },

  /**
   * 搜索确认事件
   */
  onSearch: function () {
    if (!this.data.keyword.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }
    
    this.search();
  },

  /**
   * 执行搜索
   */
  search: function () {
    // 保存搜索历史
    this.saveSearchHistory(this.data.keyword);
    
    // 显示搜索结果区域
    this.setData({
      showHistory: false,
      showHot: false,
      showResults: true,
      loading: true,
      page: 0,
      searchResults: []
    });
    
    // 调用云函数进行搜索
    wx.cloud.callFunction({
      name: 'getSearchResults',
      data: {
        keyword: this.data.keyword,
        page: 0,
        pageSize: this.data.pageSize
      }
    }).then(res => {
      const result = res.result;
      if (result.code === 0) {
        this.setData({
          searchResults: result.data.goods,
          loading: false,
          hasMore: result.data.hasMore
        });
      } else {
        this.setData({
          loading: false,
          hasMore: false
        });
        wx.showToast({
          title: '搜索失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('搜索失败', err);
      this.setData({
        loading: false,
        hasMore: false
      });
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    });
  },

  /**
   * 保存搜索历史
   */
  saveSearchHistory: function (keyword) {
    let historyKeywords = this.data.historyKeywords;
    
    // 如果已存在，先移除
    const index = historyKeywords.indexOf(keyword);
    if (index > -1) {
      historyKeywords.splice(index, 1);
    }
    
    // 添加到最前面
    historyKeywords.unshift(keyword);
    
    // 最多保存10条
    if (historyKeywords.length > 10) {
      historyKeywords = historyKeywords.slice(0, 10);
    }
    
    // 更新数据和本地存储
    this.setData({
      historyKeywords: historyKeywords
    });
    wx.setStorageSync('historyKeywords', historyKeywords);
  },

  /**
   * 点击历史记录或热门搜索
   */
  onTagTap: function (e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      keyword: keyword
    });
    this.search();
  },

  /**
   * 清空历史记录
   */
  clearHistory: function () {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            historyKeywords: []
          });
          wx.removeStorageSync('historyKeywords');
        }
      }
    });
  },

  /**
   * 点击分类
   */
  onCategoryTap: function (e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    // 跳转到商品列表页，带上分类参数
    wx.navigateTo({
      url: `/pages/goods-list/goods-list?categoryId=${id}&categoryName=${name}`
    });
  },

  /**
   * 点击商品
   */
  onGoodsTap: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    });
  },

  /**
   * 加载更多
   */
  loadMore: function () {
    if (!this.data.hasMore || this.data.loading) return;
    
    this.setData({
      page: this.data.page + 1,
      loading: true
    });
    
    // 调用云函数加载更多
    wx.cloud.callFunction({
      name: 'getSearchResults',
      data: {
        keyword: this.data.keyword,
        page: this.data.page - 1,
        pageSize: this.data.pageSize
      }
    }).then(res => {
      const result = res.result;
      if (result.code === 0) {
        this.setData({
          searchResults: [...this.data.searchResults, ...result.data.goods],
          loading: false,
          hasMore: result.data.hasMore
        });
      } else {
        this.setData({
          loading: false
        });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('加载更多失败', err);
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  /**
   * 返回上一页
   */
  goBack: function () {
    wx.navigateBack();
  }
}) 