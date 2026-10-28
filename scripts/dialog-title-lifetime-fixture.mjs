/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Native DOM observations only; importing this fixture grants no browser credit. */
export const dialogTitleLifetimeFixture = `
class DialogTitleLifetimeState {
  readonly first = signal(true);
  readonly second = signal(true);
}
const dialogTitleLifetimeTemplate = \`
  <h2 mat-dialog-title id="legacy-title-lifetime-first" *ngIf="state.first()" data-lifetime-title="first">First title</h2>
  <h2 mat-dialog-title *ngIf="state.second()" data-lifetime-title="second">Second title</h2>
  <p data-lifetime-content>Title lifecycle content</p>
\`;
@Component({standalone:false, selector:'lab-dialog-title-body',
  changeDetection:ChangeDetectionStrategy.OnPush, template:dialogTitleLifetimeTemplate})
export class DialogTitleLifetimeBody {
  readonly state = inject<DialogTitleLifetimeState>(MAT_LEGACY_DIALOG_DATA);
}
@Component({standalone:false, selector:'lab-dialog-title-lifetime',
  changeDetection:ChangeDetectionStrategy.OnPush,
  template: \`<ng-template #titleTemplate>\${dialogTitleLifetimeTemplate}</ng-template>\`})
export class DialogTitleLifetimeLab {
  private readonly dialog = inject(MatLegacyDialog);
  @ViewChild('titleTemplate', {static:true}) template!:TemplateRef<unknown>;
  state = new DialogTitleLifetimeState();
  private busy = false;
  async run():Promise<unknown> {
    if (this.busy) throw Error('Title lifetime observation already active');
    this.busy = true;
    const scenarios:unknown[] = [];
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const wait = async (predicate:()=>boolean, message:string) => {
      const started = performance.now();
      while (!predicate()) {
        if (performance.now()-started>1500) throw Error(message);
        await frame();
      }
      await frame();
    };
    try {
      for (const mode of ['component','template'] as const) {
        for (const priority of ['titles','labelledby','label'] as const) {
          const state = this.state = new DialogTitleLifetimeState();
          const config = {data:state,autoFocus:false,restoreFocus:false,
            enterAnimationDuration:'0ms',exitAnimationDuration:'0ms',
            ...(priority==='titles'?{}:{ariaLabelledBy:'legacy-title-configured'}),
            ...(priority==='label'?{ariaLabel:'Explicit title label'}:{})};
          const ref = mode==='component'?this.dialog.open(DialogTitleLifetimeBody,config):this.dialog.open(this.template,config);
          const steps:unknown[] = [];
          try {
            await wait(()=>!!document.getElementById(ref.id)?.querySelector('[data-lifetime-content]'),'Title dialog did not render');
            const container = document.getElementById(ref.id)!;
            const observe = async (step:string, expectedFirst:boolean, expectedSecond:boolean, labelledTitle:'first'|'second'|null) => {
              const read = () => {
                const first = container.querySelector('[data-lifetime-title="first"]');
                const second = container.querySelector('[data-lifetime-title="second"]');
                return {first:first?.id??null,second:second?.id??null,
                  labelledby:container.getAttribute('aria-labelledby'),label:container.getAttribute('aria-label')};
              };
              await wait(()=>{
                const value=read(),expected=priority==='label'?null:priority==='labelledby'?'legacy-title-configured':labelledTitle?value[labelledTitle]:null;
                return !!value.first===expectedFirst && !!value.second===expectedSecond && value.labelledby===expected;
              },'Stale rendered title label at '+mode+'/'+priority+'/'+step);
              steps.push({step,...read()});
            };
            await observe('initial',true,true,'first');
            state.first.set(false);await observe('first-removed',false,true,'second');
            state.second.set(false);await observe('all-removed',false,false,null);
            state.second.set(true);await observe('second-returned',false,true,'second');
            state.first.set(true);await observe('first-appended',true,true,'second');
            state.second.set(false);await observe('second-removed',true,false,'first');
            state.first.set(false);await observe('empty-again',false,false,null);
            scenarios.push({mode,priority,steps});
          } finally {
            ref.close();
            await wait(()=>!document.getElementById(ref.id),'Title dialog did not close');
          }
        }
      }
      return {scenarios};
    } finally {this.busy = false;}
  }
}
`;

/** Check measured labels, ordering and live element identities; never trust a pass flag. */
export function legacyDialogTitleLifetimeNativeOkay(value) {
  if (!value || !Array.isArray(value.scenarios) || value.scenarios.length !== 6) return false;
  const steps=['initial','first-removed','all-removed','second-returned','first-appended','second-removed','empty-again'];
  const presence=[[true,true],[false,true],[false,false],[false,true],[true,true],[true,false],[false,false]];
  const active=['first','second',null,'second','second','first',null];
  const seen=new Set();
  for (const scenario of value.scenarios) {
    if (!scenario || !['component','template'].includes(scenario.mode) || !['titles','labelledby','label'].includes(scenario.priority)) return false;
    const key=scenario.mode+'/'+scenario.priority;if(seen.has(key))return false;seen.add(key);
    if (!Array.isArray(scenario.steps) || scenario.steps.length!==steps.length) return false;
    let firstSecondId=null;
    for (let i=0;i<steps.length;i++) {
      const row=scenario.steps[i];if (!row || row.step!==steps[i]) return false;
      for (const [index,name] of ['first','second'].entries()) {
        if (presence[i][index]) {
          if (typeof row[name]!=='string' || !row[name]) return false;
          if (name==='first' && row[name]!=='legacy-title-lifetime-first') return false;
          if (name==='second' && !/^mat-dialog-title-\d+$/.test(row[name])) return false;
        } else if (row[name]!==null) return false;
      }
      if(i===0)firstSecondId=row.second;
      if((i===3||i===4) && row.second===firstSecondId)return false;
      if(i===4 && row.second!==scenario.steps[3].second)return false;
      const expected=scenario.priority==='label'?null:scenario.priority==='labelledby'?'legacy-title-configured':active[i]?row[active[i]]:null;
      if(row.labelledby!==expected || row.label!==(scenario.priority==='label'?'Explicit title label':null))return false;
    }
  }
  return seen.size===6;
}
