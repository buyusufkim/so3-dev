const fs = require('fs');
let code = fs.readFileSync('src/admin/pages/member-progress/AdminMemberProgressPage.tsx', 'utf8');

// 1. Remove setActiveMutation(null) from clearDetailSelection
code = code.replace(/setMutationError\(null\);\n    setActiveMutation\(null\);/g, 'setMutationError(null);');

// 2. Fix error messages in handleArchive and handleRestore
code = code.replace(/else setMutationError\(err\.message\);/g, "else setMutationError('İşlem tamamlanamadı. Lütfen tekrar deneyin.');");

// 3. Fix disabled state of archive button
const archiveButtonAnchor = `disabled={activeMutation?.id === selectedMeasurement.id && activeMutation?.action === 'archive'}`;
const archiveButtonReplacement = `disabled={activeMutation !== null}`;
code = code.replace(archiveButtonAnchor, archiveButtonReplacement);

// 4. Fix disabled state of restore button
const restoreButtonAnchor = `disabled={activeMutation?.id === m.id && activeMutation?.action === 'restore'}`;
const restoreButtonReplacement = `disabled={activeMutation !== null}`;
code = code.replace(restoreButtonAnchor, restoreButtonReplacement);

// 5. Render mutationError
const gridAnchor = `      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`;
const gridReplacement = `      ) : (
        <>
          {mutationError && (
            <div role="alert" className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {mutationError}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`;
code = code.replace(gridAnchor, gridReplacement);

const endGridAnchor = `          </div>
        </div>
      )}`;
const endGridReplacement = `          </div>
        </div>
        </>
      )}`;
code = code.replace(endGridAnchor, endGridReplacement);

fs.writeFileSync('src/admin/pages/member-progress/AdminMemberProgressPage.tsx', code);
console.log('Patched');
