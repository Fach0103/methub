/* js/components/ErrorState.js */
class ErrorState extends HTMLElement {
  connectedCallback() { this.render(); }

  render() {
    const message = this.getAttribute('message') || 'Ocurrió un error al cargar los datos.';
    const showRetry = this.hasAttribute('retry');
    this.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'state state--error';
    wrap.setAttribute('role', 'alert');
    const icon = document.createElement('div');
    icon.className = 'state__icon';
    icon.textContent = '⚠';
    const text = document.createElement('p');
    text.className = 'state__text';
    text.textContent = message;
    wrap.append(icon, text);
    if (showRetry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn--ghost';
      button.textContent = 'Reintentar';
      button.addEventListener('click', () => this.dispatchEvent(new CustomEvent('retry', { bubbles: true })));
      wrap.appendChild(button);
    }
    this.appendChild(wrap);
  }
}
customElements.define('error-state', ErrorState);