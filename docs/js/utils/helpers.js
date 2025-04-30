/**
 * 辅助函数模块 - 提供各种工具函数
 */

// 混合多个对象的数据和方法
function mixinModules(...modules) {
  const result = {
    data() {
      const combinedData = {};
      modules.forEach(module => {
        if (module.data) {
          const moduleData = module.data.call(this);
          Object.assign(combinedData, moduleData);
        }
      });
      return combinedData;
    },
    methods: {},
    computed: {}
  };
  
  // 合并方法
  modules.forEach(module => {
    if (module.methods) {
      Object.assign(result.methods, module.methods);
    }
  });
  
  // 合并计算属性
  modules.forEach(module => {
    if (module.computed) {
      Object.assign(result.computed, module.computed);
    }
  });
  
  return result;
}

export { mixinModules };
