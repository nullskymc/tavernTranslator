<template>
  <div class="container">
    <upload-step v-if="step === 0" @success="onUpload" />
    <config-step v-else-if="step === 1" :params="params" @start="start" />
    <progress-step v-else-if="step === 2" :progress="progress" :logs="logs" />
    <result-step v-else-if="step === 3" :download="download" @reset="reset" />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
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
let ws = null
let ping = null

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
      download.json = data.json_output
      download.image = data.image_output
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

<style scoped>
.container {
  padding: 1rem;
}
</style>
