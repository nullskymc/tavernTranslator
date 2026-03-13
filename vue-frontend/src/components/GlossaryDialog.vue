<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('glossary.title')"
    :width="isMobile ? '95%' : '750px'"
    :close-on-click-modal="false"
    append-to-body
    class="glossary-dialog"
  >
    <!-- Toolbar -->
    <div class="glossary-toolbar">
      <el-button type="primary" size="small" :icon="Plus" @click="addNewEntry">
        {{ $t('glossary.addEntry') }}
      </el-button>
      <div class="toolbar-right">
        <el-button size="small" :icon="Upload" @click="triggerImport">
          {{ $t('glossary.import') }}
        </el-button>
        <el-button size="small" :icon="Download" @click="handleExport" :disabled="entries.length === 0">
          {{ $t('glossary.export') }}
        </el-button>
        <el-button size="small" type="danger" plain :icon="Delete" @click="handleClear" :disabled="entries.length === 0">
          {{ $t('glossary.clearAll') }}
        </el-button>
      </div>
      <input type="file" ref="importInput" @change="handleImport" accept="application/json" style="display:none;" />
    </div>

    <!-- Info tip -->
    <div class="glossary-tip">
      <el-icon><InfoFilled /></el-icon>
      <span>{{ $t('glossary.tip') }}</span>
    </div>

    <!-- Entry list -->
    <div class="glossary-entries" v-if="entries.length > 0">
      <div class="entry-header">
        <span class="col-source">{{ $t('glossary.source') }}</span>
        <span class="col-target">{{ $t('glossary.target') }}</span>
        <span class="col-category">{{ $t('glossary.category') }}</span>
        <span class="col-note">{{ $t('glossary.note') }}</span>
        <span class="col-actions"></span>
      </div>
      <div
        class="entry-row"
        v-for="entry in entries"
        :key="entry.id"
      >
        <el-input
          v-model="entry.source"
          size="small"
          class="col-source"
          :placeholder="$t('glossary.sourcePlaceholder')"
          @change="handleEntryChange(entry)"
        />
        <el-input
          v-model="entry.target"
          size="small"
          class="col-target"
          :placeholder="$t('glossary.targetPlaceholder')"
          @change="handleEntryChange(entry)"
        />
        <el-select
          v-model="entry.category"
          size="small"
          class="col-category"
          @change="handleEntryChange(entry)"
        >
          <el-option :label="$t('glossary.categoryName')" value="name" />
          <el-option :label="$t('glossary.categoryTerm')" value="term" />
          <el-option :label="$t('glossary.categoryOther')" value="other" />
        </el-select>
        <el-input
          v-model="entry.note"
          size="small"
          class="col-note"
          :placeholder="$t('glossary.notePlaceholder')"
          @change="handleEntryChange(entry)"
        />
        <el-button
          class="col-actions"
          :icon="Delete"
          size="small"
          type="danger"
          plain
          circle
          @click="removeEntry(entry.id)"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div class="glossary-empty" v-else>
      <el-empty :description="$t('glossary.empty')" :image-size="80">
        <el-button type="primary" size="small" @click="addNewEntry">
          {{ $t('glossary.addFirstEntry') }}
        </el-button>
      </el-empty>
    </div>

    <!-- Entry count -->
    <div class="glossary-footer-info" v-if="entries.length > 0">
      {{ $t('glossary.entryCount', { count: entries.length }) }}
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">{{ $t('glossary.close') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Plus, Delete, Upload, Download, InfoFilled } from '@element-plus/icons-vue';
import type { GlossaryEntry } from '@/types';

const { t: $t } = useI18n();
const store = useTranslatorStore();

const props = defineProps({
  modelValue: Boolean,
});
const emit = defineEmits(['update:modelValue']);

const isMobile = ref(false);
const importInput = ref<HTMLInputElement | null>(null);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const dialogVisible = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val;
});

watch(dialogVisible, (val) => {
  emit('update:modelValue', val);
});

// Direct reference to store entries for reactivity
const entries = computed(() => store.glossaryEntries);

const addNewEntry = () => {
  store.addGlossaryEntry({
    source: '',
    target: '',
    category: 'name',
    note: '',
  });
};

const removeEntry = (id: string) => {
  store.removeGlossaryEntry(id);
};

const handleEntryChange = (entry: GlossaryEntry) => {
  store.updateGlossaryEntry(entry.id, {
    source: entry.source,
    target: entry.target,
    category: entry.category,
    note: entry.note,
  });
};

const handleClear = async () => {
  try {
    await ElMessageBox.confirm(
      $t('glossary.clearConfirm'),
      $t('messages.confirm.title'),
      {
        confirmButtonText: $t('messages.confirm.confirm'),
        cancelButtonText: $t('messages.confirm.cancel'),
        type: 'warning',
      }
    );
    store.clearGlossary();
    ElMessage.success($t('glossary.cleared'));
  } catch {
    // cancelled
  }
};

const triggerImport = () => {
  importInput.value?.click();
};

const handleImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target!.result as string);
      let entriesToImport: GlossaryEntry[] = [];

      if (Array.isArray(data)) {
        entriesToImport = data;
      } else if (data.entries && Array.isArray(data.entries)) {
        entriesToImport = data.entries;
      } else {
        ElMessage.error($t('glossary.importFormatError'));
        return;
      }

      // Validate entries
      entriesToImport = entriesToImport.filter(
        (e: any) => e.source && typeof e.source === 'string' && e.target && typeof e.target === 'string'
      ).map((e: any) => ({
        id: e.id || '',
        source: e.source,
        target: e.target,
        category: ['name', 'term', 'other'].includes(e.category) ? e.category : 'other',
        note: e.note || '',
      }));

      const added = store.importGlossary(entriesToImport);
      ElMessage.success($t('glossary.importSuccess', { count: added }));
    } catch {
      ElMessage.error($t('glossary.importFormatError'));
    }
  };
  reader.readAsText(file);

  // Reset input
  (event.target as HTMLInputElement).value = '';
};

const handleExport = () => {
  const data = store.exportGlossary();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'glossary.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  ElMessage.success($t('glossary.exported'));
};
</script>

<style scoped>
.glossary-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.glossary-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background-color: var(--el-color-info-light-9);
  border-radius: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.glossary-tip .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
  color: var(--el-color-info);
}

.glossary-entries {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--el-text-color-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  transition: background-color 0.15s;
}

.entry-row:last-child {
  border-bottom: none;
}

.entry-row:hover {
  background-color: var(--el-fill-color-lighter);
}

.col-source {
  flex: 2;
  min-width: 0;
}

.col-target {
  flex: 2;
  min-width: 0;
}

.col-category {
  flex: 1.2;
  min-width: 80px;
}

.col-note {
  flex: 1.5;
  min-width: 0;
}

.col-actions {
  flex-shrink: 0;
}

.glossary-empty {
  padding: 20px 0;
}

.glossary-footer-info {
  margin-top: 10px;
  text-align: right;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Dialog style overrides to match TranslationSettingsDialog */
:deep(.el-dialog__header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-right: 0;
}

:deep(.el-dialog__title) {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--el-text-color-primary);
}

:deep(.el-dialog__body) {
  padding: 20px 24px;
}

:deep(.el-dialog__footer) {
  padding: 12px 24px 20px;
  border-top: 1px solid var(--el-border-color-light);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .entry-header {
    display: none;
  }

  .entry-row {
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 6px;
  }

  .col-source,
  .col-target {
    flex: 1 1 calc(50% - 4px);
    min-width: calc(50% - 4px);
  }

  .col-category {
    flex: 1 1 auto;
    min-width: 100px;
  }

  .col-note {
    flex: 1 1 auto;
  }

  .col-actions {
    margin-left: auto;
  }

  .glossary-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-right {
    justify-content: flex-end;
  }
}
</style>
