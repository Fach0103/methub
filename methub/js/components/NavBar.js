/* js/components/NavBar.js */
class NavBar extends HTMLElement {
  connectedCallback() {
    this.render();
    window.addEventListener('hashchange', () => this.updateActive());
  }

  render() {
    this.innerHTML = '';
    const inner = document.createElement('div');
    inner.className = 'navbar__inner';

    const logo = document.createElement('a');
    logo.href = '#home';
    logo.className = 'navbar__logo';
    logo.textContent = 'MetHub';

    const list = document.createElement('ul');
    list.className = 'navbar__links';
    [
      { path: 'explore', label: 'Explorar' },
      { path: 'departments', label: 'Departamentos' },
      { path: 'compare', label: 'Comparar' },
    ].forEach(({ path, label }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${path}`;
      a.dataset.path = path;
      a.textContent = label;
      li.appendChild(a);
      list.appendChild(li);
    });

    inner.append(logo, list);
    this.appendChild(inner);
    this.updateActive();
  }

  updateActive() {
    const current = (window.location.hash.slice(1) || 'home').split('/')[0];
    this.querySelectorAll('a[data-path]').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.path === current);
    });
  }
}
customElements.define('nav-bar', NavBar);