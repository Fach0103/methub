
class LoadingState extends HTMLElement {
  static get observedAttributes() {
    return ['message'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const message = this.getAttribute('message') || 'Cargando…';
    this.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'state state--loading';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');

    const bar = document.createElement('div');
    bar.setAttribute('role', 'progressbar');
    bar.className = 'marquee';
    wrap.appendChild(bar);

    const text = document.createElement('p');
    text.className = 'state__text';
    text.textContent = message;
    wrap.appendChild(text);

    this.appendChild(wrap);
  }
}

customElements.define('loading-state', LoadingState);
