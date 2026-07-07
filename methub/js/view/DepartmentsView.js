
/**
 * DepartmentsView — V-04 Departamentos (#departments). Sección 4.4.
 * Cada tarjeta navega a #explore con el departamento preaplicado, usando
 * el query param que ExploreView ya sabe leer al montar: ?departmentId=X.
 */
class DepartmentsView extends View {
  // Paleta decorativa fija (tokens del proyecto) — se asigna por índice,
  // así el color de cada departamento es siempre el mismo entre recargas.
  static PALETTE = ['#33413A', '#6B5220', '#5B4636', '#3F4A55', '#5E4B3C'];

  render() {
    const header = document.createElement('div');
    header.className = 'departments-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Departamentos';
    const lead = document.createElement('p');
    lead.textContent = 'Las áreas curatoriales del museo. Elige una para explorar sus obras.';
    header.append(h1, lead);
    this.container.appendChild(header);

    this.grid = document.createElement('div');
    this.grid.className = 'departments-grid';
    this.showLoading(this.grid, 'Cargando departamentos…');
    this.container.appendChild(this.grid);

    this._loadDepartments();
  }

  async _loadDepartments() {
    try {
      const departments = await this.services.metService.getDepartments({ signal: this.signal });
      this.grid.innerHTML = '';

      if (departments.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'note';
        msg.textContent = 'No se encontraron departamentos.';
        this.grid.appendChild(msg);
        return;
      }

      departments.forEach((dept, index) => this.grid.appendChild(this._buildCard(dept, index)));
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.showError(this.grid, 'No se pudieron cargar los departamentos.', () => this._loadDepartments());
    }
  }

  _buildCard(dept, index) {
    const color = DepartmentsView.PALETTE[index % DepartmentsView.PALETTE.length];
    const monogram = this._monogram(dept.displayName);

    const card = document.createElement('article');
    card.className = 'dept-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Explorar el departamento ${dept.displayName}`);

    const badge = document.createElement('div');
    badge.className = 'dept-card__badge';
    badge.style.background = color;
    badge.textContent = monogram;

    const name = document.createElement('h3');
    name.className = 'dept-card__name';
    name.textContent = dept.displayName;

    const hint = document.createElement('span');
    hint.className = 'dept-card__hint';
    hint.textContent = 'Explorar →';

    card.append(badge, name, hint);

    const goToExplore = () => this.router.navigate('explore', { departmentId: dept.departmentId });
    card.addEventListener('click', goToExplore);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToExplore();
      }
    });

    return card;
  }

  /** Iniciales del nombre del departamento para el "sello" decorativo. */
  _monogram(name) {
    const words = name.replace(/[()]/g, '').split(/\s+/).filter(Boolean);
    const letters = words.slice(0, 2).map((w) => w[0].toUpperCase());
    return letters.join('') || '?';
  }
}

window.DepartmentsView = DepartmentsView;