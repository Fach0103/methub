
class ExploreView extends View {
  constructor(deps) {
    super(deps);
    this.PAGE_SIZE = 12;
    this._resetState();
    this.departments = null;
    this._initialized = false;
    this._lastDepartmentIdFromQuery = '';
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
    const incomingDept = query.get('departmentId') || '';
    const isFreshEntry = !this._initialized || incomingDept !== this._lastDepartmentIdFromQuery;
    if (isFreshEntry) {
      this._resetState();
      if (incomingDept) this.filters.departmentId = incomingDept;
      this._lastDepartmentIdFromQuery = incomingDept;
      this._initialized = true;
    }

    const layout = document.createElement('div');
    layout.className = 'explore-layout';

    this.filterFieldset = document.createElement('fieldset');
    this.filterFieldset.className = 'explore-filters';
    this.filterFieldset.appendChild(this._buildPanelSkeleton());

    this.aggregatesFieldset = document.createElement('fieldset');
    this.aggregatesFieldset.className = 'explore-aggregates';

    const gallerySection = document.createElement('section');
    const h1 = document.createElement('h1');
    h1.textContent = 'Explorar la colección';
    gallerySection.appendChild(h1);

    this.galleryGrid = document.createElement('div');
    this.galleryGrid.className = 'icon-grid';
    gallerySection.appendChild(this.galleryGrid);

    this.paginationEl = document.createElement('div');
    this.paginationEl.className = 'status-bar explore-pagination';
    gallerySection.appendChild(this.paginationEl);

    layout.append(this.filterFieldset, gallerySection, this.aggregatesFieldset);
    this.container.appendChild(layout);

    this._loadDepartmentsIntoFilter();

    if (isFreshEntry || this.objectIDs.length === 0) {
      this._runSearch();
    } else {
      this._loadPage();
    }
  }

  // --- Panel de filtros (4.2.1) ---

  _buildPanelSkeleton() {
    const wrap = document.createDocumentFragment();

    const legend = document.createElement('legend');
    legend.textContent = 'Filtros';
    wrap.appendChild(legend);

    const searchGroup = document.createElement('div');
    searchGroup.className = 'group';
    const searchLabel = document.createElement('label');
    searchLabel.htmlFor = 'explore-search-input';
    searchLabel.textContent = 'Buscar';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'search';
    this.searchInput.id = 'explore-search-input';
    this.searchInput.placeholder = 'Título, artista, tema…';
    this.searchInput.value = this.filters.q;
    searchGroup.append(searchLabel, this.searchInput);
    wrap.appendChild(searchGroup);

    let debounceId;
    this.searchInput.addEventListener('input', () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        this.filters.q = this.searchInput.value.trim();
        this._runSearch();
      }, 400);
    });

    const deptGroup = document.createElement('div');
    deptGroup.className = 'group';
    const deptLabel = document.createElement('label');
    deptLabel.htmlFor = 'explore-dept-select';
    deptLabel.textContent = 'Departamento';
    this.deptSelect = document.createElement('select');
    this.deptSelect.id = 'explore-dept-select';
    this.deptSelect.innerHTML = '<option value="">Todos</option>';
    this.deptSelect.disabled = true;
    deptGroup.append(deptLabel, this.deptSelect);
    wrap.appendChild(deptGroup);

    this.deptSelect.addEventListener('change', () => {
      this.filters.departmentId = this.deptSelect.value;
      this._runSearch();
    });

    const yearWrap = document.createElement('div');
    yearWrap.className = 'group';
    const yearLabel = document.createElement('label');
    yearLabel.textContent = 'Rango de años';
    yearWrap.appendChild(yearLabel);

    const yearDisplay = document.createElement('div');
    yearDisplay.className = 'year-range__display';
    this.yearBeginOut = document.createElement('span');
    this.yearEndOut = document.createElement('span');
    yearDisplay.append(this.yearBeginOut, document.createTextNode(' — '), this.yearEndOut);
    yearWrap.appendChild(yearDisplay);

    const currentYear = new Date().getFullYear();
    const MIN_YEAR = -3000;
    this.yearBeginRange = document.createElement('input');
    this.yearBeginRange.type = 'range';
    this.yearBeginRange.min = MIN_YEAR;
    this.yearBeginRange.max = currentYear;
    this.yearBeginRange.value = this.filters.dateBegin || MIN_YEAR;

    this.yearEndRange = document.createElement('input');
    this.yearEndRange.type = 'range';
    this.yearEndRange.min = MIN_YEAR;
    this.yearEndRange.max = currentYear;
    this.yearEndRange.value = this.filters.dateEnd || currentYear;

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'year-range__sliders';
    sliderWrap.append(this.yearBeginRange, this.yearEndRange);
    yearWrap.appendChild(sliderWrap);
    wrap.appendChild(yearWrap);

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

    const checkGroup = document.createElement('div');
    checkGroup.className = 'group';
    checkGroup.appendChild(this._buildCheckbox('Solo obras destacadas', 'isHighlight', 'explore-chk-highlight'));
    checkGroup.appendChild(this._buildCheckbox('Solo con imagen', 'hasImages', 'explore-chk-images'));
    wrap.appendChild(checkGroup);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Limpiar filtros';
    clearBtn.addEventListener('click', () => this._clearFilters());
    wrap.appendChild(clearBtn);

    return wrap;
  }

  _buildCheckbox(labelText, filterKey, id) {
    const div = document.createElement('div');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = this.filters[filterKey];
    input.addEventListener('change', () => {
      this.filters[filterKey] = input.checked;
      this._runSearch();
    });
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    div.append(input, label);
    return div;
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
    this.filterFieldset.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
    this._runSearch();
  }

  // --- Búsqueda y paginación (4.2.3) ---

  async _runSearch() {
    this.page = 1;
    this.galleryGrid.innerHTML = '';
    this.showLoading(this.galleryGrid, 'Buscando obras…');
    this._showAggregatesLoading();
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
        msg.className = 'note icon-grid__note';
        msg.textContent = 'No se encontraron obras con los filtros aplicados.';
        this.galleryGrid.appendChild(msg);
        this._renderAggregates([], 0);
        return;
      }

      await this._loadPage();
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.showError(this.galleryGrid, 'No se pudo completar la búsqueda.', () => this._runSearch());
      this.aggregatesFieldset.innerHTML = '';
    }
  }

  _showAggregatesLoading() {
    this.aggregatesFieldset.innerHTML = '';
    const legend = document.createElement('legend');
    legend.textContent = 'Agregados';
    this.aggregatesFieldset.appendChild(legend);
    this.showLoading(this.aggregatesFieldset, 'Calculando…');
  }

  async _loadPage() {
    const start = (this.page - 1) * this.PAGE_SIZE;
    const pageIds = this.objectIDs.slice(start, start + this.PAGE_SIZE);

    this.galleryGrid.innerHTML = '';
    this.showLoading(this.galleryGrid, 'Cargando obras…');
    this._showAggregatesLoading();

    try {
      const { resolved, failures } = await this.services.metService.resolveIds(pageIds, { signal: this.signal });
      this.galleryGrid.innerHTML = '';

      if (resolved.length === 0) {
        this.showError(this.galleryGrid, 'No se pudieron cargar las obras de esta página.', () => this._loadPage());
        this._renderAggregates([], this.total);
        return;
      }

      resolved.forEach((obra) => this.galleryGrid.appendChild(HomeView.buildIconTile(obra, this.router)));

      if (failures > 0) {
        const note = document.createElement('p');
        note.className = 'note icon-grid__note';
        note.textContent = `${failures} obra(s) de esta página no se pudieron cargar y fueron omitidas.`;
        this.galleryGrid.appendChild(note);
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


  _renderAggregates(resolvedObras, total) {
    this.aggregatesFieldset.innerHTML = '';
    const legend = document.createElement('legend');
    legend.textContent = 'Agregados';
    this.aggregatesFieldset.appendChild(legend);

    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'Calculados sobre los visibles. El total es del search completo.';
    this.aggregatesFieldset.appendChild(note);

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

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    rows.forEach(([label, value]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = label;
      th.style.textAlign = 'left';
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(th, td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    this.aggregatesFieldset.appendChild(table);
  }

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
