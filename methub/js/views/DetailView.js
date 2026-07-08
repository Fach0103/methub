/**
 * DetailView — V-03 Detalle de Obra (#detail/:id). Sección 4.3.
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
    btn.className = 'btn btn--ghost-neutral detail-back';
    btn.textContent = '← Volver';
    btn.addEventListener('click', () => window.history.back());
    return btn;
  }

  _renderObra(obra) {
    this.container.innerHTML = '';
    this.container.appendChild(this._buildBackButton());

    const layout = document.createElement('div');
    layout.className = 'detail-layout';
    layout.appendChild(this._buildImageColumn(obra));
    layout.appendChild(this._buildInfoColumn(obra));
    this.container.appendChild(layout);
  }

  // --- Columna izquierda: imagen (4.3.2) ---
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
      thumbs.className = 'detail-thumbs';
      additional.forEach((src) => {
        const thumbBtn = document.createElement('button');
        thumbBtn.type = 'button';
        thumbBtn.className = 'detail-thumbs__item';
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Imagen adicional de la obra';
        thumbBtn.appendChild(img);
        thumbBtn.addEventListener('click', () => {
          if (mainImg) mainImg.src = src;
        });
        thumbs.appendChild(thumbBtn);
      });
      col.appendChild(thumbs);
    }

    return col;
  }

  // --- Columna derecha: ficha técnica (4.3.2) ---
  _buildInfoColumn(obra) {
    const col = document.createElement('div');
    col.className = 'detail-info-col';

    const header = document.createElement('div');
    header.className = 'detail-header';
    const title = document.createElement('h1');
    title.textContent = obra.title || 'Sin título';
    header.appendChild(title);

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
    col.appendChild(header);

    if (obra.artistDisplayBio) {
      const bio = document.createElement('p');
      bio.className = 'detail-bio';
      bio.textContent = obra.artistDisplayBio;
      col.appendChild(bio);
    }

    // Campos obligatorios: siempre visibles, con "—" si vienen vacíos (RNF-05)
    const requiredRows = [
      ['Fecha', obra.objectDate],
      ['Técnica', obra.medium],
      ['Dimensiones', obra.dimensions],
      ['Departamento', obra.department],
    ];
    // Campos opcionales: solo se muestran si la API los trae
    const optionalRows = [
      ['Cultura', obra.culture],
      ['Periodo', obra.period],
      ['Clasificación', obra.classification],
      ['Adquisición', obra.creditLine],
    ];

    const fieldsList = document.createElement('dl');
    fieldsList.className = 'detail-fields';
    requiredRows.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value || '—';
      fieldsList.append(dt, dd);
    });
    optionalRows.forEach(([label, value]) => {
      if (!value) return;
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      fieldsList.append(dt, dd);
    });
    col.appendChild(fieldsList);

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
      col.appendChild(tagsWrap);
    }

    if (obra.objectURL) {
      const link = document.createElement('a');
      link.href = obra.objectURL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'detail-external-link';
      link.textContent = 'Ver en el sitio del Met →';
      col.appendChild(link);
    }

    col.appendChild(this._buildActions(obra));

    return col;
  }

  // --- Acciones (4.3.3) ---
  _buildActions(obra) {
    const actions = document.createElement('div');
    actions.className = 'detail-actions';

    if (obra.artistDisplayName) {
      const artistBtn = document.createElement('button');
      artistBtn.type = 'button';
      artistBtn.className = 'btn btn--ghost-neutral';
      artistBtn.textContent = 'Ver más obras del artista';
      artistBtn.addEventListener('click', () => {
        this.router.navigate(`artist/${encodeURIComponent(obra.artistDisplayName)}`);
      });
      actions.appendChild(artistBtn);
    }

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = 'btn';
    compareBtn.textContent = 'Comparar';
    compareBtn.addEventListener('click', () => {
      this.router.navigate('compare', { a: obra.objectID });
    });
    actions.appendChild(compareBtn);

    return actions;
  }
}

window.DetailView = DetailView;
