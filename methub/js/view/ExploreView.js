/**
 * ExploreView — V-02 Explorar (#explore). Sección 4.2.
 * Flujo: cambia un filtro -> _runSearch() (nuevo search, page=1) ->
 * _loadPage() (resuelve los 12 IDs de la página actual y recalcula agregados).
 */
class ExploreView extends View {
  constructor(deps) {
    super(deps);
    this.PAGE_SIZE = 12;
    this._resetState();
    this.departments = null; // cache: se piden una sola vez
  }

  _resetState() {
    this.filters = {
      q: '',
      departmentId: '',
      dateBegin: '',
      dateEnd: '',
      isHighlight: false,
      hasImages: false,
    };
    this.page = 1;
    this.objectIDs = [];
    this.total = 0;
  }

  render(_params, query) {
    this._resetState();
    if (query.get('departmentId')) this.filters.departmentId = query.get('departmentId');

    const layout = document.createElement('div');
    layout.className = 'explore-layout';

    this.filterPanelEl = document.createElement('aside');
    this.filterPanelEl.className = 'filter-panel';
    this.filterPanelEl.appendChild(this._buildPanelSkeleton());

    this.aggregatesEl = document.createElement('aside');
    this.aggregatesEl.className = 'aggregates-panel';

    this.gallerySection = document.createElement('section');
    this.gallerySection.className = 'gallery-section';
    const h1 = document.createElement('h1');
    h1.textContent = 'Explorar la colección';
    this.gallerySection.appendChild(h1);

    this.galleryGrid = document.createElement('div');
    this.galleryGrid.className = 'gallery-grid';
    this.gallerySection.appendChild(this.galleryGrid);

    this.paginationEl = document.createElement('div');
    this.paginationEl.className = 'pagination';
    this.gallerySection.appendChild(this.paginationEl);

    layout.append(this.filterPanelEl, this.gallerySection, this.aggregatesEl);
    this.container.appendChild(layout);

    this._loadDepartmentsIntoFilter();
    this._runSearch();
  }

  // --- Panel de filtros (4.2.1) ---

  _buildPanelSkeleton() {
    const wrap = document.createDocumentFragment();

    const h2 = document.createElement('h2');
    h2.textContent = 'Filtros';
    wrap.appendChild(h2);

    const searchLabel = document.createElement('label');
    searchLabel.className = 'field';
    searchLabel.textContent = 'Buscar';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'search';
    this.searchInput.placeholder = 'Título, artista, tema…';
    this.searchInput.value = this.filters.q;
    searchLabel.appendChild(this.searchInput);
    wrap.appendChild(searchLabel);

    let debounceId;
    this.searchInput.addEventListener('input', () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        this.filters.q = this.searchInput.value.trim();
        this._runSearch();
      }, 400);
    });

    const deptLabel = document.createElement('label');
    deptLabel.className = 'field';
    deptLabel.textContent = 'Departamento';
    this.deptSelect = document.createElement('select');
    this.deptSelect.innerHTML = '<option value="">Todos</option>';
    this.deptSelect.disabled = true;
    deptLabel.appendChild(this.deptSelect);
    wrap.appendChild(deptLabel);

    this.deptSelect.addEventListener('change', () => {
      this.filters.departmentId = this.deptSelect.value;
      this._runSearch();
    });

    const yearLabel = document.createElement('div');
    yearLabel.className = 'field';
    const yearTitle = document.createElement('span');
    yearTitle.textContent = 'Rango de años';
    yearLabel.appendChild(yearTitle);

    const yearDisplay = document.createElement('div');
    yearDisplay.className = 'year-range__display';
    this.yearBeginOut = document.createElement('span');
    this.yearEndOut = document.createElement('span');
    yearDisplay.append(this.yearBeginOut, document.createTextNode(' — '), this.yearEndOut);
    yearLabel.appendChild(yearDisplay);

    const currentYear = new Date().getFullYear();
    const MIN_YEAR = -3000;
    this.yearBeginRange = document.createElement('input');
    this.yearBeginRange.type = 'range';
    this.yearBeginRange.min = MIN_YEAR;
    this.yearBeginRange.max = currentYear;
    this.yearBeginRange.value = MIN_YEAR;

    this.yearEndRange = document.createElement('input');
    this.yearEndRange.type = 'range';
    this.yearEndRange.min = MIN_YEAR;
    this.yearEndRange.max = currentYear;
    this.yearEndRange.value = currentYear;

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'year-range__sliders';
    sliderWrap.append(this.yearBeginRange, this.yearEndRange);
    yearLabel.appendChild(sliderWrap);
    wrap.appendChild(yearLabel);

    const formatYear = (y) => (y < 0 ? `${Math.abs(y)} a. C.` : `${y}`);
    this._updateYearDisplay = () => {
      this.yearBeginOut.textContent = formatYear(Number(this.yearBeginRange.value));
      this.yearEndOut.textContent = formatYear(Number(this.yearEndRange.value));
    };
    this._updateYearDisplay();

    let yearDebounce;
    const onYearChange = () => {
      if (Number(this.yearBeginRange.value) > Number(this.yearEndRange.value)) {
        this.yearBeginRange.value = this.yearEndRange.value;
      }
      this._updateYearDisplay();
      clearTimeout(yearDebounce);
      yearDebounce = setTimeout(() => {
        this.filters.dateBegin = this.yearBeginRange.value;
        this.filters.dateEnd = this.yearEndRange.value;
        this._runSearch();
      }, 300);
    };
    this.yearBeginRange.addEventListener('input', onYearChange);
    this.yearEndRange.addEventListener('input', onYearChange);

    wrap.appendChild(this._buildCheckbox('Solo obras destacadas', 'isHighlight'));
    wrap.appendChild(this._buildCheckbox('Solo con imagen', 'hasImages'));

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn--ghost-neutral';
    clearBtn.textContent = 'Limpiar filtros';
    clearBtn.addEventListener('click', () => this._clearFilters());
    wrap.appendChild(clearBtn);

    return wrap;
  }

  _buildCheckbox(labelText, filterKey) {
    const label = document.createElement('label');
    label.className = 'field field--checkbox';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.filters[filterKey];
    input.addEventListener('change', () => {
      this.filters[filterKey] = input.checked;
      this._runSearch();
    });
    label.append(input, document.createTextNode(labelText));
    return label;
  }

  async _loadDepartmentsIntoFilter() {
    try {
      if (!this.departments) {
        this.departments = await this.services.metService.getDepartments({ signal: this.signal });
      }
      this.departments.forEach((dept) => {
        const opt = document.createElement('option');
        opt.value = dept.departmentId;
        opt.textContent = dept.displayName;
        this.deptSelect.appendChild(opt);
      });
      this.deptSelect.value = this.filters.departmentId || '';
      this.deptSelect.disabled = false;
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.deptSelect.innerHTML = '<option value="">No disponible</option>';
    }
  }

  _clearFilters() {
    this._resetState();
    this.searchInput.value = '';
    this.deptSelect.value = '';
    this.yearBeginRange.value = this.yearBeginRange.min;
    this.yearEndRange.value = this.yearEndRange.max;
    this._updateYearDisplay();
    this.filterPanelEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
    this._runSearch();
  }

  // --- Búsqueda y paginación (4.2.3) ---

  async _runSearch() {
    this.page = 1;
    this.galleryGrid.innerHTML = '';
    this.showLoading(this.galleryGrid, 'Buscando obras…');
    this.showLoading(this.aggregatesEl, 'Calculando agregados…');
    this.paginationEl.innerHTML = '';

    try {
      const params = {
        q: this.filters.q,
        departmentId: this.filters.departmentId,
        isHighlight: this.filters.isHighlight || undefined,
        hasImages: this.filters.hasImages || undefined,
        dateBegin: this.filters.dateBegin,
        dateEnd: this.filters.dateEnd,
      };
      const { total, objectIDs } = await this.services.metService.search(params, { signal: this.signal });
      this.total = total;
      this.objectIDs = objectIDs;

      if (objectIDs.length === 0) {
        this.galleryGrid.innerHTML = '';
        const msg = document.createElement('p');
        msg.className = 'note';
        msg.textContent = 'No se encontraron obras con los filtros aplicados.';
        this.galleryGrid.appendChild(msg);
        this._renderAggregates([], 0);
        return;
      }

      await this._loadPage();
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.showError(this.galleryGrid, 'No se pudo completar la búsqueda.', () => this._runSearch());
      this.aggregatesEl.innerHTML = '';
    }
  }

  async _loadPage() {
    const start = (this.page - 1) * this.PAGE_SIZE;
    const pageIds = this.objectIDs.slice(start, start + this.PAGE_SIZE);

    this.galleryGrid.innerHTML = '';
    this.showLoading(this.galleryGrid, 'Cargando obras…');
    this.showLoading(this.aggregatesEl, 'Calculando agregados…');

    try {
      const { resolved, failures } = await this.services.metService.resolveIds(pageIds, { signal: this.signal });
      this.galleryGrid.innerHTML = '';

      if (resolved.length === 0) {
        this.showError(this.galleryGrid, 'No se pudieron cargar las obras de esta página.', () => this._loadPage());
        this._renderAggregates([], this.total);
        return;
      }

      resolved.forEach((obra) => this.galleryGrid.appendChild(HomeView.buildWorkCard(obra, this.router)));

      if (failures > 0) {
        const note = document.createElement('p');
        note.className = 'note';
        note.textContent = `${failures} obra(s) de esta página no se pudieron cargar y fueron omitidas.`;
        this.galleryGrid.insertAdjacentElement('afterend', note);
      }

      this._renderAggregates(resolved, this.total);
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

  // --- Panel de agregados en vivo (4.2.2) ---

  _renderAggregates(resolvedObras, total) {
    this.aggregatesEl.innerHTML = '';
    const h2 = document.createElement('h2');
    h2.textContent = 'Agregados';
    this.aggregatesEl.appendChild(h2);

    const note = document.createElement('p');
    note.className = 'aggregates-panel__note';
    note.textContent = 'Agregados calculados sobre los visibles. Total se refiere al search completo.';
    this.aggregatesEl.appendChild(note);

    const rows =
      resolvedObras.length === 0
        ? [
            ['Total de resultados', total ? total.toLocaleString('es') : '—'],
            ['Cargados', '—'],
            ['Departamento dominante', '—'],
            ['Siglo más frecuente', '—'],
            ['Cultura más frecuente', '—'],
          ]
        : [
            ['Total de resultados', total.toLocaleString('es')],
            ['Cargados', String(resolvedObras.length)],
            ['Departamento dominante', this._mode(resolvedObras, (o) => o.department) || '—'],
            ['Siglo más frecuente', this._mode(resolvedObras, (o) => this._centuryLabel(o)) || '—'],
            ['Cultura más frecuente', this._mode(resolvedObras, (o) => o.culture) || '—'],
          ];

    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'aggregate-row';
      const l = document.createElement('span');
      l.className = 'aggregate-row__label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'aggregate-row__value';
      v.textContent = value;
      row.append(l, v);
      this.aggregatesEl.appendChild(row);
    });
  }

  /** Moda (valor más frecuente) de un arreglo, ignorando vacíos/null. */
  _mode(items, keyFn) {
    const counts = new Map();
    items.forEach((item) => {
      const key = keyFn(item);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    let best = null;
    let bestCount = 0;
    counts.forEach((count, key) => {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    });
    return best;
  }

  _centuryLabel(obra) {
    const year = obra.objectBeginDate ?? obra.objectEndDate;
    if (year === undefined || year === null || Number.isNaN(year)) return null;
    if (year === 0) return 'Siglo I';
    const isBC = year < 0;
    const absYear = Math.abs(year);
    const century = Math.ceil(absYear / 100) || 1;
    return isBC ? `Siglo ${century} a. C.` : `Siglo ${century}`;
  }
}

window.ExploreView = ExploreView;