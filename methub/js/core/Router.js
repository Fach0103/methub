/**
 * Router de hash. register() acepta patrones con ':param'.
 * Los botones Atrás/Adelante del navegador funcionan solos (hashchange).
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

  currentPath() {
    const hash = window.location.hash.slice(1);
    return hash === '' ? 'home' : hash.replace(/^\//, '');
  }

  resolve() {
    const path = this.currentPath();
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        route.handler(params);
        window.scrollTo(0, 0);
        return;
      }
    }
    if (this.notFoundHandler) this.notFoundHandler(path);
  }

  navigate(path) {
    window.location.hash = path;
  }

  start() {
    this.resolve();
  }
}

window.Router = Router;