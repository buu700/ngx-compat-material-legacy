"""Authentic location factory dynamic paths, absent documents and owned default shape."""
import hashlib,json,re,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ProgressLocationOwnershipTests(unittest.TestCase):
    def test_original_factory_dynamic_location_and_falsy_documents(self):
        ref=ROOT/'reference/material-16.2.14/error-helper-sources/progress-bar-location.ts'
        original=ref.read_text();self.assertEqual(hashlib.sha256(original.encode()).hexdigest(),'5019507c69b86e1076ddfdbc4f3b332ae883a945a40486592419e10f3a3b3b48')
        owned=(ROOT/'projects/ngx-material-legacy/legacy-progress-bar/internal/progress-bar-location.ts').read_text()
        body=lambda source:re.search(r'export function MAT_PROGRESS_BAR_LOCATION_FACTORY\(\): MatProgressBarLocation \{(.*?)\n\}',source,re.S)[1]
        self.assertEqual(body(owned),body(original))
        self.assertIn("'mat-progress-bar-location'",owned)
        self.assertIn("{providedIn: 'root', factory: MAT_PROGRESS_BAR_LOCATION_FACTORY}",owned)
        self.assertIn('getPathname: () => string;',owned)
        code="import assert from 'node:assert/strict';\nconst build=new Function('inject','DOCUMENT',"+json.dumps(body(owned))+r''');
const token=Symbol('document');
for(const document of [null,undefined,{location:null},{location:undefined}]) {
 const result=build(request=>{assert.equal(request,token);return document;},token);
 assert.equal(result.getPathname(),'');
}
const location={pathname:'/first(path)',search:'?q=1',hash:'#ignored'};
const result=build(()=>({location}),token);
assert.equal(result.getPathname(),'/first(path)?q=1');
const stale=result.getPathname();
location.pathname='/second';location.search='?changed=2';
assert.equal(result.getPathname(),'/second?changed=2');
assert.notEqual(result.getPathname(),stale,'cached pathname mutation must differ');
'''
        child=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(child.returncode,0,child.stderr or child.stdout)
        defaults=(ROOT/'projects/ngx-material-legacy/legacy-progress-bar/internal/progress-bar-defaults.ts').read_text()
        expected=(ROOT/'reference/material-16.2.14/error-helper-sources/progress-bar-defaults.ts').read_text()
        self.assertEqual(hashlib.sha256(expected.encode()).hexdigest(),'97b015110535a1e235eb29346aa847f1f98d26cf45ee4110e517b1c12055dbed')
        self.assertEqual(re.search(r'export interface MatProgressBarDefaultOptions \{.*?\n\}',defaults,re.S)[0],re.search(r'export interface MatProgressBarDefaultOptions \{.*?\n\}',expected,re.S)[0])
        self.assertIn("'MAT_PROGRESS_BAR_DEFAULT_OPTIONS'",defaults)
if __name__=='__main__':unittest.main()
