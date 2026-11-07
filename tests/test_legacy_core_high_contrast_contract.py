"""Missing modes, wrong CSS and incomplete native ripple states must fail."""
import subprocess
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]

class LegacyCoreHighContrastAssessment(unittest.TestCase):
    def test_modes_lifecycle_fallback_and_consumed_style_negatives_are_required(self):
        code=r'''
import assert from 'node:assert/strict';
import {assessLegacyCoreHighContrast,legacyCoreHighContrastOkay} from './scripts/legacy-core-high-contrast-contract.mjs';
const life={lifecycle:['FADING_IN','VISIBLE','FADING_OUT','HIDDEN'],connected:[true,true,true,false]};
const wrong={found:true,ripple_display:'block',focus_display:'none',submenu_fill:'rgb(8, 9, 10)'};
const positive={found:true,ripple_display:'none',focus_display:'block',submenu_fill:'rgb(0, 0, 0)',canvas_color:'rgb(0, 0, 0)',negative:wrong,...life,
 fallback:{initial_state:'FADING_IN',initial_connected:true,final_state:'HIDDEN',final_connected:false,wait_completed:true},
 persistent:{initial_state:'FADING_IN',initial_connected:true,visible_state:'VISIBLE',visible_connected:true,visible_wait_completed:true,dismissed_state:'FADING_OUT',dismissed_connected:true,final_state:'HIDDEN',final_connected:false,hidden_wait_completed:true}};
const body={normal:{found:true,media_active:false,class_active:false,ripple_display:'block',focus_display:'none',submenu_fill:'rgb(1, 2, 3)',...life},
 historical_class:{...structuredClone(positive),media_active:false,class_active:true},
 forced_colors:{...structuredClone(positive),media_active:true,class_active:false}};
assert.equal(legacyCoreHighContrastOkay(body),true);assert.equal(legacyCoreHighContrastOkay({}),false);
for(const mutate of [b=>delete b.normal,b=>delete b.historical_class,b=>delete b.forced_colors,
 b=>b.normal.ripple_display='none',b=>b.normal.focus_display='block',b=>b.normal.submenu_fill='rgb(0, 0, 0)',
 b=>b.historical_class.media_active=true,b=>b.historical_class.class_active=false,
 b=>b.forced_colors.media_active=false,b=>b.forced_colors.class_active=true,
 b=>b.historical_class.ripple_display='block',b=>b.historical_class.focus_display='none',b=>b.historical_class.submenu_fill='rgb(1, 2, 3)',
 b=>b.historical_class.negative={...b.historical_class},b=>b.forced_colors.negative={...b.forced_colors},
 b=>b.normal.lifecycle=['VISIBLE','HIDDEN'],b=>b.historical_class.connected=[true,true,true,true],
 b=>b.forced_colors.lifecycle=['FADING_IN','VISIBLE','FADING_OUT','VISIBLE'],
 b=>delete b.historical_class.fallback,b=>b.forced_colors.fallback.final_connected=true,
 b=>b.historical_class.fallback.wait_completed=false,b=>b.forced_colors.fallback.initial_state='HIDDEN',
 b=>delete b.forced_colors.persistent,b=>b.historical_class.persistent.visible_state='HIDDEN',
 b=>b.forced_colors.persistent.dismissed_state='VISIBLE',b=>b.historical_class.persistent.final_connected=true,
 b=>b.forced_colors.persistent.hidden_wait_completed=false,b=>b.error='media emulation failed']){
 const b=structuredClone(body);mutate(b);assert.equal(legacyCoreHighContrastOkay(b),false);
}
assert.deepEqual(assessLegacyCoreHighContrast(body).map(r=>r.case_id),['legacy-core/high-contrast/historical-class','legacy-core/high-contrast/forced-colors','legacy-core/ripple/high-contrast-lifecycle']);
'''
        r=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)

if __name__=='__main__':unittest.main()
