<template>
  <div>
    <header class="header-banner">
      <div class="hero-content">
        <div class="logo-container">
          <img src="/img/index.png" class="hero-logo" alt="logo" />
          <h1 class="hero-title">Tavern Translator</h1>
        </div>
        <p class="hero-subtitle">SillyTavern 角色卡翻译工具</p>
        <div class="hero-divider"></div>
      </div>
      <div
        class="theme-toggle"
        @click="toggleTheme"
        :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
      >
        <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'"></i>
      </div>
    </header>

    <div class="container steps-container">
      <el-steps :active="step" finish-status="success" align-center>
        <el-step title="上传文件" />
        <el-step title="设置参数" />
        <el-step title="翻译中" />
        <el-step title="完成" />
      </el-steps>

      <el-card class="fade-in">
        <upload-step v-if="step === 0" @success="onUpload" />
        <config-step v-else-if="step === 1" :params="params" @start="start" />
        <progress-step v-else-if="step === 2" :progress="progress" :logs="logs" />
        <result-step v-else-if="step === 3" :download="download" @reset="reset" />
      </el-card>
    </div>

    <div class="footer">
      <p>© 2025 Tavern Translator</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import UploadStep from './components/UploadStep.vue'
import ConfigStep from './components/ConfigStep.vue'
import ProgressStep from './components/ProgressStep.vue'
import ResultStep from './components/ResultStep.vue'

const step = ref(0)
const taskId = ref('')
const params = reactive({ model_name: '', base_url: '', api_key: '' })
const progress = ref(0)
const logs = ref('')
const download = reactive({ json: '', image: '' })
const isDark = ref(false)
let ws = null
let ping = null

function applyTheme() {
  document.documentElement.classList.toggle('dark-theme', isDark.value)
}

function toggleTheme() {
  isDark.value = !isDark.value
  applyTheme()
  localStorage.setItem('tavern_translator_theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const saved = localStorage.getItem('tavern_translator_theme')
  if (saved) {
    isDark.value = saved === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme()
})

function onUpload(id) {
  taskId.value = id
  step.value = 1
}

function start() {
  axios.post('/translate', {
    task_id: taskId.value,
    model_name: params.model_name,
    base_url: params.base_url,
    api_key: params.api_key
  }).then(() => {
    connect()
    step.value = 2
  }).catch(err => {
    alert(err.response?.data?.error || err.message)
  })
}

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(`${proto}://${location.host}/ws/${taskId.value}`)
  ws.onopen = () => {
    ping = setInterval(() => ws.send('ping'), 30000)
  }
  ws.onmessage = e => {
    if (e.data === 'pong') return
    const data = JSON.parse(e.data)
    if (data.type === 'log') {
      logs.value += data.message + '\n'
    } else if (data.type === 'completed') {
      progress.value = 100
      download.json = `/download/json/${taskId.value}`
      download.image = `/download/image/${taskId.value}`
      step.value = 3
      ws.close()
    } else if (data.type === 'error') {
      logs.value += 'ERROR: ' + data.message + '\n'
    }
  }
  ws.onclose = () => clearInterval(ping)
}

function reset() {
  taskId.value = ''
  progress.value = 0
  logs.value = ''
  download.json = ''
  download.image = ''
  step.value = 0
}
</script>
