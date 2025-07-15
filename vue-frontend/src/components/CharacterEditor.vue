
<template>
  <div v-if="store.characterCard" class="character-editor">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>内容编辑器</span>
        </div>
      </template>

      <!-- 表单内容 -->
      <el-form label-position="top" class="editor-form">
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="角色名称 (Name)"><el-input v-model="name" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="角色标签 (Tags)"><el-input v-model="tags" placeholder="使用逗号分隔标签" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item><template #label><span>角色描述 (Description)</span><el-button class="translate-btn" type="primary" text @click="store.translateField('data.description')" :loading="store.isLoading">翻译</el-button></template><el-input v-model="description" type="textarea" :rows="8" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item><template #label><span>性格 (Personality)</span><el-button class="translate-btn" type="primary" text @click="store.translateField('data.personality')" :loading="store.isLoading">翻译</el-button></template><el-input v-model="personality" type="textarea" :rows="5" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item><template #label><span>场景 (Scenario)</span><el-button class="translate-btn" type="primary" text @click="store.translateField('data.scenario')" :loading="store.isLoading">翻译</el-button></template><el-input v-model="scenario" type="textarea" :rows="5" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item><template #label><span>开场白 (First Message)</span><el-button class="translate-btn" type="primary" text @click="store.translateField('data.first_mes')" :loading="store.isLoading">翻译</el-button></template><el-input v-model="first_mes" type="textarea" :rows="6" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item><template #label><span>对话示例 (Message Example)</span><el-button class="translate-btn" type="primary" text @click="store.translateField('data.mes_example')" :loading="store.isLoading">翻译</el-button></template><el-input v-model="mes_example" type="textarea" :rows="12" placeholder="在此处输入对话示例..." /></el-form-item></el-col>
          <el-col :span="24"><el-form-item><template #label><span>备选问候语 (Alternate Greetings)</span></template><div v-for="(greeting, index) in alternate_greetings" :key="index" class="greeting-item"><el-input v-model="alternate_greetings[index]" type="textarea" :rows="2" /><div class="greeting-actions"><el-button class="translate-btn" type="primary" text @click="store.translateField(`data.alternate_greetings[${index}]`)" :loading="store.isLoading">翻译</el-button><el-button type="danger" text @click="removeGreeting(index)">删除</el-button></div></div><el-button @click="addGreeting" type="primary" plain>添加问候语</el-button></el-form-item></el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { get, set } from 'lodash-es';

const store = useTranslatorStore();

const useVModel = (path, defaultValue = '') => computed({
  get: () => get(store.characterCard, path, defaultValue),
  set: (value) => store.updateCardField(path, value),
});

const name = useVModel('data.name');
const description = useVModel('data.description');
const personality = useVModel('data.personality');
const scenario = useVModel('data.scenario');
const first_mes = useVModel('data.first_mes');
const mes_example = useVModel('data.mes_example');
const alternate_greetings = useVModel('data.alternate_greetings', []);
const tags = computed({
  get: () => (get(store.characterCard, 'data.tags', []) || []).join(', '),
  set: (value) => store.updateCardField('data.tags', value.split(',').map(t => t.trim()).filter(Boolean))
});

const addGreeting = () => {
  const greetings = alternate_greetings.value || [];
  greetings.push('');
  store.updateCardField('data.alternate_greetings', greetings);
};

const removeGreeting = (index) => {
  const greetings = alternate_greetings.value || [];
  greetings.splice(index, 1);
  store.updateCardField('data.alternate_greetings', greetings);
};
</script>

<style scoped>
.box-card {
  border: none;
  box-shadow: none;
  background-color: transparent;
}
.card-header {
  font-size: 1.2em;
  font-weight: 600;
}
.translate-btn { margin-left: 10px; }
.greeting-item { display: flex; align-items: center; margin-bottom: 10px; width: 100%; }
.greeting-item .el-input { flex-grow: 1; }
.greeting-actions { display: flex; flex-direction: column; margin-left: 8px; }
</style>
