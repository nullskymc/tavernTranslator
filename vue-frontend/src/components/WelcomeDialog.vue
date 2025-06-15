<template>
  <el-dialog
    title="欢迎使用 Tavern Translator"
    v-model="welcomeDialogVisible"
    :width="isMobile ? '95%' : '500px'"
    center
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="welcome-dialog"
    append-to-body
  >
    <div class="welcome-content">
      <h3><i class="fas fa-magic" style="margin-right:8px;"></i>欢迎使用 Tavern Translator 角色卡翻译工具</h3>
      <p>这是一个专为 SillyTavern 角色卡设计的翻译工具，可以帮助你将英文角色卡翻译成中文。</p>
      
      <h4><i class="fas fa-list-ol" style="margin-right:8px;color:var(--primary-color)"></i>使用步骤：</h4>
      <ol>
        <li>上传 PNG 格式的角色卡文件</li>
        <li>设置翻译参数（需要提供自己的 API 密钥）</li>
        <li>等待翻译完成</li>
        <li>下载翻译后的角色卡文件</li>
      </ol>

      <h4><i class="fas fa-info-circle" style="margin-right:8px;color:var(--primary-color)"></i>说明：</h4>
      <p>项目仅作演示，所有记录保存在本地浏览器中，如有隐私需求建议<a href="https://github.com/nullskymc/tavernTranslator" target="_blank">前往 GitHub 仓库</a>自行部署。</p>
      <p>欢迎加入秋秋群 1043662159 交流项目出现的问题，或在 github issue中提交你面对的问题</p>
      <div class="tip">
        <i class="fas fa-lightbulb" style="margin-right:8px;"></i>
        <strong>提示：</strong> 翻译质量取决于您选择的语言模型，请确保使用高质量的API和适当的模型名称。
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" @click="closeWelcomeDialog" size="default">
          <el-icon><Right /></el-icon>
          开始使用
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useUIStore } from '../stores/ui'
import { Right } from '@element-plus/icons-vue'

const uiStore = useUIStore()
const { welcomeDialogVisible, isMobile } = storeToRefs(uiStore)
const { closeWelcomeDialog } = uiStore
</script>

<style scoped>
.welcome-content {
  font-size: 14px;
  line-height: 1.6;
}

.welcome-content h3 {
  color: var(--primary-color);
  margin-bottom: 15px;
}

.welcome-content h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 15px;
}

.welcome-content ol {
  padding-left: 20px;
  margin: 10px 0;
}

.welcome-content li {
  margin: 5px 0;
}

.welcome-content a {
  color: var(--primary-color);
  text-decoration: none;
}

.welcome-content a:hover {
  text-decoration: underline;
}

.tip {
  background: var(--background-secondary);
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
  border-left: 4px solid var(--primary-color);
}

.tip strong {
  color: var(--primary-color);
}
</style>
