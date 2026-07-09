/**
 * ArtistView — V-05 Obras del Artista (#artist/:name). Sección 4.5.
 * Reutiliza la vista de íconos (HomeView.buildIconTile) y el patrón de
 * paginación en status-bar de ExploreView.
 */
class ArtistView extends View {
  constructor(deps) {
    super(deps);
    this.PAGE_SIZE = 12;
  }

  render(params) {
    this.artistName = params.name;
    this.page = 1;
    this.objectIDs = [];
    this.total = 0;
    this.bio = null;

    this.container.appendChild(this._buildBackButton());

    const header = document.createElement('div');
    header.className = 'group artist-header';
    this.headerTitle = document.createElement('h1');
    this.headerTitle.textContent = this.artistName;
    this.headerBio = document.createElement('p');
    this.headerBio.className = 'artist-header__bio';
    this.headerCount = document.createElement('p');
    this.headerCount.className = 'note';
    header.append(this.headerTitle, this.headerBio, this.headerCount);
    this.container.appendChild(header);

    this.galleryGrid = document.createElement('div');
    this.galleryGrid.className = 'icon-grid';
    this.showLoading(this.galleryGrid, 'Buscando obras del artista…');
    this.container.appendChild(this.galleryGrid);

    this.paginationEl = document.createElement('div');
    this.paginationEl.className = 'status-bar explore-pagination';
    this.container.appendChild(this.paginationEl);

    this._runSearch();
  }

  _buildBackButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'detail-back';
    btn.textContent = '← Volver';
    btn.addEventListener('click', () => window.history.back());
    return btn;
  }

  async _runSearch() {
    try {
      const { total, objectIDs } = await this.services.metService.search(
        { q: this.artistName, artistOrCulture: true },
        { signal: this.signal }
      );
      this.total = total;
      this.objectIDs = objectIDs;
      this.headerCount.textContent = `${total.toLocaleString('es')} obra(s) encontradas en la colección`;

      if (objectIDs.length === 0) {
        this.galleryGrid.innerHTML = '';
        const msg = document.createElement('p');
        msg.className = 'note icon-grid__note';
        msg.textContent = 'No se encontraron obras asociadas a este artista.';
        this.galleryGrid.appendChild(msg);
        return;
      }

      await this._loadPage();
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.showError(this.galleryGrid, 'No se pudo completar la búsqueda.', () => this._runSearch());
    }
  }

  async _loadPage() {
    const start = (this.page - 1) * this.PAGE_SIZE;
    const pageIds = this.objectIDs.slice(start, start + this.PAGE_SIZE);

    this.galleryGrid.innerHTML = '';
    this.showLoading(this.galleryGrid, 'Cargando obras…');

    try {
      const { resolved, failures } = await this.services.metService.resolveIds(pageIds, { signal: this.signal });
      this.galleryGrid.innerHTML = '';

      if (resolved.length === 0) {
        this.showError(this.galleryGrid, 'No se pudieron cargar las obras de esta página.', () => this._loadPage());
        return;
      }

      resolved.forEach((obra) => this.galleryGrid.appendChild(HomeView.buildIconTile(obra, this.router)));

      if (!this.bio) {
        const withBio = resolved.find((o) => o.artistDisplayBio);
        if (withBio) {
          this.bio = withBio.artistDisplayBio;
          this.headerBio.textContent = this.bio;
        }
      }

      if (failures > 0) {
        const note = document.createElement('p');
        note.className = 'note icon-grid__note';
        note.textContent = `${failures} obra(s) de esta página no se pudieron cargar y fueron omitidas.`;
        this.galleryGrid.appendChild(note);
      }

      this._renderPagination();
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.showError(this.galleryGrid, 'No se pudieron cargar las obras de esta página.', () => this._loadPage());
    }
  }

  _renderPagination() {
    this.paginationEl.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(this.objectIDs.length / this.PAGE_SIZE));

    const prevField = document.createElement('div');
    prevField.className = 'status-bar-field';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.textContent = '← Anterior';
    prevBtn.disabled = this.page <= 1;
    prevBtn.addEventListener('click', () => {
      this.page -= 1;
      this._loadPage();
    });
    prevField.appendChild(prevBtn);

    const infoField = document.createElement('p');
    infoField.className = 'status-bar-field';
    infoField.textContent = `Página ${this.page} de ${totalPages}`;

    const nextField = document.createElement('div');
    nextField.className = 'status-bar-field';
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = 'Siguiente →';
    nextBtn.disabled = this.page >= totalPages;
    nextBtn.addEventListener('click', () => {
      this.page += 1;
      this._loadPage();
    });
    nextField.appendChild(nextBtn);

    this.paginationEl.append(prevField, infoField, nextField);
  }
}

window.ArtistView = ArtistView;
