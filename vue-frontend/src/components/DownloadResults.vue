<template>
  <el-card class="fade-in">
    <template #header>
      <div class="step-title">
        <span class="step-number">4</span>
        <span class="step-text">下载翻译结果</span>
      </div>
    </template>
    
    <el-alert
      title="翻译完成！请选择下载格式"
      type="success"
      :closable="false"
      show-icon
      style="margin-bottom:20px;">
    </el-alert>
    
    <div class="download-options">
      <div class="download-card" @click="downloadImage">
        <div class="download-icon">
          <i class="fas fa-image"></i>
        </div>
        <div class="download-title">PNG 角色卡</div>
        <div class="download-desc">下载翻译后的PNG格式角色卡，可直接导入SillyTavern使用</div>
      </div>
      
      <div class="download-card" @click="downloadJson">
        <div class="download-icon">
          <i class="fas fa-file-code"></i>
        </div>
        <div class="download-title">JSON 数据</div>
        <div class="download-desc">下载翻译后的JSON格式数据，可用于进一步编辑或备份</div>
      </div>
    </div>
    
    <div class="action-buttons" style="margin-top:30px;">
      <el-button type="primary" @click="resetTranslation">
        <el-icon><Refresh /></el-icon>
        翻译新角色卡
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
import { Refresh } from '@element-plus/icons-vue'
import { useTranslatorStore } from '../stores/translator'
import { useUIStore } from '../stores/ui'

const translatorStore = useTranslatorStore()
const uiStore = useUIStore()

// 下载PNG格式文件
const downloadImage = () => {
  translatorStore.downloadImage()
}

// 下载JSON格式文件
const downloadJson = () => {
  translatorStore.downloadJson()
}

// 重置翻译过程
const resetTranslation = () => {
  translatorStore.resetTranslation()
  uiStore.resetSteps()
}
</script>

<style scoped>
.step-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.step-number {
  width: 30px;
  height: 30px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 14px;
  font-weight: bold;
}

.step-text {
  color: var(--text-primary);
}

.download-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.download-card {
  background: var(--background-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.download-card:hover {
  border-color: var(--primary-color);
  background: var(--background-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.download-card:active {
  transform: translateY(0);
}

.download-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 15px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  transition: all 0.3s ease;
}

.download-card:hover .download-icon {
  transform: scale(1.1);
}

.download-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.download-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .download-options {
    grid-template-columns: 1fr;
  }
  
  .download-card {
    padding: 25px 15px;
  }
  
  .download-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .download-title {
    font-size: 16px;
  }
  
  .download-desc {
    font-size: 13px;
  }
}
</style>
