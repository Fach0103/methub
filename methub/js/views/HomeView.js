/**
 * HomeView — V-01 Página Principal. Extiende View (sección 4.1).
 */
class HomeView extends View {
  render() {
    this.container.appendChild(this._buildHero());

    const statsSection = document.createElement('section');
    statsSection.className = 'stats';
    this.showLoading(statsSection, 'Calculando estadísticas…');
    this.container.appendChild(statsSection);
    this._loadStats(statsSection);

    const gallerySection = document.createElement('section');
    gallerySection.className = 'gallery-section';
    const h2 = document.createElement('h2');
    h2.textContent = 'Obras destacadas';
    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    this.showLoading(grid, 'Cargando obras destacadas…');
    gallerySection.append(h2, grid);
    this.container.appendChild(gallerySection);
    this._loadHighlights(grid);
  }

  _buildHero() {
    const hero = document.createElement('section');
    hero.className = 'hero';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'The Metropolitan Museum of Art · Open Access';
    const h1 = document.createElement('h1');
    h1.textContent = 'Explora la colección del Met';
    const lead = document.createElement('p');
    lead.className = 'hero__lead';
    lead.textContent =
      'Más de 470.000 obras, desde el Antiguo Egipto hasta el arte contemporáneo, ' +
      'disponibles para explorar libremente a través de la Open Access API del museo.';
    hero.append(eyebrow, h1, lead);
    return hero;
  }

  async _loadStats(section) {
    try {
      const [departments, highlights] = await Promise.all([
        this.services.metService.getDepartments({ signal: this.signal }),
        this.services.metService.search({ isHighlight: true, hasImages: true }, { signal: this.signal }),
      ]);
      section.innerHTML = '';
      [
        { value: String(departments.length), label: 'Departamentos curatoriales' },
        { value: highlights.total.toLocaleString('es'), label: 'Obras destacadas con imagen' },
      ].forEach(({ value, label }) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        const val = document.createElement('span');
        val.className = 'stat-card__value';
        val.textContent = value;
        const lab = document.createElement('span');
        lab.className = 'stat-card__label';
        lab.textContent = label;
        card.append(val, lab);
        section.appendChild(card);
      });
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.showError(section, 'No se pudieron cargar las estadísticas.', () => this._loadStats(section));
    }
  }

  async _loadHighlights(grid) {
    try {
      const { objectIDs } = await this.services.metService.search(
        { isHighlight: true, hasImages: true },
        { signal: this.signal }
      );
      const { resolved, failures } = await this.services.metService.resolveIds(
        objectIDs.slice(0, 10),
        { signal: this.signal }
      );
      grid.innerHTML = '';
      if (resolved.length === 0) {
        this.showError(grid, 'No se pudieron cargar las obras destacadas.', () => this._loadHighlights(grid));
        return;
      }
      resolved.forEach((obra) => grid.appendChild(HomeView.buildWorkCard(obra, this.router)));
      if (failures > 0) {
        const note = document.createElement('p');
        note.className = 'note';
        note.textContent = `${failures} obra(s) no se pudieron cargar y fueron omitidas.`;
        grid.insertAdjacentElement('afterend', note);
      }
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.showError(grid, 'No se pudieron cargar las obras destacadas.', () => this._loadHighlights(grid));
    }
  }

  /**
   * Tarjeta de obra reutilizable — static porque no depende de estado de
   * instancia. Se reutiliza en ExploreView y ArtistView.
   */
  static buildWorkCard(obra, router) {
    const card = document.createElement('article');
    card.className = 'work-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver detalle de ${obra.title || 'obra sin título'}`);

    const imgWrap = document.createElement('div');
    imgWrap.className = 'work-card__image';
    if (obra.primaryImageSmall) {
      const img = document.createElement('img');
      img.src = obra.primaryImageSmall;
      img.alt = obra.title || 'Obra sin título';
      img.loading = 'lazy';
      imgWrap.appendChild(img);
    } else {
      imgWrap.classList.add('work-card__image--placeholder');
      imgWrap.textContent = 'Sin imagen disponible';
    }

    const body = document.createElement('div');
    body.className = 'work-card__body';
    const title = document.createElement('h3');
    title.textContent = obra.title || 'Sin título';
    const artist = document.createElement('p');
    artist.className = 'work-card__artist';
    artist.textContent = obra.artistDisplayName || 'Artista desconocido';
    const meta = document.createElement('p');
    meta.className = 'work-card__meta';
    meta.textContent = [obra.objectDate, obra.department].filter(Boolean).join(' · ') || '—';
    body.append(title, artist, meta);

    card.append(imgWrap, body);

    const goToDetail = () => router.navigate(`detail/${obra.objectID}`);
    card.addEventListener('click', goToDetail);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToDetail();
      }
    });

    return card;
  }
}

window.HomeView = HomeView;
