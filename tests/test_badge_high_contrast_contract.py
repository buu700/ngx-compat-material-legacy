"""Badge high contrast needs real mode/control and consumed wrong-style witnesses."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]

class BadgeHighContrastAssessment(unittest.TestCase):
    def test_missing_noop_wrong_media_or_unconsumed_negative_fails(self):
        code=r'''
import assert from 'node:assert/strict';
import {assessBadgeHighContrast} from './scripts/badge-high-contrast-contract.mjs';
const good={found:true,radius:'0px',outline_width:'1px',outline_style:'solid'};
const wrong={found:true,radius:'13px',outline_width:'5px',outline_style:'solid'};
const body={historical_class:{media_active:false,normal:{found:true,radius:'50%'},active:good,negative:wrong},
 forced_colors:{media_active:true,oracle:good,candidate:good,bridge:good,negative:wrong}};
const passes=b=>assessBadgeHighContrast(b).every(r=>r.result==='pass');
assert.equal(passes(body),true);assert.equal(passes({}),false);
for(const mutate of [b=>delete b.historical_class,b=>delete b.forced_colors,
 b=>b.historical_class.media_active=true,b=>b.historical_class.normal.radius='0px',
 b=>b.historical_class.active.found=false,b=>b.historical_class.negative={...good},
 b=>b.forced_colors.media_active=false,b=>b.forced_colors.media_active='true',
 b=>delete b.forced_colors.oracle,b=>b.forced_colors.bridge.radius='50%',
 b=>b.forced_colors.candidate.outline_style='none',b=>b.forced_colors.negative={...good},
 b=>b.error='emulation unavailable']){
 const b=structuredClone(body);mutate(b);assert.equal(passes(b),false);
}
process.stdout.write(JSON.stringify(assessBadgeHighContrast(body).map(r=>r.case_id)));
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout),['badge/high-contrast/historical-class','badge/high-contrast/forced-colors'])
