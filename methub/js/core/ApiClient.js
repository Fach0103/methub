/**
 * ApiClient — cliente HTTP genérico. Timeout con AbortController y
 * cancelación externa (para cuando una vista se desmonta a mitad de carga).
 */
class ApiClient {
  constructor({ baseURL, timeout = 10000 }) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  async get(path, { signal } = {}) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), this.timeout);
    const onExternalAbort = () => timeoutController.abort();
    if (signal) signal.addEventListener('abort', onExternalAbort);

    try {
      const response = await fetch(`${this.baseURL}${path}`, {
        signal: timeoutController.signal,
      });
      if (!response.ok) {
        const error = new Error(`Error HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        if (signal && signal.aborted) {
          // La vista se desmontó antes de que la petición terminara.
          // No es un error real: no hay que mostrar ErrorState por esto.
          const cancelled = new Error('Solicitud cancelada');
          cancelled.name = 'CancelledError';
          throw cancelled;
        }
        throw new Error('La solicitud tardó demasiado y fue cancelada. Intenta de nuevo.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

window.ApiClient = ApiClient;