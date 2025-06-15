import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // 状态
  const currentStep = ref(0)
  const welcomeDialogVisible = ref(true)
  const isMobile = ref(false)

  // 方法
  const checkMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    isMobile.value = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent)
  }

  const closeWelcomeDialog = () => {
    welcomeDialogVisible.value = false
  }

  const nextStep = () => {
    currentStep.value++
  }

  const resetSteps = () => {
    currentStep.value = 0
  }

  const goToStep = (step) => {
    currentStep.value = step
  }

  return {
    // 状态
    currentStep,
    welcomeDialogVisible,
    isMobile,
    
    // 方法
    checkMobile,
    closeWelcomeDialog,
    nextStep,
    resetSteps,
    goToStep
  }
})
