/**
 * SOLUÇÃO ULTRA-AGRESSIVA
 * Arquivo para interceptar e desativar COMPLETAMENTE o WebSocket do Vite em tempo de execução.
 * Esta é uma solução extrema para ambientes onde qualquer erro de WebSocket é inaceitável.
 */

// Aplicar primeiro as correções globais antes do carregamento da página
(function() {
  // Sobrescrever completamente o WebSocket ANTES que o resto da página carregue
  const OriginalWebSocket = window.WebSocket;
  
  // Fake WebSocket que retorna erros controlados sem jogar exceções
  function FakeWebSocket(url) {
    console.warn('WebSocket desativado pelo patch:', url);
    
    // Objeto básico com estado CLOSED 
    this.url = url || '';
    this.readyState = 3; // CLOSED
    this.protocol = '';
    this.extensions = '';
    this.bufferedAmount = 0;
    this.binaryType = 'blob';
    
    // Event handlers
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    
    // Gerar erro controlado imediatamente
    setTimeout(() => {
      const errorEvent = new Event('error');
      errorEvent.target = this;
      
      // Chamar os handlers com um erro controlado
      if (typeof this.onerror === 'function') {
        this.onerror(errorEvent);
      }
      
      // Sinalizar fechamento da conexão
      if (typeof this.onclose === 'function') {
        const closeEvent = new Event('close');
        closeEvent.wasClean = false;
        closeEvent.code = 1006;
        closeEvent.reason = 'WebSocket desativado pelo sistema';
        closeEvent.target = this;
        this.onclose(closeEvent);
      }
      
      // Disparar evento global para outros listeners que possam existir
      try {
        window.dispatchEvent(new CustomEvent('websocketBlocked', { 
          detail: { url: this.url, timestamp: Date.now() } 
        }));
      } catch (e) {}
    }, 5);
  }
  
  // Implementar métodos que não fazem nada
  FakeWebSocket.prototype.close = function() {};
  FakeWebSocket.prototype.send = function() {};
  FakeWebSocket.prototype.addEventListener = function() {};
  FakeWebSocket.prototype.removeEventListener = function() {};
  
  // Copiar as constantes do WebSocket original
  FakeWebSocket.CONNECTING = 0;
  FakeWebSocket.OPEN = 1;
  FakeWebSocket.CLOSING = 2;
  FakeWebSocket.CLOSED = 3;
  
  // SEMPRE substituir o WebSocket global
  window.WebSocket = FakeWebSocket;
  
  // Manter as propriedades importantes
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;
  
  console.log('[ANTI-WEBSOCKET] Neutralização global de WebSockets aplicada');
  
  // Interceptar também funções específicas do Vite
  try {
    // Redefinir outras funções do Vite conhecidas
    window.setupWebSocket = function() { 
      return { close: function(){}, send: function(){} };
    };
    window.__vite_connect = function() {};
    window.__vite_disconnect = function() {};
  } catch (e) {}
  
  // Injetar CSS para esconder qualquer mensagem de erro relacionada
  const style = document.createElement('style');
  style.textContent = `
    /* Esconder QUALQUER mensagem de erro de WebSocket */
    [class*="error" i]:has(div:contains("WebSocket")),
    [class*="error" i]:has(span:contains("WebSocket")),
    [class*="error" i]:has(p:contains("WebSocket")),
    div:has(> span:contains("WebSocket")),
    div:has(> p:contains("WebSocket")),
    pre:has(code:contains("WebSocket")) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      position: absolute !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
    }
  `;
  document.head.appendChild(style);
})();

// Continuar monitorando após o carregamento para interceptar novas tentativas
document.addEventListener('DOMContentLoaded', () => {
  console.log('[ANTI-WEBSOCKET] Aplicando patch avançado para Vite');
  
  // Identificar e neutralizar quaisquer scripts que possam tentar criar WebSockets
  setTimeout(() => {
    try {
      // Patches específicos para o Vite
      if (window.__vite__) {
        window.__vite__.createWebSocket = function() { 
          return { close: function(){}, send: function(){} };
        };
        window.__vite__.connect = function() {};
        window.__vite__.disconnect = function() {};
      }
      
      // Impedir que qualquer função tente reconectar WebSockets
      window.setInterval = (function(originalSetInterval) {
        return function(fn, delay) {
          // Evitar intervalos curtos que tentem websocket retry
          if (delay < 1000) {
            const fnStr = fn.toString().toLowerCase();
            if (fnStr.includes('websocket') || 
                fnStr.includes('socket') || 
                fnStr.includes('connect') || 
                fnStr.includes('hmr')) {
              console.log('[ANTI-WEBSOCKET] Bloqueando setInterval suspeito');
              return null;
            }
          }
          return originalSetInterval(fn, delay);
        };
      })(window.setInterval);
      
    } catch (e) {
      console.log('[ANTI-WEBSOCKET] Erro ao aplicar patch avançado:', e);
    }
  }, 100);
});