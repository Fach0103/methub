
class DepartmentsView extends View {
  static PALETTE = ['#3a6ea5', '#2c6e1f', '#a5762c', '#6a4a9e', '#a5382c', '#2c8a8a'];

  render() {
    const header = document.createElement('div');
    header.className = 'group';
    const h1 = document.createElement('h1');
    h1.textContent = 'Departamentos';
    const lead = document.createElement('p');
    lead.textContent = 'Las áreas curatoriales del museo. Elige una carpeta para explorar sus obras.';
    header.append(h1, lead);
    this.container.appendChild(header);

    this.grid = document.createElement('div');
    this.grid.className = 'icon-grid';
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
        msg.className = 'note icon-grid__note';
        msg.textContent = 'No se encontraron departamentos.';
        this.grid.appendChild(msg);
        return;
      }

      departments.forEach((dept, index) => this.grid.appendChild(this._buildFolderTile(dept, index)));
    } catch (err) {
      if (this.isCancelled(err)) return;
      this.showError(this.grid, 'No se pudieron cargar los departamentos.', () => this._loadDepartments());
    }
  }

  _buildFolderTile(dept, index) {
    const color = DepartmentsView.PALETTE[index % DepartmentsView.PALETTE.length];

    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'icon-tile';
    tile.setAttribute('aria-label', `Explorar el departamento ${dept.displayName}`);

    const thumb = document.createElement('div');
    thumb.className = 'icon-tile__thumb icon-tile__thumb--folder';
    thumb.style.background = color;
    thumb.textContent = '📁';
    tile.appendChild(thumb);

    const label = document.createElement('span');
    label.className = 'icon-tile__label';
    label.textContent = dept.displayName;
    tile.appendChild(label);

    tile.addEventListener('click', () => {
      this.router.navigate('explore', { departmentId: dept.departmentId });
    });

    return tile;
  }
}

window.DepartmentsView = DepartmentsView;
