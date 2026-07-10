
class NavBar extends HTMLElement {
  connectedCallback() {
    this.render();
    window.addEventListener('hashchange', () => this.updateActive());
  }

  render() {
    this.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'taskbar';

    const startBtn = document.createElement('a');
    startBtn.href = '#home';
    startBtn.className = 'taskbar__start';
    startBtn.title = 'Ir a la página principal';
    const orb = document.createElement('span');
    orb.className = 'taskbar__orb';
    orb.textContent = 'M';
    startBtn.appendChild(orb);
    const startLabel = document.createElement('span');
    startLabel.className = 'taskbar__start-label';
    startLabel.textContent = 'MetHub';
    startBtn.appendChild(startLabel);
    bar.appendChild(startBtn);

    const divider = document.createElement('span');
    divider.className = 'taskbar__divider';
    bar.appendChild(divider);

    const pinned = document.createElement('div');
    pinned.className = 'taskbar__pinned';
    [
      { path: 'explore', label: 'Explorar' },
      { path: 'departments', label: 'Departamentos' },
      { path: 'compare', label: 'Comparar' },
    ].forEach(({ path, label }) => {
      const btn = document.createElement('a');
      btn.href = `#${path}`;
      btn.className = 'taskbar__button';
      btn.dataset.path = path;
      btn.textContent = label;
      pinned.appendChild(btn);
    });
    bar.appendChild(pinned);

    this.appendChild(bar);
    this.updateActive();
  }

  updateActive() {
    const current = (window.location.hash.slice(1) || 'home').split('/')[0].split('?')[0];
    this.querySelectorAll('.taskbar__button[data-path]').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.path === current);
    });
  }
}

customElements.define('nav-bar', NavBar);
