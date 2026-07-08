/**
 * Router de hash con soporte de :params de ruta y query params
 * (ej. #explore?departmentId=11&page=2). Cada handler recibe (params, query)
 * donde query es un URLSearchParams.
 */
class Router {
  constructor() {
    this.routes = [];
    this.notFoundHandler = null;
    window.addEventListener('hashchange', () => this.resolve());
  }

  register(pattern, handler) {
    const paramNames = [];
    const regexBody = pattern
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    const regex = new RegExp(`^${regexBody}$`);
    this.routes.push({ regex, paramNames, handler });
    return this;
  }

  notFound(handler) {
    this.notFoundHandler = handler;
    return this;
  }

  _parseHash() {
    const raw = window.location.hash.slice(1);
    const [pathPart, queryPart] = raw.split('?');
    const path = !pathPart || pathPart === '/' ? 'home' : pathPart.replace(/^\//, '');
    return { path, query: new URLSearchParams(queryPart || '') };
  }

  resolve() {
    const { path, query } = this._parseHash();
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        route.handler(params, query);
        window.scrollTo(0, 0);
        return;
      }
    }
    if (this.notFoundHandler) this.notFoundHandler(path);
  }

  /** navigate('explore', { departmentId: 11 })  |  navigate('detail/123') */
  navigate(path, queryObj) {
    let hash = path;
    if (queryObj && Object.keys(queryObj).length > 0) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(queryObj).filter(([, v]) => v !== undefined && v !== null && v !== ''))
      ).toString();
      if (qs) hash += `?${qs}`;
    }
    window.location.hash = hash;
  }

  /** Reemplaza el query string sin crear una entrada nueva en el historial. */
  replaceQuery(path, queryObj) {
    let hash = path;
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(queryObj || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    if (qs) hash += `?${qs}`;
    history.replaceState(null, '', `#${hash}`);
    this.resolve();
  }

  start() {
    this.resolve();
  }
}

window.Router = Router;
