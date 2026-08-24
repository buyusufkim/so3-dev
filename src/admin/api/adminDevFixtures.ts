import type { Member } from '../pages/members/types';
import type { AdminTrainerListItem } from '../pages/trainers/types';

// Sentetik veriler

import type { TrainingProgramListItem, TrainingProgramDetail } from '../pages/training-programs/types';

interface InternalTrainingProgramDetail extends TrainingProgramDetail {
  deleted_at: string | null;
}

let mockPrograms: InternalTrainingProgramDetail[] = [
  { id: 1, uuid: 'p1', title: 'Full Body Başlangıç', status: 'active', start_date: '2023-11-01', end_date: '2023-12-01', notes: 'Haftada 3 gün.', created_at: '2023-10-15', updated_at: '2023-10-15', member: { id: 1, uuid: 'u1', first_name: 'Can', last_name: 'Özkan' }, trainer: { id: 1, name: 'Ahmet Yılmaz' }, deleted_at: null },
  { id: 2, uuid: 'p2', title: 'Hipertrofi', status: 'draft', start_date: null, end_date: null, notes: null, created_at: '2023-11-01', updated_at: '2023-11-01', member: { id: 1, uuid: 'u1', first_name: 'Can', last_name: 'Özkan' }, trainer: { id: 1, name: 'Ahmet Yılmaz' }, deleted_at: null },
  { id: 3, uuid: 'p3', title: 'Kardiyo Odaklı', status: 'archived', start_date: '2023-01-01', end_date: '2023-02-01', notes: null, created_at: '2023-01-01', updated_at: '2023-02-01', member: { id: 1, uuid: 'u1', first_name: 'Can', last_name: 'Özkan' }, trainer: { id: 1, name: 'Ahmet Yılmaz' }, deleted_at: '2023-03-01' },
];
let nextProgramId = 4;

import type { ProgramExercise } from '../pages/training-programs/types';

let mockProgramExercises: ProgramExercise[] = [
  {
    id: 1,
    program_id: 1,
    exercise_name: 'Bench Press',
    sets: 3,
    repetitions: '10-12',
    duration_seconds: null,
    rest_seconds: 60,
    instructions: 'Barı kontrollü indirin.',
    sort_order: 1,
    created_at: '2023-11-01T10:00:00Z',
    updated_at: '2023-11-01T10:00:00Z'
  },
  {
    id: 2,
    program_id: 1,
    exercise_name: 'Squat',
    sets: 4,
    repetitions: '8-10',
    duration_seconds: null,
    rest_seconds: 90,
    instructions: 'Topuklardan güç alın.',
    sort_order: 2,
    created_at: '2023-11-01T10:05:00Z',
    updated_at: '2023-11-01T10:05:00Z'
  }
];
let nextExerciseId = 3;


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
      return createResponse({ data });
    }

    if (method === 'POST') {
      const { trainer_id, username, email, display_name, password } = reqBody;

      if (typeof trainer_id !== 'number' || !Number.isInteger(trainer_id) || trainer_id <= 0) {
        return createError('Geçerli bir eğitmen ID gereklidir.', 422, 'VALIDATION_ERROR');
      }
      if (typeof username !== 'string' || username.length < 3 || username.length > 50 || !/^[A-Za-z0-9._-]+$/.test(username)) {
        return createError('Kullanıcı adı 3-50 karakter uzunluğunda olmalı ve sadece harf, sayı, nokta, tire veya alt çizgi içermelidir.', 422, 'VALIDATION_ERROR');
      }
      if (typeof email !== 'string' || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return createError('Geçerli bir e-posta adresi gereklidir (maksimum 100 karakter).', 422, 'VALIDATION_ERROR');
      }
      if (typeof display_name !== 'string' || Array.from(display_name).length < 2 || Array.from(display_name).length > 100) {
        return createError('Görünen ad 2-100 karakter arasında olmalıdır.', 422, 'VALIDATION_ERROR');
      }
      if (typeof password !== 'string' || Array.from(password).length < 12 || Array.from(password).length > 256) {
        return createError('Şifre 12-256 karakter arasında olmalıdır.', 422, 'VALIDATION_ERROR');
      }

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
        data: {
          id: newAccount.id,
          trainer_id: newAccount.trainer_id,
          username: newAccount.username,
          email: newAccount.email,
          display_name: newAccount.display_name,
          role: newAccount.role,
          status: newAccount.status
        }
      }, 201);
    }
  }

  const statusMatch = path.match(/^\/api\/admin\/trainer-accounts\/([1-9]\d*)\/status$/);
  if (statusMatch && method === 'PATCH') {
    if (currentDevRole !== 'super_admin' && currentDevRole !== 'admin') {
      return createError('Bu işlemi yapma yetkiniz yok.', 403, 'FORBIDDEN');
    }

    const trainer_id = parseInt(statusMatch[1], 10);
    
    if (!reqBody || Object.keys(reqBody).length !== 1 || !('status' in reqBody)) {
      return createError('Sadece status alanı gönderilebilir.', 422, 'VALIDATION_ERROR');
    }

    const status = reqBody.status;
    if (status !== 'active' && status !== 'inactive') {
      return createError('Geçersiz hesap durumu.', 422, 'VALIDATION_ERROR');
    }

    const trainer = mockTrainers.find(t => t.id === trainer_id);
    if (!trainer) {
      return createError('Eğitmen bulunamadı.', 404, 'TRAINER_NOT_FOUND');
    }

    const account = mockTrainerAccounts.find(a => a.trainer_id === trainer_id);
    if (!account) {
      return createError('Bu eğitmenin bağlı bir hesabı yok.', 409, 'TRAINER_ACCOUNT_NOT_LINKED');
    }

    account.status = status;
    
    return createResponse({
      data: {
        trainer_id,
        account_id: account.id,
        status
      }
    });
  }

  const pwdMatch = path.match(/^\/api\/admin\/trainer-accounts\/([1-9]\d*)\/reset-password$/);
  if (pwdMatch && method === 'POST') {
    if (currentDevRole !== 'super_admin' && currentDevRole !== 'admin') {
      return createError('Bu işlemi yapma yetkiniz yok.', 403, 'FORBIDDEN');
    }

    const trainer_id = parseInt(pwdMatch[1], 10);

    if (!reqBody || Object.keys(reqBody).length !== 1 || !('password' in reqBody)) {
      return createError('Sadece password alanı gönderilebilir.', 422, 'VALIDATION_ERROR');
    }

    const password = reqBody.password;
    if (typeof password !== 'string') {
      return createError('Şifre geçerli bir metin olmalıdır.', 422, 'VALIDATION_ERROR');
    }

    const pwdLength = Array.from(password).length;
    if (pwdLength < 12 || pwdLength > 256) {
      return createError('Şifre 12-256 karakter arasında olmalıdır.', 422, 'VALIDATION_ERROR');
    }

    const trainer = mockTrainers.find(t => t.id === trainer_id);
    if (!trainer) {
      return createError('Eğitmen bulunamadı.', 404, 'TRAINER_NOT_FOUND');
    }

    const account = mockTrainerAccounts.find(a => a.trainer_id === trainer_id);
    if (!account) {
      return createError('Bu eğitmenin bağlı bir hesabı yok.', 409, 'TRAINER_ACCOUNT_NOT_LINKED');
    }

    account.password_changed_at = new Date().toISOString();
    
    return createResponse({
      data: {
        trainer_id,
        account_id: account.id,
        password_changed: true
      }
    });
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


  // --- Program Exercises Endpoints ---
  if (path.match(/^\/api\/admin\/training-programs\/[1-9]\d*\/exercises$/)) {
    const programId = parseInt(path.split('/')[4], 10);
    const program = mockPrograms.find(p => p.id === programId);
    if (!program || program.deleted_at !== null) return createError('Program bulunamadı', 404, 'NOT_FOUND');

    if (method === 'GET') {
      const exercises = mockProgramExercises
        .filter(e => e.program_id === programId)
        .sort((a, b) => {
          if (a.sort_order === b.sort_order) return a.id - b.id;
          return a.sort_order - b.sort_order;
        });
      return createResponse({ data: exercises });
    }

    if (method === 'POST') {
      const bodyObj = reqBody as Record<string, unknown>;
      
      const allowedExerciseKeys = ['exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order'];
      for (const k of Object.keys(bodyObj)) {
        if (!allowedExerciseKeys.includes(k)) return createError(`Bilinmeyen alan: ${k}`, 422, 'VALIDATION_ERROR');
      }

      const { exercise_name, sets, repetitions, duration_seconds, rest_seconds, instructions, sort_order } = bodyObj;

      if (typeof exercise_name !== 'string') return createError('exercise_name geçerli olmalıdır.', 422, 'VALIDATION_ERROR');
      const trimmedName = exercise_name.trim();
      if (trimmedName.length < 1 || Array.from(trimmedName).length > 160) return createError('exercise_name 1-160 karakter arası olmalıdır.', 422, 'VALIDATION_ERROR');

      let parsedSets: number | null = null;
      if (sets !== undefined && sets !== null) {
        if (typeof sets !== 'number' || !Number.isInteger(sets) || sets < 1 || sets > 65535) {
          return createError('sets 1-65535 arası olmalıdır.', 422, 'VALIDATION_ERROR');
        }
        parsedSets = sets;
      }

      let parsedReps: string | null = null;
      if (repetitions !== undefined && repetitions !== null) {
        if (typeof repetitions !== 'string' || Array.from(repetitions).length > 40) {
          return createError('repetitions max 40 karakter.', 422, 'VALIDATION_ERROR');
        }
        parsedReps = repetitions;
      }

      let parsedDuration: number | null = null;
      if (duration_seconds !== undefined && duration_seconds !== null) {
        if (typeof duration_seconds !== 'number' || !Number.isInteger(duration_seconds) || duration_seconds < 1 || duration_seconds > 4294967295) {
          return createError('duration_seconds 1-4294967295 arası olmalıdır.', 422, 'VALIDATION_ERROR');
        }
        parsedDuration = duration_seconds;
      }

      let parsedRest: number | null = null;
      if (rest_seconds !== undefined && rest_seconds !== null) {
        if (typeof rest_seconds !== 'number' || !Number.isInteger(rest_seconds) || rest_seconds < 0 || rest_seconds > 65535) {
          return createError('rest_seconds 0-65535 arası olmalıdır.', 422, 'VALIDATION_ERROR');
        }
        parsedRest = rest_seconds;
      }

      let parsedInst: string | null = null;
      if (instructions !== undefined && instructions !== null) {
        if (typeof instructions !== 'string' || Array.from(instructions).length > 1000) {
          return createError('instructions max 1000 karakter.', 422, 'VALIDATION_ERROR');
        }
        parsedInst = instructions;
      }

      let parsedSortOrder = 0;
      if (sort_order === null) {
        return createError('sort_order null olamaz.', 422, 'VALIDATION_ERROR');
      }
      if (sort_order !== undefined) {
        if (typeof sort_order !== 'number' || !Number.isInteger(sort_order) || sort_order < 0 || sort_order > 2147483647) {
          return createError('sort_order geçersiz.', 422, 'VALIDATION_ERROR');
        }
        parsedSortOrder = sort_order;
      }

      const newExercise: ProgramExercise = {
        id: nextExerciseId++,
        program_id: programId,
        exercise_name: trimmedName,
        sets: parsedSets,
        repetitions: parsedReps,
        duration_seconds: parsedDuration,
        rest_seconds: parsedRest,
        instructions: parsedInst,
        sort_order: parsedSortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockProgramExercises.push(newExercise);
      return createResponse({ data: { id: newExercise.id, program_id: newExercise.program_id } }, 201);
    }
  }

  if (path.match(/^\/api\/admin\/program-exercises\/[1-9]\d*$/)) {
    const exerciseId = parseInt(path.split('/')[4], 10);
    const exerciseIndex = mockProgramExercises.findIndex(e => e.id === exerciseId);
    
    if (exerciseIndex === -1) return createError('Egzersiz bulunamadı', 404, 'NOT_FOUND');
    const exercise = mockProgramExercises[exerciseIndex];
    const program = mockPrograms.find(p => p.id === exercise.program_id);
    if (!program || program.deleted_at !== null) return createError('Program bulunamadı', 404, 'NOT_FOUND');

    if (method === 'DELETE') {
      mockProgramExercises.splice(exerciseIndex, 1);
      return createResponse({ data: { success: true } });
    }

    if (method === 'PATCH') {
      const bodyObj = reqBody as Record<string, unknown>;
      const keys = Object.keys(bodyObj);
      if (keys.length === 0) return createError('Boş istek', 422, 'VALIDATION_ERROR');
      
      const allowedExerciseKeys = ['exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order'];
      for (const k of keys) {
        if (!allowedExerciseKeys.includes(k)) return createError(`Bilinmeyen alan: ${k}`, 422, 'VALIDATION_ERROR');
      }

      let finalName = exercise.exercise_name;
      let finalSets: number | null = exercise.sets;
      let finalReps: string | null = exercise.repetitions;
      let finalDuration: number | null = exercise.duration_seconds;
      let finalRest: number | null = exercise.rest_seconds;
      let finalInst: string | null = exercise.instructions;
      let finalSortOrder = exercise.sort_order;

      if ('exercise_name' in bodyObj) {
        const en = bodyObj.exercise_name;
        if (en === null) return createError('exercise_name null olamaz.', 422, 'VALIDATION_ERROR');
        if (typeof en !== 'string') return createError('exercise_name metin olmalıdır.', 422, 'VALIDATION_ERROR');
        const trimmed = en.trim();
        if (trimmed.length < 1 || Array.from(trimmed).length > 160) return createError('exercise_name uzunluk hatası.', 422, 'VALIDATION_ERROR');
        finalName = trimmed;
      }

      if ('sets' in bodyObj) {
        const s = bodyObj.sets;
        if (s !== null) {
          if (typeof s !== 'number' || !Number.isInteger(s) || s < 1 || s > 65535) return createError('sets hatalı.', 422, 'VALIDATION_ERROR');
        }
        finalSets = s === null ? null : s;
      }

      if ('repetitions' in bodyObj) {
        const r = bodyObj.repetitions;
        if (r !== null) {
          if (typeof r !== 'string' || Array.from(r).length > 40) return createError('repetitions hatalı.', 422, 'VALIDATION_ERROR');
        }
        finalReps = r === null ? null : r;
      }

      if ('duration_seconds' in bodyObj) {
        const d = bodyObj.duration_seconds;
        if (d !== null) {
          if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 4294967295) return createError('duration_seconds hatalı.', 422, 'VALIDATION_ERROR');
        }
        finalDuration = d === null ? null : d;
      }

      if ('rest_seconds' in bodyObj) {
        const rs = bodyObj.rest_seconds;
        if (rs !== null) {
          if (typeof rs !== 'number' || !Number.isInteger(rs) || rs < 0 || rs > 65535) return createError('rest_seconds hatalı.', 422, 'VALIDATION_ERROR');
        }
        finalRest = rs === null ? null : rs;
      }

      if ('instructions' in bodyObj) {
        const ins = bodyObj.instructions;
        if (ins !== null) {
          if (typeof ins !== 'string' || Array.from(ins).length > 1000) return createError('instructions hatalı.', 422, 'VALIDATION_ERROR');
        }
        finalInst = ins === null ? null : ins;
      }

      if ('sort_order' in bodyObj) {
        const so = bodyObj.sort_order;
        if (so === null) return createError('sort_order null olamaz.', 422, 'VALIDATION_ERROR');
        if (typeof so !== 'number' || !Number.isInteger(so) || so < 0 || so > 2147483647) return createError('sort_order hatalı.', 422, 'VALIDATION_ERROR');
        finalSortOrder = so;
      }

      exercise.exercise_name = finalName;
      exercise.sets = finalSets;
      exercise.repetitions = finalReps;
      exercise.duration_seconds = finalDuration;
      exercise.rest_seconds = finalRest;
      exercise.instructions = finalInst;
      exercise.sort_order = finalSortOrder;
      exercise.updated_at = new Date().toISOString();

      return createResponse({ data: { success: true } });
    }
  }

  // --- Training Programs Endpoints ---
  if (path.match(/^\/api\/admin\/members\/[1-9]\d*\/training-programs$/)) {
    const memberId = parseInt(path.split('/')[4], 10);
    const member = mockMembers.find(m => m.id === memberId);
    if (!member) return createError('Üye bulunamadı', 404, 'NOT_FOUND');

    if (method === 'GET') {
      let filtered = mockPrograms.filter(p => p.member.id === memberId);
      
      const statusFilter = url.searchParams.get('status');
      if (statusFilter !== null) {
        if (!['draft', 'active', 'archived'].includes(statusFilter)) {
          return createError('Geçersiz durum filtresi', 422, 'VALIDATION_ERROR');
        }
        filtered = filtered.filter(p => p.status === statusFilter);
      }
      
      const deletedFilter = url.searchParams.get('deleted');
      if (deletedFilter !== null) {
        if (!['active', 'deleted', 'all'].includes(deletedFilter)) {
          return createError('Geçersiz silinme durumu filtresi', 422, 'VALIDATION_ERROR');
        }
      }
      
      const effectiveDeletedFilter = deletedFilter || 'active';
      if (effectiveDeletedFilter === 'deleted') {
        filtered = filtered.filter(p => p.deleted_at !== null);
      } else if (effectiveDeletedFilter === 'all') {
        // no filter
      } else {
        // 'active' by default
        filtered = filtered.filter(p => p.deleted_at === null);
      }

      const total = filtered.length;
      
      const pageParam = url.searchParams.get('page');
      const perPageParam = url.searchParams.get('per_page');
      
      let page = 1;
      let perPage = 20;

      if (pageParam !== null) {
        if (!/^[1-9]\d*$/.test(pageParam)) return createError('Geçersiz sayfalama parametresi', 422, 'VALIDATION_ERROR');
        page = Number(pageParam);
        if (!Number.isSafeInteger(page)) return createError('Geçersiz sayfalama parametresi', 422, 'VALIDATION_ERROR');
      }

      if (perPageParam !== null) {
        if (!/^[1-9]\d*$/.test(perPageParam)) return createError('Geçersiz sayfalama parametresi', 422, 'VALIDATION_ERROR');
        perPage = Number(perPageParam);
        if (!Number.isSafeInteger(perPage) || perPage > 100) return createError('Geçersiz sayfalama parametresi', 422, 'VALIDATION_ERROR');
      }
      
      const start = (page - 1) * perPage;
      const paginated = filtered.slice(start, start + perPage);

      const items: TrainingProgramListItem[] = paginated.map(p => ({
        id: p.id,
        uuid: p.uuid,
        title: p.title,
        status: p.status,
        start_date: p.start_date,
        end_date: p.end_date,
        created_at: p.created_at,
        updated_at: p.updated_at,
        deleted_at: p.deleted_at,
        trainer: p.trainer
      }));

      return createResponse({
        data: {
          items,
          pagination: {
            total,
            page,
            per_page: perPage,
            last_page: Math.ceil(total / perPage) || 1
          }
        }
      });
    }

    if (method === 'POST') {
      if (!member.trainer) {
        return createError('Üyeye atanmış bir eğitmen bulunmuyor.', 409, 'MEMBER_TRAINER_NOT_ASSIGNED');
      }
      
      const allowedKeys = ['title', 'status', 'start_date', 'end_date', 'notes'];
      for (const k of Object.keys(reqBody)) {
        if (!allowedKeys.includes(k)) {
          return createError('Bilinmeyen alan', 422, 'VALIDATION_ERROR');
        }
      }

      const bodyObj = reqBody as Record<string, unknown>;
      const { title, status, start_date, end_date, notes } = bodyObj;

      if (typeof title !== 'string') return createError('title metin olmalıdır.', 422, 'VALIDATION_ERROR');
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 1 || trimmedTitle.length > 160) return createError('title 1-160 karakter arasında olmalıdır.', 422, 'VALIDATION_ERROR');

      let parsedStatus: 'draft' | 'active' | 'archived' = 'draft';
      if (status !== undefined) {
        if (status === 'draft' || status === 'active' || status === 'archived') {
          parsedStatus = status;
        } else {
          return createError('status geçersiz.', 422, 'VALIDATION_ERROR');
        }
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const isValidDate = (d: unknown): d is string => {
        if (typeof d !== 'string') return false;
        if (!dateRegex.test(d)) return false;
        const parsed = new Date(d);
        return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(d);
      };

      if (start_date !== undefined && start_date !== null) {
        if (!isValidDate(start_date)) return createError('Geçersiz tarih', 422, 'VALIDATION_ERROR');
      }
      if (end_date !== undefined && end_date !== null) {
        if (!isValidDate(end_date)) return createError('Geçersiz tarih', 422, 'VALIDATION_ERROR');
      }

      const finalStart = start_date === undefined ? null : (start_date as string);
      const finalEnd = end_date === undefined ? null : (end_date as string);

      if (finalStart && finalEnd && finalEnd < finalStart) {
        return createError('Bitiş tarihi başlangıç tarihinden önce olamaz', 422, 'VALIDATION_ERROR');
      }

      if (notes !== undefined && notes !== null) {
        if (typeof notes !== 'string' || Array.from(notes).length > 3000) return createError('notes geçersiz', 422, 'VALIDATION_ERROR');
      }

      const finalNotes = notes === undefined ? null : (notes as string);

      const newProgram: InternalTrainingProgramDetail = {
        id: nextProgramId++,
        uuid: `p${nextProgramId}`,
        title: trimmedTitle,
        status: parsedStatus,
        start_date: finalStart,
        end_date: finalEnd,
        notes: finalNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member: { id: member.id, uuid: member.uuid, first_name: member.first_name, last_name: member.last_name },
        trainer: { id: member.trainer.id, name: member.trainer.name },
        deleted_at: null
      };
      mockPrograms.push(newProgram);
      return createResponse({ data: { id: newProgram.id, uuid: newProgram.uuid } }, 201);
    }
  }

  if (path.match(/^\/api\/admin\/training-programs\/[1-9]\d*$/)) {
    const programId = parseInt(path.split('/')[4], 10);
    const program = mockPrograms.find(p => p.id === programId);
    if (!program) return createError('Program bulunamadı', 404, 'NOT_FOUND');

    if (method === 'GET') {
      if (program.deleted_at !== null) {
        return createError('Program bulunamadı', 404, 'NOT_FOUND');
      }
      // Strip deleted_at before sending Detail response (as per contract)
      const { deleted_at, ...detail } = program;
      return createResponse({ data: detail });
    }

    if (method === 'PATCH') {
      if (program.deleted_at !== null) {
        return createError('Program bulunamadı', 404, 'NOT_FOUND');
      }

      const keys = Object.keys(reqBody);
      if (keys.length === 0) return createError('Boş istek', 422, 'VALIDATION_ERROR');

      const allowedKeys = ['title', 'status', 'start_date', 'end_date', 'notes'];
      for (const k of keys) {
        if (!allowedKeys.includes(k)) {
          return createError('Bilinmeyen alan', 422, 'VALIDATION_ERROR');
        }
      }
    
      const bodyObj = reqBody as Record<string, unknown>;
      let finalTitle = program.title;
      let finalStatus = program.status;
      let finalStart = program.start_date;
      let finalEnd = program.end_date;
      let finalNotes = program.notes;

      if ('title' in bodyObj) {
        const titleVal = bodyObj.title;
        if (typeof titleVal !== 'string') return createError('title metin olmalıdır', 422, 'VALIDATION_ERROR');
        const trimmed = titleVal.trim();
        if (trimmed.length < 1 || trimmed.length > 160) return createError('title geçersiz', 422, 'VALIDATION_ERROR');
        finalTitle = trimmed;
      }
      
      if ('status' in bodyObj) {
        const statusVal = bodyObj.status;
        if (statusVal === 'draft' || statusVal === 'active' || statusVal === 'archived') {
          finalStatus = statusVal;
        } else {
          return createError('status geçersiz', 422, 'VALIDATION_ERROR');
        }
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const isValidDate = (d: unknown): d is string => {
        if (typeof d !== 'string') return false;
        if (!dateRegex.test(d)) return false;
        const parsed = new Date(d);
        return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(d);
      };

      if ('start_date' in bodyObj) {
        const sdVal = bodyObj.start_date;
        if (sdVal !== null && !isValidDate(sdVal)) return createError('Geçersiz tarih', 422, 'VALIDATION_ERROR');
        finalStart = sdVal === null ? null : sdVal;
      }
      
      if ('end_date' in bodyObj) {
        const edVal = bodyObj.end_date;
        if (edVal !== null && !isValidDate(edVal)) return createError('Geçersiz tarih', 422, 'VALIDATION_ERROR');
        finalEnd = edVal === null ? null : edVal;
      }

      if (finalStart && finalEnd && finalEnd < finalStart) {
        return createError('Bitiş tarihi başlangıç tarihinden önce olamaz', 422, 'VALIDATION_ERROR');
      }

      if ('notes' in bodyObj) {
        const notesVal = bodyObj.notes;
        if (notesVal !== null) {
          if (typeof notesVal !== 'string' || Array.from(notesVal).length > 3000) return createError('notes geçersiz', 422, 'VALIDATION_ERROR');
        }
        finalNotes = notesVal === null ? null : notesVal;
      }

      program.title = finalTitle;
      program.status = finalStatus;
      program.start_date = finalStart;
      program.end_date = finalEnd;
      program.notes = finalNotes;
      
      program.updated_at = new Date().toISOString();
      return createResponse({ data: { success: true } });
    }

    if (method === 'DELETE') {
      if (program.deleted_at !== null) {
        return createError('Program bulunamadı.', 404, 'NOT_FOUND');
      }
      program.deleted_at = new Date().toISOString();
      return createResponse({ data: { success: true } });
    }
  }

  if (path.match(/^\/api\/admin\/training-programs\/[1-9]\d*\/restore$/) && method === 'POST') {
    const programId = parseInt(path.split('/')[4], 10);
    const program = mockPrograms.find(p => p.id === programId);
    if (!program) return createError('Program bulunamadı', 404, 'NOT_FOUND');
    if (program.deleted_at === null) {
      return createError('Program silinmemiş.', 409, 'PROGRAM_NOT_ARCHIVED');
    }
    program.deleted_at = null;
    return createResponse({ data: { success: true } });
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
