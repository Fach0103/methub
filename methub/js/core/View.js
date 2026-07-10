
class View {
  constructor({ container, services, router }) {
    this.container = container;
    this.services = services; 
    this.router = router;
    this.abortController = null;
    this.params = {};
    this.query = new URLSearchParams();
  }

  mount(params = {}, query = new URLSearchParams()) {
    this.params = params;
    this.query = query;
    this.abortController = new AbortController();
    this.container.innerHTML = '';
    this.render(params, query);
  }

  unmount() {
    if (this.abortController) this.abortController.abort();
  }


  render(_params, _query) {
    throw new Error(`${this.constructor.name} no implementó render()`);
  }

  get signal() {
    return this.abortController ? this.abortController.signal : undefined;
  }



  showLoading(target, message) {
    target.innerHTML = '';
    const el = document.createElement('loading-state');
    el.setAttribute('message', message);
    target.appendChild(el);
  }

  showError(target, message, onRetry) {
    target.innerHTML = '';
    const el = document.createElement('error-state');
    el.setAttribute('message', message);
    el.setAttribute('retry', '');
    el.addEventListener('retry', onRetry, { once: true });
    target.appendChild(el);
  }


  isCancelled(err) {
    return err && err.name === 'CancelledError';
  }

  buildPlaceholder(title, description) {
    const wrap = document.createElement('section');
    wrap.className = 'placeholder-view';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'En construcción';
    const h1 = document.createElement('h1');
    h1.textContent = title;
    const p = document.createElement('p');
    p.className = 'placeholder-view__desc';
    p.textContent = description;
    wrap.append(eyebrow, h1, p);
    return wrap;
  }
}

window.View = View;
