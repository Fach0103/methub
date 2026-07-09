/**
 * HomeView — V-01 Página Principal. Extiende View (sección 4.1).
 * Reskin Windows 7: estadísticas en un GroupBox (fieldset), galería de
 * destacadas como vista de íconos estilo Explorador de Windows.
 */
class HomeView extends View {
  render() {
    this.container.appendChild(this._buildHero());

    const statsFieldset = document.createElement('fieldset');
    statsFieldset.className = 'stats-groupbox';
    const legend = document.createElement('legend');
    legend.textContent = 'Estadísticas generales';
    statsFieldset.appendChild(legend);
    this.showLoading(statsFieldset, 'Calculando estadísticas…');
    this.container.appendChild(statsFieldset);
    this._loadStats(statsFieldset, legend);

    const gallerySection = document.createElement('section');
    const h2 = document.createElement('h3');
    h2.textContent = 'Obras destacadas';
    gallerySection.appendChild(h2);

    const grid = document.createElement('div');
    grid.className = 'icon-grid';
    this.showLoading(grid, 'Cargando obras destacadas…');
    gallerySection.appendChild(grid);
    this.container.appendChild(gallerySection);

    this._loadHighlights(grid);
  }

  _buildHero() {
    const hero = document.createElement('div');
    hero.className = 'group';
    const h1 = document.createElement('h1');
    h1.textContent = 'Explora la colección del Met';
    const lead = document.createElement('p');
    lead.textContent =
      'Más de 470.000 obras del Metropolitan Museum of Art, disponibles a través de su Open Access API.';
    hero.append(h1, lead);
    return hero;
  }

  async _loadStats(fieldset, legend) {
    try {
      const [departments, highlights] = await Promise.all([
        this.services.metService.getDepartments({ signal: this.signal }),
        this.services.metService.search({ isHighlight: true, hasImages: true }, { signal: this.signal }),
      ]);
      fieldset.innerHTML = '';
      fieldset.appendChild(legend);

      [
        { value: String(departments.length), label: 'Departamentos curatoriales' },
        { value: highlights.total.toLocaleString('es'), label: 'Obras destacadas con imagen' },
      ].forEach(({ value, label }) => {
        const block = document.createElement('div');
        block.className = 'stat-block';
        const val = document.createElement('span');
        val.className = 'stat-block__value';
        val.textContent = value;
        const lab = document.createElement('span');
        lab.className = 'stat-block__label';
        lab.textContent = label;
        block.append(val, lab);
        fieldset.appendChild(block);
      });
    } catch (err) {
      if (this.isCancelled(err)) return;
      fieldset.innerHTML = '';
      fieldset.appendChild(legend);
      this.showError(fieldset, 'No se pudieron cargar las estadísticas.', () => this._loadStats(fieldset, legend));
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
        grid.appendChild(
          this._buildRetryableError(grid, 'No se pudieron cargar las obras destacadas.', () => this._loadHighlights(grid))
        );
        return;
      }
      resolved.forEach((obra) => grid.appendChild(HomeView.buildIconTile(obra, this.router)));
      if (failures > 0) {
        const note = document.createElement('p');
        note.className = 'note icon-grid__note';
        note.textContent = `${failures} obra(s) no se pudieron cargar y fueron omitidas.`;
        grid.appendChild(note);
      }
    } catch (err) {
      if (this.isCancelled(err)) return;
      grid.innerHTML = '';
      grid.appendChild(
        this._buildRetryableError(grid, 'No se pudieron cargar las obras destacadas.', () => this._loadHighlights(grid))
      );
    }
  }

  _buildRetryableError(target, message, onRetry) {
    const el = document.createElement('error-state');
    el.setAttribute('message', message);
    el.setAttribute('retry', '');
    el.addEventListener('retry', onRetry, { once: true });
    return el;
  }

  /**
   * Ícono de obra reutilizable, estilo Explorador de Windows (miniatura +
   * etiqueta). Se usa en Home, Explore y Artist.
   */
  static buildIconTile(obra, router) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'icon-tile';
    tile.setAttribute('aria-label', `Ver detalle de ${obra.title || 'obra sin título'}`);

    const thumb = document.createElement('div');
    thumb.className = 'icon-tile__thumb';
    if (obra.primaryImageSmall) {
      const img = document.createElement('img');
      img.src = obra.primaryImageSmall;
      img.alt = obra.title || 'Obra sin título';
      img.loading = 'lazy';
      thumb.appendChild(img);
    } else {
      thumb.classList.add('icon-tile__thumb--placeholder');
      thumb.textContent = 'Sin imagen';
    }
    tile.appendChild(thumb);

    const label = document.createElement('span');
    label.className = 'icon-tile__label';
    label.textContent = obra.title || 'Sin título';
    tile.appendChild(label);

    const sublabel = document.createElement('span');
    sublabel.className = 'icon-tile__sublabel';
    sublabel.textContent = obra.artistDisplayName || 'Artista desconocido';
    tile.appendChild(sublabel);

    tile.addEventListener('click', () => router.navigate(`detail/${obra.objectID}`));

    return tile;
  }
}

window.HomeView = HomeView;
