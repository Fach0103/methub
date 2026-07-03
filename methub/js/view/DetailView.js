/* js/views/DetailView.js — sección 4.3. this.params.id disponible */
class DetailView extends View {
  render(params) {
    this.container.appendChild(
      this.buildPlaceholder('Detalle de obra', `Ficha completa de la obra #${params.id} (sección 4.3).`)
    );
  }
}
window.DetailView = DetailView;