/**
 * App — construye las dependencias UNA vez (ApiClient, MetService) y se
 * las inyecta a cada View. Controla el ciclo de vida: al cambiar de ruta,
 * desmonta la vista anterior (cancela sus peticiones pendientes) antes de
 * montar la nueva.
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
      .register('home', (p, q) => this._activate(this.views.home, p, q))
      .register('explore', (p, q) => this._activate(this.views.explore, p, q))
      .register('departments', (p, q) => this._activate(this.views.departments, p, q))
      .register('detail/:id', (p, q) => this._activate(this.views.detail, p, q))
      .register('artist/:name', (p, q) => this._activate(this.views.artist, p, q))
      .register('compare', (p, q) => this._activate(this.views.compare, p, q))
      .notFound((path) => this._notFound(path));
  }

  _activate(view, params = {}, query = new URLSearchParams()) {
    if (this.currentView && this.currentView !== view) {
      this.currentView.unmount();
    }
    this.currentView = view;
    view.mount(params, query);
  }

  _notFound(path) {
    if (this.currentView) this.currentView.unmount();
    this.container.innerHTML = '';
    this.container.appendChild(
      this.views.home.buildPlaceholder('Página no encontrada', `La ruta "#${path}" no existe. Volviendo al inicio…`)
    );
    setTimeout(() => this.router.navigate('home'), 1400);
  }

  start() {
    this.router.start();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
  window.methubApp = app; // útil para depurar desde la consola del navegador
});