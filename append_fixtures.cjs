const fs = require('fs');
const path = 'src/admin/api/adminDevFixtures.ts';
let content = fs.readFileSync(path, 'utf8');

const additionalFixtures = `
  // --- Reception Parity ---
  if (path === '/api/reception/occupancy' && method === 'GET') {
    return createResponse({ data: { current_count: 0, stale_count: 0, items: [] } });
  }
  if (path.startsWith('/api/reception/members') && !path.includes('check-in') && !path.includes('check-out') && !path.includes('renew') && method === 'GET') {
    return createResponse({ data: { items: [] } });
  }
  const checkInMatch = path.match(/^\\/api\\/reception\\/members\\/([1-9]\\d*)\\/check-in$/);
  if (checkInMatch && method === 'POST') {
    return createResponse({ data: { visit: { id: 1, uuid: 'v-1', member_id: parseInt(checkInMatch[1], 10), checked_in_at: new Date().toISOString() } } });
  }
  const checkOutMatch = path.match(/^\\/api\\/reception\\/members\\/([1-9]\\d*)\\/check-out$/);
  if (checkOutMatch && method === 'POST') {
    return createResponse({ data: { visit: { id: 1, uuid: 'v-1', member_id: parseInt(checkOutMatch[1], 10), checked_in_at: new Date().toISOString(), checked_out_at: new Date().toISOString() } } });
  }
  const renewMatch = path.match(/^\\/api\\/reception\\/members\\/([1-9]\\d*)\\/renew$/);
  if (renewMatch && method === 'POST') {
    const payload = typeof reqBody === 'object' ? reqBody : {};
    return createResponse({ data: { renewal: { id: 1, uuid: 'r-1', member_id: parseInt(renewMatch[1], 10), previous_start_date: null, previous_end_date: null, new_start_date: payload?.new_start_date || '2026-01-01', new_end_date: payload?.new_end_date || '2027-01-01', created_at: new Date().toISOString() } } });
  }

  // --- Appointments Parity ---
  const appointmentMatch = path.match(/^\\/api\\/(admin|reception|trainer)\\/appointments(?:\\/([1-9]\\d*))?(?:\\/(reschedule|cancel|complete|no-show))?$/);
  if (appointmentMatch) {
    const action = appointmentMatch[3];
    if (method === 'GET') {
      return createResponse({ data: { items: [] } });
    }
    if (method === 'POST') {
      return createResponse({ data: { appointment: { id: 1, uuid: 'a-1', member_id: 1, trainer_id: 1, starts_at: new Date().toISOString(), ends_at: new Date().toISOString(), status: 'scheduled' } } });
    }
    if (method === 'PATCH') {
      return createResponse({ data: { appointment: { id: parseInt(appointmentMatch[2] || '1', 10), uuid: 'a-1', member_id: 1, trainer_id: 1, starts_at: new Date().toISOString(), ends_at: new Date().toISOString(), status: action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : 'scheduled' } } });
    }
  }
  
  if (path === '/api/reception/appointment-trainers' && method === 'GET') {
     return createResponse({ data: [] });
  }

  // --- Staff Accounts Parity ---
  const staffAccountMatch = path.match(/^\\/api\\/admin\\/staff-accounts(?:\\/([1-9]\\d*))?(?:\\/(status|role|reset-password))?$/);
  if (staffAccountMatch) {
    if (currentDevRole !== 'super_admin') {
      return createError('Bu işlem için yetkiniz yok.', 403, 'FORBIDDEN');
    }
    if (method === 'GET') {
      return createResponse({ data: { items: [] } });
    }
    if (method === 'POST' && !staffAccountMatch[2]) {
      const p = typeof reqBody === 'object' ? reqBody : {};
      return createResponse({ data: { id: Date.now(), username: p?.username || 'mock', email: p?.email || 'mock@mock.com', display_name: p?.display_name || 'Mock', role: p?.role || 'reception', status: 'active' } });
    }
    if (method === 'PATCH' || (method === 'POST' && staffAccountMatch[2] === 'reset-password')) {
      return createResponse({ data: { message: 'İşlem başarılı' } });
    }
  }

  return createError('Not implemented in mock', 404);
}
`;

content = content.replace(/  return createError\('Not implemented in mock', 404\);\n\n?\}/, additionalFixtures);
fs.writeFileSync(path, content);
