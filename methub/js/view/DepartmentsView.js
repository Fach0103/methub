/* js/views/DepartmentsView.js — sección 4.4 */
class DepartmentsView extends View {
  render() {
    this.container.appendChild(
      this.buildPlaceholder('Departamentos', 'Los 19 departamentos como tarjetas; cada una navega a #explore filtrado (sección 4.4).')
    );
  }
}
window.DepartmentsView = DepartmentsView;