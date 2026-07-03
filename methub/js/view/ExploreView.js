/* js/views/ExploreView.js — sección 4.2: filtros + agregados + galería paginada */
class ExploreView extends View {
  render() {
    this.container.appendChild(
      this.buildPlaceholder('Explorar', 'Filtros avanzados, panel de agregados en vivo y galería paginada (sección 4.2).')
    );
  }
}
window.ExploreView = ExploreView;