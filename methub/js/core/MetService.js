
class MetService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  getDepartments(opts = {}) {
    return this.api.get('/departments', opts).then((data) => data.departments || []);
  }

  search(params = {}, opts = {}) {
    const query = new URLSearchParams();
    query.set('q', params.q && params.q.trim() !== '' ? params.q : '*');
    Object.entries(params).forEach(([key, value]) => {
      if (key === 'q') return;
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value);
      }
    });
    return this.api.get(`/search?${query.toString()}`, opts).then((data) => ({
      total: data.total || 0,
      objectIDs: data.objectIDs || [],
    }));
  }

  getObject(id, opts = {}) {
    return this.api.get(`/objects/${id}`, opts);
  }

  async resolveIds(ids, opts = {}) {
    const settled = await Promise.allSettled(ids.map((id) => this.getObject(id, opts)));
    const resolved = [];
    let failures = 0;
    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value && result.value.objectID) {
        resolved.push(result.value);
      } else {
        failures += 1;
      }
    });
    return { resolved, failures };
  }
}

window.MetService = MetService;
