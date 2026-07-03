/* js/views/ArtistView.js — sección 4.5. this.params.name disponible */
class ArtistView extends View {
  render(params) {
    this.container.appendChild(
      this.buildPlaceholder(`Obras de ${params.name}`, 'Obras del artista, paginadas, con bio si la API la trae (sección 4.5).')
    );
  }
}
window.ArtistView = ArtistView;