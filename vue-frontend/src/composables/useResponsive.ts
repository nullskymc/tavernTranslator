import { ref, onMounted, onUnmounted } from 'vue';

// Simple responsive composable: expose isMobile based on window width
export function useResponsive(breakpoint = 768) {
  const isMobile = ref(false);

  const check = () => {
    isMobile.value = typeof window !== 'undefined' && window.innerWidth <= breakpoint;
  };

  const onResize = () => check();

  onMounted(() => {
    check();
    window.addEventListener('resize', onResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', onResize);
  });

  return { isMobile };
}
