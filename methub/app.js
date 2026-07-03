/**
 * App — construye las dependencias UNA vez (ApiClient, MetService) y se
 * las inyecta a cada View. Controla el ciclo de vida: cuando cambia la
 * ruta, desmonta la vista anterior (cancela sus peticiones pendientes)
 * antes de montar la nueva.
 */
class App {
  constructor() {
    const apiClient = new ApiClient({
      baseURL: 'https://collectionapi.metmuseum.org/public/collection/v1',
      timeout: 10000,
    });
    const metService = new MetService(apiClient);

    this.container = document.getElementById('app-main');
    this.router = new Router();
    this.currentView = null;

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
  }

  _registerRoutes() {
    this.router
      .register('home', () => this._activate(this.views.home))
      .register('explore', (p) => this._activate(this.views.explore, p))
      .register('departments', () => this._activate(this.views.departments))
      .register('detail/:id', (p) => this._activate(this.views.detail, p))
      .register('artist/:name', (p) => this._activate(this.views.artist, p))
      .register('compare', (p) => this._activate(this.views.compare, p))
      .notFound((path) => this._notFound(path));
  }

  _activate(view, params = {}) {
    if (this.currentView && this.currentView !== view) {
      this.currentView.unmount();
    }
    this.currentView = view;
    view.mount(params);
  }

  _notFound(path) {
    if (this.currentView) this.currentView.unmount();
    this.container.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'placeholder-view__desc';
    p.textContent = `La ruta "#${path}" no existe. Volviendo al inicio…`;
    this.container.appendChild(p);
    setTimeout(() => this.router.navigate('home'), 1400);
  }

  start() {
    this.router.start();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});