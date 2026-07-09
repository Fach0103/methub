/**
 * DetailView — V-03 Detalle de Obra (#detail/:id). Sección 4.3.
 * Reskin Windows 7: la ficha se muestra dentro de una ventana anidada con
 * pestañas ("General" / "Etiquetas"), al estilo de un diálogo de
 * Propiedades de archivo.
 */
class DetailView extends View {
  render(params) {
    this.showLoading(this.container, 'Cargando obra…');
    this._load(params.id);
  }

  async _load(id) {
    try {
      const obra = await this.services.metService.getObject(id, { signal: this.signal });
      if (!obra || !obra.objectID) {
        this._renderNotFound();
        return;
      }
      this._renderObra(obra);
    } catch (err) {
      if (this.isCancelled(err)) return;
      if (err.status === 404) {
        this._renderNotFound();
        return;
      }
      this.showError(this.container, 'No se pudo cargar la obra.', () => this._load(id));
    }
  }

  _renderNotFound() {
    this.container.innerHTML = '';
    const wrap = document.createElement('section');
    wrap.className = 'placeholder-view';
    const h1 = document.createElement('h1');
    h1.textContent = 'Obra no encontrada';
    const p = document.createElement('p');
    p.className = 'placeholder-view__desc';
    p.textContent = 'La obra solicitada no existe.';
    wrap.append(h1, p, this._buildBackButton());
    this.container.appendChild(wrap);
  }

  _buildBackButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'detail-back';
    btn.textContent = '← Volver';
    btn.addEventListener('click', () => window.history.back());
    return btn;
  }

  _renderObra(obra) {
    this.container.innerHTML = '';
    this.container.appendChild(this._buildBackButton());
    this.container.appendChild(this._buildImageColumn(obra));
    this.container.appendChild(this._buildPropertiesWindow(obra));
  }

  // --- Imagen (4.3.2) ---
  _buildImageColumn(obra) {
    const col = document.createElement('div');
    col.className = 'detail-image-col';

    const mainWrap = document.createElement('div');
    mainWrap.className = 'detail-image-col__main';
    const primary = obra.primaryImage || obra.primaryImageSmall;

    let mainImg = null;
    if (primary) {
      mainImg = document.createElement('img');
      mainImg.src = primary;
      mainImg.alt = obra.title || 'Obra sin título';
      mainWrap.appendChild(mainImg);
    } else {
      mainWrap.classList.add('detail-image-col__main--empty');
      mainWrap.textContent = 'Sin imagen disponible';
    }
    col.appendChild(mainWrap);

    const additional = (obra.additionalImages || []).slice(0, 8);
    if (additional.length > 0) {
      const thumbs = document.createElement('div');
      thumbs.className = 'icon-grid detail-thumbs';
      additional.forEach((src) => {
        const thumbBtn = document.createElement('button');
        thumbBtn.type = 'button';
        thumbBtn.className = 'icon-tile detail-thumbs__item';
        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'icon-tile__thumb';
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Imagen adicional de la obra';
        thumbWrap.appendChild(img);
        thumbBtn.appendChild(thumbWrap);
        thumbBtn.addEventListener('click', () => {
          if (mainImg) mainImg.src = src;
        });
        thumbs.appendChild(thumbBtn);
      });
      col.appendChild(thumbs);
    }

    return col;
  }

  // --- "Ventana de propiedades" con pestañas (4.3.2 + 4.3.3) ---
  _buildPropertiesWindow(obra) {
    const win = document.createElement('div');
    win.className = 'window active detail-props-window';

    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    const titleText = document.createElement('div');
    titleText.className = 'title-bar-text';
    titleText.textContent = `Propiedades de "${obra.title || 'Sin título'}"`;
    titleBar.appendChild(titleText);
    win.appendChild(titleBar);

    const body = document.createElement('div');
    body.className = 'window-body has-space';

    const header = document.createElement('div');
    header.className = 'detail-header';
    if (obra.artistDisplayName) {
      const artistLink = document.createElement('a');
      artistLink.href = '#';
      artistLink.className = 'detail-artist-link';
      artistLink.textContent = obra.artistDisplayName;
      artistLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.router.navigate(`artist/${encodeURIComponent(obra.artistDisplayName)}`);
      });
      header.appendChild(artistLink);
    } else {
      const noArtist = document.createElement('p');
      noArtist.className = 'detail-artist-link detail-artist-link--muted';
      noArtist.textContent = 'Artista desconocido';
      header.appendChild(noArtist);
    }
    if (obra.artistDisplayBio) {
      const bio = document.createElement('p');
      bio.className = 'detail-bio';
      bio.textContent = obra.artistDisplayBio;
      header.appendChild(bio);
    }
    body.appendChild(header);

    body.appendChild(this._buildTabs(obra));
    body.appendChild(this._buildActions(obra));

    win.appendChild(body);
    return win;
  }

  _buildTabs(obra) {
    const section = document.createElement('section');
    section.className = 'tabs';

    const tablist = document.createElement('menu');
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Detalle de la obra');

    const generalBtn = document.createElement('button');
    generalBtn.setAttribute('role', 'tab');
    generalBtn.setAttribute('aria-controls', 'tab-general');
    generalBtn.setAttribute('aria-selected', 'true');
    generalBtn.textContent = 'General';

    const tagsBtn = document.createElement('button');
    tagsBtn.setAttribute('role', 'tab');
    tagsBtn.setAttribute('aria-controls', 'tab-tags');
    tagsBtn.textContent = 'Etiquetas';

    tablist.append(generalBtn, tagsBtn);
    section.appendChild(tablist);

    const generalPanel = document.createElement('article');
    generalPanel.setAttribute('role', 'tabpanel');
    generalPanel.id = 'tab-general';
    generalPanel.appendChild(this._buildFieldsTable(obra));
    if (obra.objectURL) {
      const link = document.createElement('a');
      link.href = obra.objectURL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'detail-external-link';
      link.textContent = 'Ver en el sitio del Met →';
      generalPanel.appendChild(link);
    }

    const tagsPanel = document.createElement('article');
    tagsPanel.setAttribute('role', 'tabpanel');
    tagsPanel.id = 'tab-tags';
    tagsPanel.hidden = true;
    if (obra.tags && obra.tags.length > 0) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'detail-tags';
      obra.tags.slice(0, 12).forEach((tag) => {
        if (!tag.term) return;
        const chip = document.createElement('span');
        chip.className = 'detail-tag';
        chip.textContent = tag.term;
        tagsWrap.appendChild(chip);
      });
      tagsPanel.appendChild(tagsWrap);
    } else {
      const empty = document.createElement('p');
      empty.className = 'note';
      empty.textContent = 'Esta obra no tiene etiquetas asociadas.';
      tagsPanel.appendChild(empty);
    }

    section.append(generalPanel, tagsPanel);

    const switchTab = (activeBtn, activePanel, inactiveBtn, inactivePanel) => {
      activeBtn.setAttribute('aria-selected', 'true');
      inactiveBtn.setAttribute('aria-selected', 'false');
      activePanel.hidden = false;
      inactivePanel.hidden = true;
    };
    generalBtn.addEventListener('click', () => switchTab(generalBtn, generalPanel, tagsBtn, tagsPanel));
    tagsBtn.addEventListener('click', () => switchTab(tagsBtn, tagsPanel, generalBtn, generalPanel));

    return section;
  }

  _buildFieldsTable(obra) {
    const requiredRows = [
      ['Fecha', obra.objectDate],
      ['Técnica', obra.medium],
      ['Dimensiones', obra.dimensions],
      ['Departamento', obra.department],
    ];
    const optionalRows = [
      ['Cultura', obra.culture],
      ['Periodo', obra.period],
      ['Clasificación', obra.classification],
      ['Adquisición', obra.creditLine],
    ];

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    requiredRows.forEach(([label, value]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = label;
      th.style.textAlign = 'left';
      const td = document.createElement('td');
      td.textContent = value || '—';
      tr.append(th, td);
      tbody.appendChild(tr);
    });
    optionalRows.forEach(([label, value]) => {
      if (!value) return;
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
    return table;
  }

  _buildActions(obra) {
    const actions = document.createElement('section');
    actions.className = 'detail-actions';

    if (obra.artistDisplayName) {
      const artistBtn = document.createElement('button');
      artistBtn.type = 'button';
      artistBtn.textContent = 'Ver más obras del artista';
      artistBtn.addEventListener('click', () => {
        this.router.navigate(`artist/${encodeURIComponent(obra.artistDisplayName)}`);
      });
      actions.appendChild(artistBtn);
    }

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = 'default';
    compareBtn.textContent = 'Comparar';
    compareBtn.addEventListener('click', () => {
      this.router.navigate('compare', { a: obra.objectID });
    });
    actions.appendChild(compareBtn);

    return actions;
  }
}

window.DetailView = DetailView;
