<template>
  <AppDialog
    :open="dialogVisible"
    :title="$t('glossary.title')"
    :width="isMobile ? '95%' : '750px'"
    :close-on-backdrop="false"
    :close-on-escape="false"
    class="glossary-dialog"
    @close="dialogVisible = false"
  >
    <!-- Toolbar -->
    <div class="glossary-toolbar">
      <AppButton variant="primary" size="sm" @click="addNewEntry">
        <AppIcon name="plus" :size="14" />
        {{ $t('glossary.addEntry') }}
      </AppButton>
      <div class="toolbar-right">
        <AppButton size="sm" @click="triggerImport">
          <AppIcon name="upload" :size="14" />
          {{ $t('glossary.import') }}
        </AppButton>
        <AppButton size="sm" @click="handleExport" :disabled="entries.length === 0">
          <AppIcon name="download" :size="14" />
          {{ $t('glossary.export') }}
        </AppButton>
        <AppButton size="sm" variant="danger" plain @click="handleClear" :disabled="entries.length === 0">
          <AppIcon name="delete" :size="14" />
          {{ $t('glossary.clearAll') }}
        </AppButton>
      </div>
      <input type="file" ref="importInput" @change="handleImport" accept="application/json" style="display:none;" />
    </div>

    <!-- Info tip -->
    <div class="glossary-tip">
      <AppIcon name="info" :size="14" />
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
        <AppInput
          v-model="entry.source"
          class="col-source"
          :placeholder="$t('glossary.sourcePlaceholder')"
        />
        <AppInput
          v-model="entry.target"
          class="col-target"
          :placeholder="$t('glossary.targetPlaceholder')"
        />
        <AppSelect
          v-model="entry.category"
          class="col-category"
          :options="categoryOptions"
        />
        <AppInput
          v-model="entry.note"
          class="col-note"
          :placeholder="$t('glossary.notePlaceholder')"
        />
        <AppButton
          class="col-actions btn-icon-danger"
          variant="danger"
          plain
          size="sm"
          :aria-label="$t('glossary.delete')"
          @click="removeEntry(entry.id)"
        >
          <AppIcon name="delete" :size="14" />
        </AppButton>
      </div>
    </div>

    <!-- Empty state -->
    <div class="glossary-empty" v-else>
      <div class="glossary-empty-inner">
        <AppIcon name="notebook" :size="56" />
        <p>{{ $t('glossary.empty') }}</p>
        <AppButton variant="primary" size="sm" @click="addNewEntry">
          {{ $t('glossary.addFirstEntry') }}
        </AppButton>
      </div>
    </div>

    <!-- Entry count -->
    <div class="glossary-footer-info" v-if="entries.length > 0">
      {{ $t('glossary.entryCount', { count: entries.length }) }}
    </div>

    <template #footer>
      <div class="dialog-footer">
        <AppButton @click="dialogVisible = false">{{ $t('glossary.close') }}</AppButton>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { useConfirm } from '@/components/ui/useConfirm';
import { useToast } from '@/components/ui/useToast';
import AppDialog from './ui/AppDialog.vue';
import AppButton from './ui/AppButton.vue';
import AppInput from './ui/AppInput.vue';
import AppSelect from './ui/AppSelect.vue';
import AppIcon from './ui/AppIcon.vue';
import { useI18n } from 'vue-i18n';
import type { GlossaryEntry } from '@/types';

const { t: $t } = useI18n();
const store = useTranslatorStore();
const { confirm } = useConfirm();
const toast = useToast();

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

// 词条分类选项（与 store 的 category 取值保持一致）
const categoryOptions = computed(() => [
  { label: $t('glossary.categoryName'), value: 'name' },
  { label: $t('glossary.categoryTerm'), value: 'term' },
  { label: $t('glossary.categoryOther'), value: 'other' },
]);

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

const handleClear = async () => {
  const ok = await confirm({
    title: $t('messages.confirm.title'),
    message: $t('glossary.clearConfirm'),
    confirmText: $t('messages.confirm.confirm'),
    cancelText: $t('messages.confirm.cancel'),
    type: 'danger',
  });
  if (!ok) return;
  store.clearGlossary();
  toast.success($t('glossary.cleared'));
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
        toast.error($t('glossary.importFormatError'));
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
      toast.success($t('glossary.importSuccess', { count: added }));
    } catch {
      toast.error($t('glossary.importFormatError'));
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
  toast.success($t('glossary.exported'));
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
  background-color: var(--apple-color-gray-5);
  border-radius: 6px;
  font-size: 12px;
  color: var(--apple-text-color-secondary);
  line-height: 1.5;
}

.glossary-tip :deep(svg) {
  margin-top: 2px;
  flex-shrink: 0;
  color: var(--apple-color-gray-2);
}

.glossary-entries {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--apple-border-color-secondary);
  border-radius: 6px;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--apple-bg-color-secondary);
  border-bottom: 1px solid var(--apple-border-color-secondary);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--apple-text-color-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--apple-border-color-secondary);
  transition: background-color 0.15s;
}

.entry-row:last-child {
  border-bottom: none;
}

.entry-row:hover {
  background-color: var(--apple-bg-color-secondary);
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

/* 图标删除按钮 */
.btn-icon-danger {
  padding: 5px;
  border-radius: 50%;
}

.glossary-empty {
  padding: 20px 0;
}

.glossary-empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--apple-text-color-tertiary);
}

.glossary-empty-inner p {
  margin: 0;
  font-size: 13px;
}

.glossary-footer-info {
  margin-top: 10px;
  text-align: right;
  font-size: 12px;
  color: var(--apple-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
