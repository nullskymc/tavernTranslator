<template>
  <div class="footer fade-in">
    <p>© 2023 Tavern Translator - 
      <a href="https://github.com/nullskymc/tavernTranslator" target="_blank" class="github-link">
        <i class="fab fa-github"></i> GitHub
      </a>
    </p>
  </div>
</template>

<script setup>
// 无需特殊逻辑，只是展示组件
</script>

<style scoped>
.footer {
  text-align: center;
  padding: 40px 20px 20px;
  color: var(--text-secondary);
  font-size: 14px;
  border-top: 1px solid var(--border-color);
  margin-top: 40px;
}

.footer p {
  margin: 0;
}

.github-link {
  color: var(--primary-color);
  text-decoration: none;
  transition: all 0.3s ease;
}

.github-link:hover {
  color: var(--primary-color-hover);
  text-decoration: underline;
}

.github-link i {
  margin-right: 4px;
}
</style>
