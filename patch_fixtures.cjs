const fs = require('fs');
let content = fs.readFileSync('src/admin/api/adminDevFixtures.ts', 'utf8');

const newStates = `
let sessionPackages = [
  {
    id: 1,
    uuid: "11111111-2222-3333-4444-555555555555",
    name: "Standart Paket",
    session_count: 12,
    validity_days: 30,
    status: "active",
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
  },
  {
    id: 2,
    uuid: "22222222-3333-4444-5555-666666666666",
    name: "Deneme Paketi",
    session_count: 3,
    validity_days: null,
    status: "inactive",
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
  }
];

let memberSessionPackages = [
  {
    id: 1,
    uuid: "abcdef12-3456-7890-abcd-ef1234567890",
    member_id: 1,
    session_package_id: 1,
    package_name: "Standart Paket",
    total_sessions: 12,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    stored_status: "active",
    effective_status: "active",
    remaining_sessions: 12,
    reserved_sessions: 0,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    cancelled_at: null,
    cancellation_reason: null
  }
];

let packageLedgers = [];
`;

content = content.replace(
    /export async function handleAdminFallback/,
    newStates + '\nexport async function handleAdminFallback'
);

const newEndpoints = `
  if (path === '/api/admin/session-packages') {
    if (method === 'GET') {
      let q = queryParams.get('q') || '';
      let status = queryParams.get('status') || 'all';
      let page = parseInt(queryParams.get('page') || '1', 10);
      let perPage = parseInt(queryParams.get('per_page') || '20', 10);

      let filtered = sessionPackages.filter(p => {
        if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
        if (status !== 'all' && p.status !== status) return false;
        return true;
      });

      const total_items = filtered.length;
      const total_pages = Math.ceil(total_items / perPage) || 1;
      const items = filtered.slice((page - 1) * perPage, page * perPage);

      return mockResponse({
        items,
        pagination: { current_page: page, per_page: perPage, total_items, total_pages }
      });
    }

    if (method === 'POST') {
      const payload = JSON.parse(options.body || '{}');
      const newPkg = {
        id: sessionPackages.length > 0 ? Math.max(...sessionPackages.map(p => p.id)) + 1 : 1,
        uuid: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
        name: payload.name,
        session_count: payload.session_count,
        validity_days: payload.validity_days,
        status: payload.status || 'active',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      sessionPackages.push(newPkg);
      return mockResponse(newPkg, 201);
    }
  }

  const spMatch = path.match(/^\\/api\\/admin\\/session-packages\\/(\\d+)$/);
  if (spMatch) {
    const id = parseInt(spMatch[1], 10);
    const pkgIndex = sessionPackages.findIndex(p => p.id === id);
    
    if (pkgIndex === -1) {
      return mockError('Not found', 404);
    }

    if (method === 'PATCH') {
      const payload = JSON.parse(options.body || '{}');
      sessionPackages[pkgIndex] = {
        ...sessionPackages[pkgIndex],
        ...payload,
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      return mockResponse(sessionPackages[pkgIndex]);
    }
  }

  const mspMatch = path.match(/^\\/api\\/admin\\/members\\/(\\d+)\\/session-packages$/);
  if (mspMatch) {
    const memberId = parseInt(mspMatch[1], 10);
    
    if (method === 'GET') {
      const items = memberSessionPackages.filter(p => p.member_id === memberId).map(p => {
        let effStatus = p.stored_status;
        if (effStatus === 'active') {
          if (p.remaining_sessions <= 0) {
            effStatus = 'exhausted';
          } else if (p.valid_until && new Date(p.valid_until) < new Date()) {
            effStatus = 'expired';
          }
        }
        return { ...p, effective_status: effStatus };
      });
      return mockResponse(items);
    }

    if (method === 'POST') {
      const payload = JSON.parse(options.body || '{}');
      const sp = sessionPackages.find(p => p.id === payload.session_package_id);
      if (!sp || sp.status !== 'active') return mockError('Invalid or inactive package', 422);

      let valid_until = null;
      if (sp.validity_days) {
        const fromDate = new Date(payload.valid_from);
        fromDate.setDate(fromDate.getDate() + sp.validity_days - 1);
        valid_until = fromDate.toISOString().split('T')[0];
      }

      const newMsp = {
        id: memberSessionPackages.length > 0 ? Math.max(...memberSessionPackages.map(p => p.id)) + 1 : 1,
        uuid: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
        member_id: memberId,
        session_package_id: sp.id,
        package_name: sp.name,
        total_sessions: sp.session_count,
        valid_from: payload.valid_from,
        valid_until,
        stored_status: 'active',
        effective_status: 'active',
        remaining_sessions: sp.session_count,
        reserved_sessions: 0,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        cancelled_at: null,
        cancellation_reason: null
      };

      memberSessionPackages.push(newMsp);
      return mockResponse(newMsp, 201);
    }
  }

  const mspCancelMatch = path.match(/^\\/api\\/admin\\/member-session-packages\\/(\\d+)\\/cancel$/);
  if (mspCancelMatch && method === 'POST') {
    const id = parseInt(mspCancelMatch[1], 10);
    const mspIndex = memberSessionPackages.findIndex(p => p.id === id);
    if (mspIndex === -1) return mockError('Not found', 404);
    if (memberSessionPackages[mspIndex].stored_status === 'cancelled') return mockError('Already cancelled', 409, 'CONFLICT');

    const payload = JSON.parse(options.body || '{}');
    if (!payload.reason) return mockError('Reason required', 422);

    memberSessionPackages[mspIndex].stored_status = 'cancelled';
    memberSessionPackages[mspIndex].effective_status = 'cancelled';
    memberSessionPackages[mspIndex].cancelled_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    memberSessionPackages[mspIndex].cancellation_reason = payload.reason;

    return mockResponse(memberSessionPackages[mspIndex]);
  }

  const mspLedgerMatch = path.match(/^\\/api\\/admin\\/member-session-packages\\/(\\d+)\\/ledger$/);
  if (mspLedgerMatch && method === 'GET') {
    const id = parseInt(mspLedgerMatch[1], 10);
    const items = packageLedgers.filter(l => l.member_session_package_id === id);
    return mockResponse(items);
  }
`;

content = content.replace(
    /if \(path\.startsWith\('\/api\/auth\/'\)\) \{/,
    newEndpoints + '\n  if (path.startsWith(\'/api/auth/\')) {'
);

fs.writeFileSync('src/admin/api/adminDevFixtures.ts', content);
