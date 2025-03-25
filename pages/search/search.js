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
    sortType: 'comprehensive',
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
      searchResults: [],
      sortType: 'comprehensive' // 重置排序方式为默认的综合排序
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
        let goods = result.data.goods;
        
        // 根据当前排序方式对结果进行排序
        this.sortResults(goods);
        
        this.setData({
          searchResults: goods,
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
        let newGoods = result.data.goods;
        let allGoods = [...this.data.searchResults, ...newGoods];
        
        // 对合并后的结果进行排序
        this.sortResults(allGoods);
        
        this.setData({
          searchResults: allGoods,
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
  },

  /**
   * 排序方式点击事件处理
   */
  onSortTap: function (e) {
    const type = e.currentTarget.dataset.type;
    
    // 如果点击当前已选中的排序方式，不做处理
    if (type === this.data.sortType) return;
    
    this.setData({
      sortType: type,
      loading: true
    });
    
    // 对当前结果进行排序
    let sortedResults = [...this.data.searchResults];
    this.sortResults(sortedResults);
    
    // 更新排序后的数据
    setTimeout(() => {
      this.setData({
        searchResults: sortedResults,
        loading: false
      });
    }, 300); // 添加短暂延时，让用户感知到有排序过程
  },
  
  /**
   * 根据当前的排序方式对结果进行排序
   */
  sortResults: function(results) {
    const type = this.data.sortType;
    
    if (type === 'newest') {
      // 按照上架时间排序（假设数据中有createTime字段）
      results.sort((a, b) => {
        return new Date(b.createTime || b.createAt || 0) - new Date(a.createTime || a.createAt || 0);
      });
    } else if (type === 'price') {
      // 按照价格从低到高排序
      results.sort((a, b) => {
        return parseFloat(a.price) - parseFloat(b.price);
      });
    } else {
      // 综合排序，可以根据多个因素计算权重
      results.sort((a, b) => {
        // 可以根据浏览量、收藏数等计算综合得分
        const scoreA = (a.views || 0) + (a.favorites || 0) * 2;
        const scoreB = (b.views || 0) + (b.favorites || 0) * 2;
        return scoreB - scoreA;
      });
    }
    
    return results;
  }
}) 