<template>
  <div class="header-banner">
    <div class="hero-content">
      <div class="logo-container">
        <img src="/img/index.png" alt="Tavern Translator" class="hero-logo">
        <a href="https://github.com/nullskymc/tavernTranslator" target="_blank" class="hero-title-link">
          <h1 class="hero-title">Tavern Translator</h1>
        </a>
      </div>
      <p class="hero-subtitle">SillyTavern 角色卡翻译工具 - 轻松翻译PNG角色卡</p>
      <div class="hero-divider"></div>
    </div>
  </div>
</template>

<script setup>
// 无需特殊逻辑，只是展示组件
</script>

<style scoped>
.header-banner {
  background: var(--gradient-primary) !important;
  width: 100%;
  text-align: center;
  padding: 30px 0;
  margin-bottom: 30px;
  position: relative;
  transition: all 0.3s ease;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.hero-logo {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  margin-right: 20px;
}

.hero-title {
  color: var(--header-text);
  font-size: 3rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: 1px;
  text-decoration: none;
  transition: color 0.3s ease;
}

.hero-title-link {
  color: var(--header-text);
  text-decoration: none;
  transition: var(--transition);
  display: flex;
  align-items: center;
}

.hero-title-link:hover {
  opacity: 0.9;
}

.hero-subtitle {
  color: var(--header-text);
  font-size: 1.2rem;
  font-weight: 400;
  margin: 10px 0 0;
  opacity: 0.9;
  transition: color 0.3s ease;
}

.hero-divider {
  width: 80px;
  height: 3px;
  background-color: var(--header-divider);
  margin: 25px auto 0;
  border-radius: 2px;
  transition: background-color 0.3s ease;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .logo-container {
    flex-direction: column;
    text-align: center;
  }
  
  .hero-logo {
    margin-right: 0;
    margin-bottom: 10px;
  }
}
</style>
