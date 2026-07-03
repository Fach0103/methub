/* js/views/CompareView.js — sección 4.6, la más compleja */
class CompareView extends View {
  render() {
    this.container.appendChild(
      this.buildPlaceholder('Comparador', 'Dos paneles con buscador interno, tabla comparativa y diffs resaltados (sección 4.6).')
    );
  }
}
window.CompareView = CompareView;