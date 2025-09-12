// src/components/EventBus.jsx

class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Suscribirse a un evento
   * @param {string} event - Nombre del evento
   * @param {function} callback - Función a ejecutar cuando se emita el evento
   * @returns {function} - Función para desuscribirse fácilmente
   */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    // Retornar función para desuscribirse
    return () => this.off(event, callback);
  }

  /**
   * Desuscribirse de un evento
   * @param {string} event - Nombre del evento
   * @param {function} callback - Función previamente registrada
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (listener) => listener !== callback
    );
  }

  /**
   * Emitir un evento con datos opcionales
   * @param {string} event - Nombre del evento
   * @param {any} data - Datos a pasar a los listeners
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }
}

// Exportar instancia única
export default new EventBus();
