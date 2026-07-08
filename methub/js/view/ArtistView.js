/**
 * ArtistView — V-05 Obras del Artista (#artist/:name). Sección 4.5.
 * Reutiliza el patrón de búsqueda + paginación + resolveIds de ExploreView,
 * y HomeView.buildWorkCard() para las tarjetas.
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
    header.className = 'artist-header';

    this.headerTitle = document.createElement('h1');
    this.headerTitle.textContent = this.artistName;
    header.appendChild(this.headerTitle);

    this.headerBio = document.createElement('p');
    this.headerBio.className = 'artist-header__bio';
    header.appendChild(this.headerBio);

    this.headerCount = document.createElement('p');
    this.headerCount.className = 'artist-header__count';
    header.appendChild(this.headerCount);

    this.container.appendChild(header);

    this.gallerySection = document.createElement('section');
    this.gallerySection.className = 'gallery-section';

    this.galleryGrid = document.createElement('div');
    this.galleryGrid.className = 'gallery-grid';
    this.showLoading(this.galleryGrid, 'Buscando obras del artista…');
    this.gallerySection.appendChild(this.galleryGrid);

    this.paginationEl = document.createElement('div');
    this.paginationEl.className = 'pagination';
    this.gallerySection.appendChild(this.paginationEl);

    this.container.appendChild(this.gallerySection);

    this._runSearch();
  }

  _buildBackButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost-neutral detail-back';
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
        msg.className = 'note';
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

      resolved.forEach((obra) => this.galleryGrid.appendChild(HomeView.buildWorkCard(obra, this.router)));

      // La API no trae bio en /search; la tomamos de la primera obra resuelta que la tenga.
      if (!this.bio) {
        const withBio = resolved.find((o) => o.artistDisplayBio);
        if (withBio) {
          this.bio = withBio.artistDisplayBio;
          this.headerBio.textContent = this.bio;
        }
      }

      if (failures > 0) {
        const note = document.createElement('p');
        note.className = 'note';
        note.textContent = `${failures} obra(s) de esta página no se pudieron cargar y fueron omitidas.`;
        this.galleryGrid.insertAdjacentElement('afterend', note);
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

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn btn--ghost-neutral';
    prevBtn.textContent = '← Anterior';
    prevBtn.disabled = this.page <= 1;
    prevBtn.addEventListener('click', () => {
      this.page -= 1;
      this._loadPage();
    });

    const info = document.createElement('span');
    info.className = 'pagination__info';
    info.textContent = `Página ${this.page} de ${totalPages}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn--ghost-neutral';
    nextBtn.textContent = 'Siguiente →';
    nextBtn.disabled = this.page >= totalPages;
    nextBtn.addEventListener('click', () => {
      this.page += 1;
      this._loadPage();
    });

    this.paginationEl.append(prevBtn, info, nextBtn);
  }
}

window.ArtistView = ArtistView;