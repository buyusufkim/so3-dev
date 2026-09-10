const fs = require('fs');
let content = fs.readFileSync('src/admin/pages/members/AdminMemberEditor.tsx', 'utf8');

content = content.replace(
    /import \{ MemberRenewalsPanel \} from "\.\/MemberRenewalsPanel";/,
    'import { MemberRenewalsPanel } from "./MemberRenewalsPanel";\nimport { MemberSessionPackagesPanel } from "./MemberSessionPackagesPanel";'
);

content = content.replace(
    /const \[activeTab, setActiveTab\] = useState\<'info' \| 'visits' \| 'renewals'\>\('info'\);/,
    "const [activeTab, setActiveTab] = useState<'info' | 'visits' | 'renewals' | 'session-packages'>('info');"
);

content = content.replace(
    /<button\s+onClick=\{\(\) => setActiveTab\('renewals'\)\}[\s\S]*?Yenileme Geçmişi\s+<\/button>/,
    `<button
            onClick={() => setActiveTab('renewals')}
            className={\`pb-3 text-sm font-medium transition-colors border-b-2 \${activeTab === 'renewals' ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/70'}\`}
          >
            Yenileme Geçmişi
          </button>
          <button
            onClick={() => setActiveTab('session-packages')}
            className={\`pb-3 text-sm font-medium transition-colors border-b-2 \${activeTab === 'session-packages' ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/70'}\`}
          >
            Seans Paketleri
          </button>`
);

content = content.replace(
    /\{activeTab === 'renewals' && id && \([\s\S]*?<\/div>\s*\)\}/,
    `{activeTab === 'renewals' && id && (
        <div className="bg-[#121212] border border-white/10 rounded-lg">
          <MemberRenewalsPanel memberId={id} />
        </div>
      )}

      {activeTab === 'session-packages' && id && (
        <div className="bg-[#121212] border border-white/10 rounded-lg p-6">
          <MemberSessionPackagesPanel memberId={parseInt(id, 10)} />
        </div>
      )}`
);

fs.writeFileSync('src/admin/pages/members/AdminMemberEditor.tsx', content);
