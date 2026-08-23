import type { Member } from '../pages/members/types';
import type { AdminTrainerListItem } from '../pages/trainers/types';

// Sentetik veriler
let mockTrainers: AdminTrainerListItem[] = [
  { id: 1, uuid: 't1', slug: 'ahmet-yilmaz', name: 'Ahmet Yılmaz', role_title: 'Baş Antrenör', branch: { id: 1, name: 'Pilates', slug: 'pilates', is_active: true }, is_active: true, sort_order: 1, updated_at: '2023-01-01', profile: null },
  { id: 2, uuid: 't2', slug: 'ayse-demir', name: 'Ayşe Demir', role_title: 'Fitness Eğitmeni', branch: { id: 2, name: 'Fitness', slug: 'fitness', is_active: true }, is_active: true, sort_order: 2, updated_at: '2023-01-01', profile: null },
  { id: 3, uuid: 't3', slug: 'mehmet-kaya', name: 'Mehmet Kaya', role_title: 'Yoga Eğitmeni', branch: { id: 3, name: 'Yoga', slug: 'yoga', is_active: true }, is_active: false, sort_order: 3, updated_at: '2023-01-01', profile: null },
];

let mockMembers: Member[] = [
  { id: 1, uuid: 'u1', first_name: 'Can', last_name: 'Özkan', phone: '5551112233', email: 'can@example.com', status: 'active', membership_start_date: '2023-01-01', membership_end_date: '2024-01-01', created_at: '2023-01-01', updated_at: '2023-01-01', trainer: { id: 1, name: 'Ahmet Yılmaz' }, consent_given_at: '2023-01-01 10:00:00' },
  { id: 2, uuid: 'u2', first_name: 'Elif', last_name: 'Şahin', phone: '5552223344', email: 'elif@example.com', status: 'active', membership_start_date: '2023-05-15', membership_end_date: '2024-05-15', created_at: '2023-05-15', updated_at: '2023-05-15', trainer: { id: 2, name: 'Ayşe Demir' } },
  { id: 3, uuid: 'u3', first_name: 'Burak', last_name: 'Çelik', phone: '5553334455', email: null, status: 'inactive', membership_start_date: null, membership_end_date: null, created_at: '2023-06-01', updated_at: '2023-06-01', trainer: null },
  { id: 4, uuid: 'u4', first_name: 'Zeynep', last_name: 'Koç', phone: '5554445566', email: 'zeynep@example.com', status: 'active', membership_start_date: '2023-07-20', membership_end_date: '2024-07-20', created_at: '2023-07-20', updated_at: '2023-07-20', trainer: { id: 1, name: 'Ahmet Yılmaz' }, emergency_contact_name: 'Ali Koç', emergency_contact_phone: '5559998877' },
  { id: 5, uuid: 'u5', first_name: 'Hakan', last_name: 'Turan', phone: '5555556677', email: null, status: 'inactive', deleted_at: '2023-09-01 12:00:00', membership_start_date: '2023-01-01', membership_end_date: '2023-06-01', created_at: '2023-01-01', updated_at: '2023-09-01', trainer: { id: 2, name: 'Ayşe Demir' } },
  { id: 6, uuid: 'u6', first_name: 'Leyla', last_name: 'Güneş', phone: '5556667788', email: 'leyla@example.com', status: 'active', membership_start_date: '2023-10-01', membership_end_date: '2024-10-01', created_at: '2023-10-01', updated_at: '2023-10-01', trainer: null },
];

let nextMemberId = 7;
let nextAccountId = 3;

let mockTrainerAccounts: Array<{ id: number; trainer_id: number; username: string; email: string; display_name: string; role: 'trainer'; status: 'active'|'inactive'; last_login_at: string | null; password_changed_at: string | null }> = [
  { id: 1, trainer_id: 1, username: 'ahmet.yilmaz', email: 'ahmet@example.com', display_name: 'Ahmet Yılmaz', role: 'trainer', status: 'active', last_login_at: '2023-10-01 10:00:00', password_changed_at: null },
];

let currentDevRole = 'super_admin';

export async function handleAdminFallback(endpoint: string, options: RequestInit): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(endpoint, 'http://localhost');
  const path = url.pathname;

  const createResponse = (body: unknown, status = 200) => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const createError = (message: string, status = 400, code = 'ERROR') => {
    return createResponse({ error: { message, code } }, status);
  };

  let reqBody: Record<string, unknown> = {};
  if (['POST', 'PATCH', 'PUT'].includes(method) && options.body) {
    try {
      if (typeof options.body === 'string') {
        reqBody = JSON.parse(options.body);
      }
    } catch (e) {
      return createError('Invalid JSON body', 400);
    }
  }

  // --- Auth Endpoints ---
  if (path === '/api/auth/csrf' && method === 'GET') {
    return createResponse({ data: { token: 'dev-preview-csrf' } });
  }
  if (path === '/api/auth/me' && method === 'GET') {
    if (currentDevRole === 'trainer') {
      return createResponse({ data: { id: 888, email: 'trainer@preview.so3.dev', role: 'trainer', display_name: 'Preview Eğitmeni' } });
    }
    if (currentDevRole === 'reception') {
      return createResponse({ data: { id: 777, email: 'reception@preview.so3.dev', role: 'reception', display_name: 'Preview Resepsiyon' } });
    }
    return createResponse({ data: { id: 999, email: 'admin@preview.so3.dev', role: 'super_admin', display_name: 'Preview Yöneticisi' } });
  }
  if (path === '/api/auth/login' && method === 'POST') {
    if (reqBody.username === 'trainer') currentDevRole = 'trainer';
    else if (reqBody.username === 'reception') currentDevRole = 'reception';
    else currentDevRole = 'super_admin';
    return createResponse({ data: { success: true } });
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    currentDevRole = 'super_admin';
    return createResponse({ data: { success: true } });
  }

  // --- Dashboard Endpoints ---
  if (path === '/api/admin/dashboard' && method === 'GET') {
    return createResponse({
      data: {
        system_status: "ok",
        database_status: "connected",
        metrics: {
          events: {
            published: 5,
            draft: 2,
            total: 7
          },
          media_active: 24,
          trainers_active: 13,
          branches_active: 4,
          homepage_sections_active: 12
        }
      }
    });
  }

  // --- Trainers Endpoints ---
  if (path === '/api/admin/trainers' && method === 'GET') {
    const status = url.searchParams.get('status');
    let res = [...mockTrainers];
    if (status === 'active') res = res.filter(t => t.is_active);
    return createResponse({ data: res });
  }

  // --- Trainer Accounts Endpoints ---
  if (path === '/api/admin/trainer-accounts') {
    if (currentDevRole !== 'super_admin' && currentDevRole !== 'admin') {
      return createError('Bu işlemi yapma yetkiniz yok.', 403, 'FORBIDDEN');
    }

    if (method === 'GET') {
      const data = mockTrainers.map(trainer => {
        const account = mockTrainerAccounts.find(a => a.trainer_id === trainer.id);
        return {
          trainer: {
            id: trainer.id,
            name: trainer.name,
            slug: trainer.slug,
            is_active: trainer.is_active
          },
          account: account ? {
            id: account.id,
            username: account.username,
            email: account.email,
            display_name: account.display_name,
            role: account.role,
            status: account.status,
            last_login_at: account.last_login_at,
            password_changed_at: account.password_changed_at
          } : null
        };
      });
      return createResponse(data);
    }

    if (method === 'POST') {
      const trainer_id = Number(reqBody.trainer_id);
      const username = String(reqBody.username || '');
      const email = String(reqBody.email || '');
      const display_name = String(reqBody.display_name || '');
      const password = String(reqBody.password || '');

      const trainer = mockTrainers.find(t => t.id === trainer_id);
      if (!trainer) {
        return createError('Eğitmen bulunamadı.', 404, 'TRAINER_NOT_FOUND');
      }

      if (mockTrainerAccounts.some(a => a.trainer_id === trainer_id)) {
        return createError('Bu eğitmen zaten bir hesaba bağlı.', 409, 'TRAINER_ACCOUNT_ALREADY_LINKED');
      }

      if (mockTrainerAccounts.some(a => a.username === username || a.email === email)) {
        return createError('Kullanıcı adı veya e-posta adresi zaten kullanımda.', 409, 'ACCOUNT_IDENTITY_CONFLICT');
      }

      const newAccount = {
        id: nextAccountId++,
        trainer_id,
        username,
        email,
        display_name,
        role: 'trainer' as const,
        status: 'active' as const,
        last_login_at: null,
        password_changed_at: null
      };

      mockTrainerAccounts.push(newAccount);

      return createResponse({
        id: newAccount.id,
        trainer_id: newAccount.trainer_id,
        username: newAccount.username,
        email: newAccount.email,
        display_name: newAccount.display_name,
        role: newAccount.role,
        status: newAccount.status
      }, 201);
    }
  }

  // --- Members Endpoints ---
  if (path === '/api/admin/members') {
    if (method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const perPage = parseInt(url.searchParams.get('per_page') || '20', 10);
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const status = url.searchParams.get('status') || 'all';
      const deleted = url.searchParams.get('deleted') || 'active';
      const trainerId = url.searchParams.get('trainer_id');

      let filtered = mockMembers.filter(m => {
        if (deleted === 'active' && m.deleted_at) return false;
        if (deleted === 'deleted' && !m.deleted_at) return false;
        if (status !== 'all' && m.status !== status) return false;
        if (trainerId && trainerId !== 'all' && m.trainer?.id.toString() !== trainerId) return false;
        if (q) {
          const searchStr = `${m.first_name} ${m.last_name} ${m.phone} ${m.email || ''}`.toLowerCase();
          if (!searchStr.includes(q)) return false;
        }
        return true;
      });

      filtered.sort((a, b) => b.id - a.id);
      const total = filtered.length;
      const last_page = Math.ceil(total / perPage) || 1;
      const items = filtered.slice((page - 1) * perPage, page * perPage);

      return createResponse({
        data: {
          items,
          pagination: { total, page, per_page: perPage, last_page }
        }
      });
    }

    if (method === 'POST') {
      const trainer = reqBody.trainer_id 
        ? mockTrainers.find(t => t.id === reqBody.trainer_id) 
        : null;

      const newMember: Member = {
        id: nextMemberId++,
        uuid: `u${nextMemberId}`,
        first_name: String(reqBody.first_name || ''),
        last_name: String(reqBody.last_name || ''),
        phone: String(reqBody.phone || ''),
        email: reqBody.email ? String(reqBody.email) : null,
        status: (reqBody.status === 'inactive' ? 'inactive' : 'active'),
        membership_start_date: reqBody.membership_start_date ? String(reqBody.membership_start_date) : null,
        membership_end_date: reqBody.membership_end_date ? String(reqBody.membership_end_date) : null,
        emergency_contact_name: reqBody.emergency_contact_name ? String(reqBody.emergency_contact_name) : undefined,
        emergency_contact_phone: reqBody.emergency_contact_phone ? String(reqBody.emergency_contact_phone) : undefined,
        notes: reqBody.notes ? String(reqBody.notes) : undefined,
        consent_given_at: reqBody.consent_given_at ? String(reqBody.consent_given_at) : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        trainer: trainer ? { id: trainer.id, name: trainer.name } : null
      };

      mockMembers.push(newMember);
      return createResponse({ data: { id: newMember.id, success: true } });
    }
  }

  if (path.startsWith('/api/admin/members/')) {
    const parts = path.split('/');
    const idPart = parts[4];
    const action = parts[5];
    const id = parseInt(idPart, 10);
    
    if (isNaN(id)) return createError('Invalid ID', 400);
    const memberIndex = mockMembers.findIndex(m => m.id === id);
    if (memberIndex === -1) return createError('Member not found', 404, 'NOT_FOUND');
    const member = mockMembers[memberIndex];

    if (method === 'GET') {
      return createResponse({ data: member });
    }

    if (method === 'PATCH' && !action) {
      const trainer = reqBody.trainer_id 
        ? mockTrainers.find(t => t.id === reqBody.trainer_id) 
        : null;

      const updatedMember = { ...member };
      if ('first_name' in reqBody) updatedMember.first_name = String(reqBody.first_name || '');
      if ('last_name' in reqBody) updatedMember.last_name = String(reqBody.last_name || '');
      if ('phone' in reqBody) updatedMember.phone = String(reqBody.phone || '');
      if ('email' in reqBody) updatedMember.email = reqBody.email ? String(reqBody.email) : null;
      if ('status' in reqBody) updatedMember.status = reqBody.status === 'inactive' ? 'inactive' : 'active';
      if ('membership_start_date' in reqBody) updatedMember.membership_start_date = reqBody.membership_start_date ? String(reqBody.membership_start_date) : null;
      if ('membership_end_date' in reqBody) updatedMember.membership_end_date = reqBody.membership_end_date ? String(reqBody.membership_end_date) : null;
      if ('emergency_contact_name' in reqBody) updatedMember.emergency_contact_name = reqBody.emergency_contact_name ? String(reqBody.emergency_contact_name) : undefined;
      if ('emergency_contact_phone' in reqBody) updatedMember.emergency_contact_phone = reqBody.emergency_contact_phone ? String(reqBody.emergency_contact_phone) : undefined;
      if ('notes' in reqBody) updatedMember.notes = reqBody.notes ? String(reqBody.notes) : undefined;
      if ('consent_given_at' in reqBody) updatedMember.consent_given_at = reqBody.consent_given_at ? String(reqBody.consent_given_at) : undefined;
      
      if ('trainer_id' in reqBody) {
        updatedMember.trainer = trainer ? { id: trainer.id, name: trainer.name } : null;
      }
      
      updatedMember.updated_at = new Date().toISOString();
      mockMembers[memberIndex] = updatedMember;
      
      return createResponse({ data: { success: true } });
    }

    if (method === 'DELETE' && !action) {
      // Soft delete
      mockMembers[memberIndex].deleted_at = new Date().toISOString();
      return createResponse({ data: { success: true } });
    }

    if (method === 'POST' && action === 'restore') {
      mockMembers[memberIndex].deleted_at = undefined;
      return createResponse({ data: { success: true } });
    }
  }

  // --- Trainer Members Endpoints ---
  if (path === '/api/trainer/members' && method === 'GET') {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '20', 10);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const status = url.searchParams.get('status');

    // Simulate trainer ID 1 (Ahmet Yılmaz) for the 'trainer' dev account
    const myTrainerId = 1;

    let filtered = mockMembers.filter(m => {
      if (m.deleted_at) return false;
      if (!m.trainer || m.trainer.id !== myTrainerId) return false;
      if (status && m.status !== status) return false;
      if (q) {
        const searchStr = `${m.first_name} ${m.last_name} ${m.phone} ${m.email || ''}`.toLowerCase();
        if (!searchStr.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => b.id - a.id);
    const total = filtered.length;
    const last_page = Math.ceil(total / perPage) || 1;
    const items = filtered.slice((page - 1) * perPage, page * perPage).map(m => {
      // Return TrainerMemberListItem structure
      return {
        id: m.id,
        uuid: m.uuid,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone,
        email: m.email,
        status: m.status,
        membership_start_date: m.membership_start_date,
        membership_end_date: m.membership_end_date,
        created_at: m.created_at,
        updated_at: m.updated_at
      };
    });

    return createResponse({
      data: {
        items,
        pagination: { total, page, per_page: perPage, last_page }
      }
    });
  }

  if (path.startsWith('/api/trainer/members/') && method === 'GET') {
    const parts = path.split('/');
    const id = parseInt(parts[4], 10);
    if (isNaN(id)) return createError('Invalid ID', 400);

    const myTrainerId = 1;
    const member = mockMembers.find(m => m.id === id && !m.deleted_at && m.trainer && m.trainer.id === myTrainerId);
    
    if (!member) return createError('Üye bulunamadı veya bu üyeye erişim yetkiniz yok.', 404, 'NOT_FOUND');

    // Return TrainerMemberDetail structure
    return createResponse({
      data: {
        id: member.id,
        uuid: member.uuid,
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        email: member.email,
        status: member.status,
        membership_start_date: member.membership_start_date,
        membership_end_date: member.membership_end_date,
        emergency_contact_name: member.emergency_contact_name || null,
        emergency_contact_phone: member.emergency_contact_phone || null,
        notes: member.notes || null,
        created_at: member.created_at,
        updated_at: member.updated_at
      }
    });
  }

  return createError('Not implemented in mock', 404);
}
