/**
 * CompareView — V-06 Comparador (#compare). Sección 4.6.
 * Dos paneles independientes con buscador interno (debounce 400ms).
 * Cada panel guarda su propio "token" de búsqueda para descartar
 * respuestas obsoletas (si el usuario escribe rápido, solo cuenta la última).
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
    header.className = 'compare-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Comparador de obras';
    const lead = document.createElement('p');
    lead.textContent = 'Busca dos obras para ver sus atributos lado a lado.';
    header.append(h1, lead);
    layout.appendChild(header);

    const panelsRow = document.createElement('div');
    panelsRow.className = 'compare-panels';
    panelsRow.appendChild(this._buildPanel(this.panels.A));
    panelsRow.appendChild(this._buildPanel(this.panels.B));
    layout.appendChild(panelsRow);

    this.tableSection = document.createElement('section');
    this.tableSection.className = 'compare-table-section';
    layout.appendChild(this.tableSection);

    this.container.appendChild(layout);

    // Entrada desde #detail: ?a=objectID preselecciona el panel A (4.6.7)
    const preselectId = query.get('a');
    if (preselectId) this._preselectFromId('A', preselectId);
  }

  _createPanelState(side) {
    return { side, obra: null, searchToken: 0, rootEl: null };
  }

  // --- Construcción de cada panel ---

  _buildPanel(panelState) {
    const panel = document.createElement('div');
    panel.className = 'compare-panel';
    panelState.rootEl = panel;
    this._renderPanelContent(panelState);
    return panel;
  }

  _renderPanelContent(panelState) {
    const panel = panelState.rootEl;
    panel.innerHTML = '';

    const label = document.createElement('p');
    label.className = 'compare-panel__label';
    label.textContent = `Obra ${panelState.side}`;
    panel.appendChild(label);

    panel.appendChild(panelState.obra ? this._buildSelectedCard(panelState) : this._buildSearchUI(panelState));
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

    const title = document.createElement('h3');
    title.textContent = obra.title || 'Sin título';
    wrap.appendChild(title);

    const artist = document.createElement('p');
    artist.className = 'compare-selected__artist';
    artist.textContent = obra.artistDisplayName || 'Artista desconocido';
    wrap.appendChild(artist);

    const changeBtn = document.createElement('button');
    changeBtn.type = 'button';
    changeBtn.className = 'btn btn--ghost-neutral';
    changeBtn.textContent = 'Cambiar';
    changeBtn.addEventListener('click', () => {
      panelState.obra = null;
      this._renderPanelContent(panelState);
      this._updateComparisonTable();
    });
    wrap.appendChild(changeBtn);

    return wrap;
  }

  _buildSearchUI(panelState) {
    const wrap = document.createElement('div');
    wrap.className = 'compare-search';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Busca una obra por nombre, artista, tema…';
    wrap.appendChild(input);

    const resultsEl = document.createElement('div');
    resultsEl.className = 'compare-results';
    resultsEl.appendChild(this._buildNote('Busca y elige una obra para comparar.'));
    wrap.appendChild(resultsEl);

    let debounceId;
    input.addEventListener('input', () => {
      clearTimeout(debounceId);
      const term = input.value.trim();
      if (term === '') {
        resultsEl.innerHTML = '';
        resultsEl.appendChild(this._buildNote('Busca y elige una obra para comparar.'));
        return;
      }
      debounceId = setTimeout(() => this._runPanelSearch(panelState, term, resultsEl), 400);
    });

    return wrap;
  }

  _buildNote(text) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = text;
    return p;
  }

  // --- Búsqueda interna por panel (4.6.2) ---

  async _runPanelSearch(panelState, term, resultsEl) {
    const token = ++panelState.searchToken; // invalida cualquier búsqueda anterior de este panel
    resultsEl.innerHTML = '';
    this.showLoading(resultsEl, 'Buscando…');

    try {
      const { objectIDs } = await this.services.metService.search(
        { q: term, hasImages: true },
        { signal: this.signal }
      );
      if (token !== panelState.searchToken) return; // respuesta obsoleta: se descarta

      if (objectIDs.length === 0) {
        resultsEl.innerHTML = '';
        resultsEl.appendChild(this._buildNote('No se encontraron obras con ese término.'));
        return;
      }

      const { resolved } = await this.services.metService.resolveIds(objectIDs.slice(0, 6), {
        signal: this.signal,
      });
      if (token !== panelState.searchToken) return;

      resultsEl.innerHTML = '';
      if (resolved.length === 0) {
        resultsEl.appendChild(this._buildNote('No se pudieron cargar los resultados.'));
        return;
      }
      resolved.forEach((obra) => resultsEl.appendChild(this._buildMiniCard(obra, panelState)));
    } catch (err) {
      if (this.isCancelled(err) || token !== panelState.searchToken) return;
      resultsEl.innerHTML = '';
      this.showError(resultsEl, 'No se pudo completar la búsqueda.', () =>
        this._runPanelSearch(panelState, term, resultsEl)
      );
    }
  }

  _buildMiniCard(obra, panelState) {
    const otherSide = panelState.side === 'A' ? 'B' : 'A';
    const otherObra = this.panels[otherSide].obra;
    const alreadyTaken = Boolean(otherObra && otherObra.objectID === obra.objectID);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'compare-minicard';
    card.disabled = alreadyTaken;

    const imgWrap = document.createElement('div');
    imgWrap.className = 'compare-minicard__image';
    if (obra.primaryImageSmall) {
      const img = document.createElement('img');
      img.src = obra.primaryImageSmall;
      img.alt = obra.title || 'Obra sin título';
      imgWrap.appendChild(img);
    }
    card.appendChild(imgWrap);

    const info = document.createElement('div');
    info.className = 'compare-minicard__info';
    const title = document.createElement('span');
    title.className = 'compare-minicard__title';
    title.textContent = obra.title || 'Sin título';
    const artist = document.createElement('span');
    artist.className = 'compare-minicard__artist';
    artist.textContent = alreadyTaken
      ? `Ya está seleccionada en el panel ${otherSide}`
      : obra.artistDisplayName || 'Artista desconocido';
    info.append(title, artist);
    card.appendChild(info);

    if (!alreadyTaken) {
      card.addEventListener('click', () => {
        panelState.obra = obra;
        this._renderPanelContent(panelState);
        this._updateComparisonTable();
      });
    }

    return card;
  }

  async _preselectFromId(side, id) {
    const panelState = this.panels[side];
    try {
      const obra = await this.services.metService.getObject(id, { signal: this.signal });
      if (obra && obra.objectID) {
        panelState.obra = obra;
        this._renderPanelContent(panelState);
        this._updateComparisonTable();
      }
    } catch (err) {
      if (this.isCancelled(err)) return;
      // Falla silenciosa: el panel simplemente queda en su buscador inicial.
    }
  }

  // --- Tabla comparativa (4.6.5) ---

  _updateComparisonTable() {
    this.tableSection.innerHTML = '';
    const { A, B } = this.panels;
    if (!A.obra || !B.obra) return; // solo se muestra con dos obras seleccionadas (4.6.6)

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
    table.className = 'compare-table';

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
      if (valueA !== valueB) tr.classList.add('compare-table__row--diff');

      const th = document.createElement('th');
      th.textContent = label;
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