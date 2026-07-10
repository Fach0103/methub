
class App {
  static ROUTE_LABELS = {
    home: 'Página Principal',
    explore: 'Explorar',
    departments: 'Departamentos',
    detail: 'Detalle de Obra',
    artist: 'Obras del Artista',
    compare: 'Comparador',
  };

  constructor() {
    const apiClient = new ApiClient({
      baseURL: 'https://collectionapi.metmuseum.org/public/collection/v1',
      timeout: 10000,
    });
    const metService = new MetService(apiClient);

    this.container = document.getElementById('app-main');
    this.router = new Router();
    this.currentView = null;
    this.currentRouteKey = 'home';

    const deps = { container: this.container, services: { metService }, router: this.router };

    this.views = {
      home: new HomeView(deps),
      explore: new ExploreView(deps),
      departments: new DepartmentsView(deps),
      detail: new DetailView(deps),
      artist: new ArtistView(deps),
      compare: new CompareView(deps),
    };

    this._registerRoutes();
    this._wireWindowControls();
  }

  _registerRoutes() {
    this.router
      .register('home', (p, q) => this._activate('home', this.views.home, p, q))
      .register('explore', (p, q) => this._activate('explore', this.views.explore, p, q))
      .register('departments', (p, q) => this._activate('departments', this.views.departments, p, q))
      .register('detail/:id', (p, q) => this._activate('detail', this.views.detail, p, q))
      .register('artist/:name', (p, q) => this._activate('artist', this.views.artist, p, q))
      .register('compare', (p, q) => this._activate('compare', this.views.compare, p, q))
      .notFound((path) => this._notFound(path));
  }

  _activate(routeKey, view, params = {}, query = new URLSearchParams()) {
    if (this.currentView && this.currentView !== view) {
      this.currentView.unmount();
    }
    this.currentView = view;
    this.currentRouteKey = routeKey;
    view.mount(params, query);
    this._updateTitleBar(routeKey);
    this._restoreWindowState();
  }

  _updateTitleBar(routeKey) {
    const titleEl = document.getElementById('win7-title-text');
    if (!titleEl) return;
    const label = App.ROUTE_LABELS[routeKey] || 'MetHub';
    titleEl.textContent = `MetHub — ${label}`;
  }

 
  _wireWindowControls() {
    const win = document.getElementById('win7-window');
    const closeBtn = document.getElementById('win7-btn-close');
    const minimizeBtn = document.getElementById('win7-btn-minimize');
    const maximizeBtn = document.getElementById('win7-btn-maximize');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.router.navigate('home'));
    }
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => win.classList.toggle('is-minimized'));
    }
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => win.classList.toggle('is-maximized'));
    }
  }

  _restoreWindowState() {
    const win = document.getElementById('win7-window');
    if (win) win.classList.remove('is-minimized');
  }

  _notFound(path) {
    if (this.currentView) this.currentView.unmount();
    this.container.innerHTML = '';
    this.container.appendChild(
      this.views.home.buildPlaceholder('Página no encontrada', `La ruta "#${path}" no existe. Volviendo al inicio…`)
    );
    this._updateTitleBar('home');
    setTimeout(() => this.router.navigate('home'), 1400);
  }

  start() {
    this.router.start();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
  window.methubApp = app; 
});
