import fs from 'fs';

const path = 'src/admin/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = 'SO3 PT Control paneline hoş geldiniz.</p>\n      </div>';
const replacement = `SO3 PT Control paneline hoş geldiniz.</p>
      </div>

      {isAdmin && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-white">Operasyon Özeti</h3>
          {opLoading ? (
             <div className="text-white/50 text-sm">Operasyonel veriler yükleniyor...</div>
          ) : opError ? (
             <div className="text-red-400 text-sm">{opError}</div>
          ) : opData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Aktif Üyeler</div>
                <div className="text-2xl font-bold text-white">{opData.active_members}</div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">İçerideki Üye</div>
                <div className="text-2xl font-bold text-white">{opData.current_occupancy}</div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Bugünkü Ziyaret</div>
                <div className="text-2xl font-bold text-white">{opData.visits_today}</div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Bugünkü Yenilemeler</div>
                <div className="text-2xl font-bold text-white">{opData.renewals_today}</div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Bugünkü Randevular</div>
                <div className="text-2xl font-bold text-white mb-2">{opData.appointments_today.total}</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/50">
                  <div>Bkl: <span className="text-white/80">{opData.appointments_today.scheduled}</span></div>
                  <div>Tml: <span className="text-white/80">{opData.appointments_today.completed}</span></div>
                  <div>İpt: <span className="text-white/80">{opData.appointments_today.cancelled}</span></div>
                  <div>GelM: <span className="text-white/80">{opData.appointments_today.no_show}</span></div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
