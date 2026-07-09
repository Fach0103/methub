/**
 * CompareView — V-06 Comparador (#compare). Sección 4.6.
 * Reskin Windows 7: cada panel es una ventana independiente ("Obra A" /
 * "Obra B"), los resultados de búsqueda usan un ListBox nativo de 7.css,
 * y la tabla comparativa usa la clase `.highlighted` de 7.css para las
 * filas que difieren (coincide exactamente con lo que ya necesitábamos).
 * La lógica (debounce, token de búsqueda, restricción de duplicados) es
 * idéntica a la versión anterior.
 */
class CompareView extends View {
  render(_params, query) {
    this.panels = {
      A: this._createPanelState('A'),
      B: this._createPanelState('B'),
    };

    const layout = document.createElement('div');
    layout.className = 'compare-layout';

    const header = document.createElement('div');
    header.className = 'group';
    const h1 = document.createElement('h1');
    h1.textContent = 'Comparador de obras';
    const lead = document.createElement('p');
    lead.textContent = 'Busca dos obras para ver sus atributos lado a lado.';
    header.append(h1, lead);
    layout.appendChild(header);

    const panelsRow = document.createElement('div');
    panelsRow.className = 'compare-panels';
    panelsRow.appendChild(this._buildPanelWindow(this.panels.A));
    panelsRow.appendChild(this._buildPanelWindow(this.panels.B));
    layout.appendChild(panelsRow);

    this.tableSection = document.createElement('section');
    layout.appendChild(this.tableSection);

    this.container.appendChild(layout);

    const preselectId = query.get('a');
    if (preselectId) this._preselectFromId('A', preselectId);
  }

  _createPanelState(side) {
    return { side, obra: null, searchToken: 0, windowEl: null, bodyEl: null };
  }

  // --- Cada panel es su propia "ventana" ---

  _buildPanelWindow(panelState) {
    const win = document.createElement('div');
    win.className = 'window active compare-panel';

    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    const titleText = document.createElement('div');
    titleText.className = 'title-bar-text';
    titleText.textContent = `Obra ${panelState.side}`;
    titleBar.appendChild(titleText);

    const controls = document.createElement('div');
    controls.className = 'title-bar-controls';
    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.title = 'Quitar selección';
    closeBtn.disabled = !panelState.obra;
    closeBtn.addEventListener('click', () => {
      if (!panelState.obra) return;
      panelState.obra = null;
      this._renderPanelBody(panelState);
      this._updateComparisonTable();
    });
    controls.appendChild(closeBtn);
    titleBar.appendChild(controls);
    win.appendChild(titleBar);

    const body = document.createElement('div');
    body.className = 'window-body has-space';
    win.appendChild(body);

    panelState.windowEl = win;
    panelState.bodyEl = body;
    panelState.closeBtn = closeBtn;

    this._renderPanelBody(panelState);
    return win;
  }

  _renderPanelBody(panelState) {
    panelState.bodyEl.innerHTML = '';
    panelState.closeBtn.disabled = !panelState.obra;
    panelState.bodyEl.appendChild(
      panelState.obra ? this._buildSelectedCard(panelState) : this._buildSearchUI(panelState)
    );
  }

  _buildSelectedCard(panelState) {
    const obra = panelState.obra;
    const wrap = document.createElement('div');
    wrap.className = 'compare-selected';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'compare-selected__image';
    if (obra.primaryImageSmall) {
      const img = document.createElement('img');
      img.src = obra.primaryImageSmall;
      img.alt = obra.title || 'Obra sin título';
      imgWrap.appendChild(img);
    } else {
      imgWrap.classList.add('compare-selected__image--placeholder');
      imgWrap.textContent = 'Sin imagen disponible';
    }
    wrap.appendChild(imgWrap);

    const title = document.createElement('p');
    title.className = 'compare-selected__title';
    title.textContent = obra.title || 'Sin título';
    wrap.appendChild(title);

    const artist = document.createElement('p');
    artist.className = 'compare-selected__artist';
    artist.textContent = obra.artistDisplayName || 'Artista desconocido';
    wrap.appendChild(artist);

    return wrap;
  }

  _buildSearchUI(panelState) {
    const wrap = document.createElement('div');
    wrap.className = 'compare-search';

    const searchBox = document.createElement('div');
    searchBox.className = 'searchbox';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Busca una obra por nombre, artista, tema…';
    const searchIconBtn = document.createElement('button');
    searchIconBtn.setAttribute('aria-label', 'search');
    searchBox.append(input, searchIconBtn);
    wrap.appendChild(searchBox);

    const resultsEl = document.createElement('ul');
    resultsEl.setAttribute('role', 'listbox');
    resultsEl.className = 'has-shadow has-hover compare-results';
    wrap.appendChild(resultsEl);
    this._setListboxNote(resultsEl, 'Busca y elige una obra para comparar.');

    const triggerSearch = () => {
      const term = input.value.trim();
      if (term === '') {
        this._setListboxNote(resultsEl, 'Busca y elige una obra para comparar.');
        return;
      }
      this._runPanelSearch(panelState, term, resultsEl);
    };

    let debounceId;
    input.addEventListener('input', () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(triggerSearch, 400);
    });
    searchIconBtn.addEventListener('click', triggerSearch);

    return wrap;
  }

  _setListboxNote(resultsEl, text) {
    resultsEl.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'note';
    li.textContent = text;
    resultsEl.appendChild(li);
  }

  // --- Búsqueda interna por panel (4.6.2) ---

  async _runPanelSearch(panelState, term, resultsEl) {
    const token = ++panelState.searchToken;
    resultsEl.innerHTML = '';
    const loadingLi = document.createElement('li');
    loadingLi.appendChild((() => {
      const el = document.createElement('loading-state');
      el.setAttribute('message', 'Buscando…');
      return el;
    })());
    resultsEl.appendChild(loadingLi);

    try {
      const { objectIDs } = await this.services.metService.search(
        { q: term, hasImages: true },
        { signal: this.signal }
      );
      if (token !== panelState.searchToken) return;

      if (objectIDs.length === 0) {
        this._setListboxNote(resultsEl, 'No se encontraron obras con ese término.');
        return;
      }

      const { resolved } = await this.services.metService.resolveIds(objectIDs.slice(0, 6), {
        signal: this.signal,
      });
      if (token !== panelState.searchToken) return;

      resultsEl.innerHTML = '';
      if (resolved.length === 0) {
        this._setListboxNote(resultsEl, 'No se pudieron cargar los resultados.');
        return;
      }
      resolved.forEach((obra) => resultsEl.appendChild(this._buildResultOption(obra, panelState)));
    } catch (err) {
      if (this.isCancelled(err) || token !== panelState.searchToken) return;
      resultsEl.innerHTML = '';
      const errLi = document.createElement('li');
      this.showError(errLi, 'No se pudo completar la búsqueda.', () =>
        this._runPanelSearch(panelState, term, resultsEl)
      );
      resultsEl.appendChild(errLi);
    }
  }

  _buildResultOption(obra, panelState) {
    const otherSide = panelState.side === 'A' ? 'B' : 'A';
    const otherObra = this.panels[otherSide].obra;
    const alreadyTaken = Boolean(otherObra && otherObra.objectID === obra.objectID);

    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.className = 'compare-result-option';
    if (alreadyTaken) li.setAttribute('aria-disabled', 'true');

    const thumb = document.createElement('span');
    thumb.className = 'compare-result-option__thumb';
    if (obra.primaryImageSmall) {
      const img = document.createElement('img');
      img.src = obra.primaryImageSmall;
      img.alt = obra.title || 'Obra sin título';
      thumb.appendChild(img);
    }
    li.appendChild(thumb);

    const info = document.createElement('span');
    info.className = 'compare-result-option__info';
    const title = document.createElement('span');
    title.className = 'compare-result-option__title';
    title.textContent = obra.title || 'Sin título';
    const artist = document.createElement('span');
    artist.className = 'compare-result-option__artist';
    artist.textContent = alreadyTaken
      ? `Ya está seleccionada en el panel ${otherSide}`
      : obra.artistDisplayName || 'Artista desconocido';
    info.append(title, artist);
    li.appendChild(info);

    if (!alreadyTaken) {
      li.addEventListener('click', () => {
        panelState.obra = obra;
        this._renderPanelBody(panelState);
        this._updateComparisonTable();
      });
    }

    return li;
  }

  async _preselectFromId(side, id) {
    const panelState = this.panels[side];
    try {
      const obra = await this.services.metService.getObject(id, { signal: this.signal });
      if (obra && obra.objectID) {
        panelState.obra = obra;
        this._renderPanelBody(panelState);
        this._updateComparisonTable();
      }
    } catch (err) {
      if (this.isCancelled(err)) return;
    }
  }

  // --- Tabla comparativa (4.6.5) — usa la clase .highlighted nativa de 7.css ---

  _updateComparisonTable() {
    this.tableSection.innerHTML = '';
    const { A, B } = this.panels;
    if (!A.obra || !B.obra) return;

    const rows = [
      ['Artista', A.obra.artistDisplayName || 'Artista desconocido', B.obra.artistDisplayName || 'Artista desconocido'],
      ['Año', this._yearLabel(A.obra), this._yearLabel(B.obra)],
      ['Departamento', A.obra.department || '—', B.obra.department || '—'],
      ['Técnica', A.obra.medium || '—', B.obra.medium || '—'],
      ['Clasificación', A.obra.classification || '—', B.obra.classification || '—'],
      ['Cultura', A.obra.culture || '—', B.obra.culture || '—'],
      ['¿Destacada?', A.obra.isHighlight ? 'Sí' : 'No', B.obra.isHighlight ? 'Sí' : 'No'],
      ['¿Dominio público?', A.obra.isPublicDomain ? 'Sí' : 'No', B.obra.isPublicDomain ? 'Sí' : 'No'],
    ];

    const table = document.createElement('table');
    table.className = 'has-shadow';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Atributo', 'Obra A', 'Obra B'].forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(([label, valueA, valueB]) => {
      const tr = document.createElement('tr');
      if (valueA !== valueB) tr.classList.add('highlighted');

      const th = document.createElement('th');
      th.textContent = label;
      th.style.textAlign = 'left';
      const tdA = document.createElement('td');
      tdA.textContent = valueA;
      const tdB = document.createElement('td');
      tdB.textContent = valueB;

      tr.append(th, tdA, tdB);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    this.tableSection.appendChild(table);

    const diffYears = this._yearDifference(A.obra, B.obra);
    if (diffYears !== null) {
      const diffNote = document.createElement('p');
      diffNote.className = 'compare-year-diff';
      diffNote.textContent = `Diferencia de años entre ambas obras: ${diffYears}`;
      this.tableSection.appendChild(diffNote);
    }
  }

  _yearValue(obra) {
    const year = obra.objectEndDate ?? obra.objectBeginDate;
    return typeof year === 'number' ? year : null;
  }

  _yearLabel(obra) {
    const year = this._yearValue(obra);
    if (year === null) return '—';
    return year < 0 ? `${Math.abs(year)} a. C.` : `${year}`;
  }

  _yearDifference(obraA, obraB) {
    const yA = this._yearValue(obraA);
    const yB = this._yearValue(obraB);
    if (yA === null || yB === null) return null;
    return Math.abs(yA - yB);
  }
}

window.CompareView = CompareView;
