#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Write proposal data only. Never writes a product, gate, helper or registry file."""
from pathlib import Path
import difflib
import hashlib
import json
import re

ROOT=Path(__file__).resolve().parents[2]
PREFIX='compatibility/rc/parallel-checkbox-button-public-bridge-'
VERSION='v3'
WORKSHEET=json.loads((ROOT/(PREFIX+'worksheet-v1.json')).read_bytes())

def change(text,before,after):
    assert text.count(before)==1,(before[:100],text.count(before))
    return text.replace(before,after,1)

def checkbox(before):
    text=change(before,"@use 'sass:map';","@use 'sass:map';\n@use '@angular/material' as mat;\n@use '../vendor/mdc/theme/theme-color' as mdc-theme-color;\n@use '../vendor/mdc/typography/typography' as mdc-typography;\n@use '../vendor/mdc/touch-target/touch-target' as mdc-touch-target;")
    color_keys=['disabled-selected-icon-color','disabled-unselected-icon-color','selected-checkmark-color','selected-focus-icon-color','selected-hover-icon-color','selected-icon-color','selected-pressed-icon-color','unselected-focus-icon-color','unselected-hover-icon-color','unselected-icon-color','selected-focus-state-layer-color','selected-hover-state-layer-color','selected-pressed-state-layer-color','unselected-focus-state-layer-color','unselected-hover-state-layer-color','unselected-pressed-state-layer-color']
    base_keys=['disabled-selected-checkmark-color','selected-focus-state-layer-opacity','selected-hover-state-layer-opacity','selected-pressed-state-layer-opacity','unselected-focus-state-layer-opacity','unselected-hover-state-layer-opacity','unselected-pressed-state-layer-opacity']
    function="""// The finite public bridge uses the owned16 values without forwarding an open token map.
// The public API omits unselected-pressed-icon; combined pressed states need lifecycle proof.
@function _current-color-tokens($config) {
  $color: tokens-mdc-checkbox.get-color-tokens($config);
  $base: tokens-mdc-checkbox.get-unthemable-tokens();
  @return (
"""+''.join(f'    {key}: map.get($color, {key}),\n' for key in color_keys)+''.join(f'    {key}: map.get($base, {key}),\n' for key in base_keys)+"""    disabled-label-color: theming.get-color-from-palette(map.get($config, foreground), disabled-text),
  );
}

"""
    text=change(text,'@mixin color($config-or-theme) {',function+'@mixin color($config-or-theme) {')
    for config in ('$config','$primary-config','$warn-config'):
        anchor=f'@include mdc-checkbox-theme.theme(tokens-mdc-checkbox.get-color-tokens({config}));'
        indent='    ' if config=='$config' else '      '
        text=change(text,anchor,anchor+'\n'+indent+f'@include mat.checkbox-overrides(_current-color-tokens({config}));')
    anchor='      @include mdc-form-field.core-styles($query: mdc-helpers.$mdc-theme-styles-query);'
    text=change(text,anchor,anchor+"""
      @include mat.checkbox-overrides((
        label-text-color: mdc-theme-color.prop-value(text-primary-on-background),
      ));""")
    anchor='      @include mdc-form-field.core-styles($query: mdc-helpers.$mdc-typography-styles-query);'
    text=change(text,anchor,anchor+"""
      $label: map.get(mdc-typography.$styles, body2);
      @include mat.checkbox-overrides((
        label-text-font: map.get($label, font-family),
        label-text-line-height: map.get($label, line-height),
        label-text-size: map.get($label, font-size),
        label-text-tracking: map.get($label, letter-spacing),
        label-text-weight: map.get($label, font-weight),
      ));""")
    anchor='    @include mdc-checkbox-theme.theme(tokens-mdc-checkbox.get-density-tokens($density-scale));'
    text=change(text,anchor,anchor+"""
    @include mat.checkbox-overrides((
      state-layer-size: map.get(tokens-mdc-checkbox.get-density-tokens($density-scale), state-layer-size),
      touch-target-size: mdc-touch-target.$height,
      touch-target-display: block,
    ));
    @include mdc-helpers.if-touch-targets-unsupported($density-scale) {
      @include mat.checkbox-overrides((touch-target-display: none));
    }""")
    return text

def button(before):
    text=change(before,"@use 'sass:map';","@use 'sass:map';\n@use '@angular/material' as mat;\n@use '../vendor/mdc/ripple/ripple-theme' as mdc-ripple-theme;\n@use '../vendor/mdc/elevation/elevation-theme' as mdc-elevation-theme;\n@use '../vendor/mdc/typography/typography' as mdc-typography;\n@use '../vendor/mdc/density/density' as mdc-density;\n@use '../vendor/mdc/touch-target/touch-target' as mdc-touch-target;")
    helpers="""// These lists are finite: the four button variants accepted by the owned16 source API.
@mixin _current-ripple-color($variants, $color, $opacities) {
  $tokens: ();
  @each $variant in $variants {
    $tokens: map.merge($tokens, (
      '#{$variant}-state-layer-color': $color,
      '#{$variant}-disabled-state-layer-color': $color,
      '#{$variant}-ripple-color': rgba($color, 0.1),
      '#{$variant}-hover-state-layer-opacity': map.get($opacities, hover),
      '#{$variant}-focus-state-layer-opacity': map.get($opacities, focus),
      '#{$variant}-pressed-state-layer-opacity': map.get($opacities, press),
    ));
  }
  @include mat.button-overrides($tokens);
}

@mixin _current-ripple-theme-styles($config, $is-filled, $variants) {
  $opacities: if(map.get($config, is-dark),
    mdc-ripple-theme.$light-ink-opacities, mdc-ripple-theme.$dark-ink-opacities);
  @include _current-ripple-color($variants, mdc-theme-color.prop-value(on-surface), $opacities);
  &.mat-primary {
    @include _current-ripple-color($variants,
      mdc-theme-color.prop-value(if($is-filled, on-primary, primary)), $opacities);
  }
  &.mat-accent {
    @include _current-ripple-color($variants,
      mdc-theme-color.prop-value(if($is-filled, on-secondary, secondary)), $opacities);
  }
  &.mat-warn {
    @include _current-ripple-color($variants,
      mdc-theme-color.prop-value(if($is-filled, on-error, error)), $opacities);
  }
}

@function _current-density-tokens($height, $display) {
  $tokens: ();
  @each $variant in (text, filled, protected, outlined) {
    $tokens: map.merge($tokens, (
      '#{$variant}-container-height': $height,
      '#{$variant}-touch-target-size': mdc-touch-target.$height,
      '#{$variant}-touch-target-display': $display,
    ));
  }
  @return $tokens;
}

"""
    text=change(text,'@mixin _button-variant($color) {',helpers+'@mixin _button-variant($color) {')
    patterns=[('_button-variant','text','label-text-color: $color'),('_unelevated-button-variant','filled','container-color: $background,\n    label-text-color: $foreground'),('_raised-button-variant','protected','container-color: $background,\n    label-text-color: $foreground'),('_outlined-button-variant','outlined','label-text-color: $color')]
    for name,kind,properties in patterns:
        hit=re.search(r'@mixin '+re.escape(name)+r'\([^\n]*\) \{[\s\S]*?\n\}',text);assert hit
        old=hit.group(0);entries=properties.replace('container-color:',kind+'-container-color:').replace('label-text-color:',kind+'-label-text-color:')
        addition='  @include mat.button-overrides((\n    '+entries+',\n  ));\n'
        text=change(text,old,old[:-2]+'\n'+addition+'}')
    disabled={
      'text':['disabled-label-text-color: $disabled-ink-color'],
      'filled':['disabled-label-text-color: $disabled-ink-color','disabled-container-color: $disabled-container-color'],
      'protected':['disabled-label-text-color: $disabled-ink-color','disabled-container-color: $disabled-container-color','container-elevation-shadow: mdc-elevation-theme.elevation-box-shadow(2)','hover-container-elevation-shadow: mdc-elevation-theme.elevation-box-shadow(4)','focus-container-elevation-shadow: mdc-elevation-theme.elevation-box-shadow(4)','pressed-container-elevation-shadow: mdc-elevation-theme.elevation-box-shadow(8)','disabled-container-elevation-shadow: mdc-elevation-theme.elevation-box-shadow(0)'],
      'outlined':['disabled-label-text-color: $disabled-ink-color','outline-color: rgba($on-surface, 0.12)','disabled-outline-color: rgba($on-surface, 0.12)'],
    }
    selectors={'text':'mat-mdc-button','filled':'mat-mdc-unelevated-button','protected':'mat-mdc-raised-button','outlined':'mat-mdc-outlined-button'}
    for kind,values in disabled.items():
        anchor='    .'+selectors[kind]+' {\n';entries='\n'.join('        '+kind+'-'+value+',' for value in values)
        text=change(text,anchor,anchor+'      @include mat.button-overrides((\n'+entries+'\n      ));\n')
    matches=list(re.finditer(r'      @include button-theme-private.apply-disabled-style\(\) \{[\s\S]*?\n      \}',text));assert len(matches)==4
    maps={
     'text':['disabled-label-text-color: $disabled-ink-color','label-text-color: $disabled-ink-color'],
     'filled':['disabled-container-color: $disabled-container-color','disabled-label-text-color: $disabled-ink-color','container-color: $disabled-container-color','label-text-color: $disabled-ink-color'],
     'protected':['disabled-container-color: $disabled-container-color','disabled-label-text-color: $disabled-ink-color','container-color: $disabled-container-color','label-text-color: $disabled-ink-color','container-elevation-shadow: mdc-elevation-theme.elevation-box-shadow(0)','disabled-container-elevation-shadow: mdc-elevation-theme.elevation-box-shadow(0)'],
     'outlined':['label-text-color: $disabled-ink-color','disabled-label-text-color: $disabled-ink-color','outline-color: rgba($on-surface, 0.12)','disabled-outline-color: rgba($on-surface, 0.12)'],
    }
    for hit,kind in reversed(list(zip(matches,['text','filled','protected','outlined']))):
        old=hit.group(0);addition='        @include mat.button-overrides((\n'+''.join('          '+kind+'-'+value+',\n' for value in maps[kind])+'        ));\n'
        text=text[:hit.start()]+old[:-8]+'\n'+addition+'      }'+text[hit.end():]
    for filled,variants in [('false','(text, outlined)'),('true','(protected, filled)')]:
        anchor=f'      @include button-theme-private.ripple-theme-styles($config, {filled});'
        text=change(text,anchor,anchor+f'\n      @include _current-ripple-theme-styles($config, {filled}, {variants});')
    anchor='    @include mdc-button.without-ripple($query: mdc-helpers.$mdc-typography-styles-query);'
    text=change(text,anchor,anchor+"""
    $label: map.get(mdc-typography.$styles, button);
    @each $variant in (text, filled, protected, outlined) {
      @include mat.button-overrides((
        '#{$variant}-label-text-font': map.get($label, font-family),
        '#{$variant}-label-text-size': map.get($label, font-size),
        '#{$variant}-label-text-tracking': map.get($label, letter-spacing),
        '#{$variant}-label-text-weight': map.get($label, font-weight),
        '#{$variant}-label-text-transform': map.get($label, text-transform),
      ));
    }""")
    anchor='      @include button-theme-private.touch-target-density($density-scale);'
    text=change(text,anchor,anchor+"""
      $height: mdc-density.prop-value(mdc-button-theme.$density-config, $density-scale, height);
      @include mat.button-overrides(_current-density-tokens($height, block));
      @include mdc-helpers.if-touch-targets-unsupported($density-scale) {
        @include mat.button-overrides(_current-density-tokens($height, none));
      }""")
    return text

if __name__=='__main__':
    rows=[];patch=[]
    for entry in WORKSHEET['preimages']['21.x']:
        raw=(ROOT/entry['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==entry['sha256'] and len(raw)==entry['bytes']
        family='checkbox' if '/checkbox/' in entry['path'] else 'button'
        before=raw.decode();after=globals()[family](before)
        operations=difflib.SequenceMatcher(None,before.splitlines(True),after.splitlines(True),autojunk=False).get_opcodes()
        assert all(op[0] in ('equal','insert') for op in operations),operations
        path=ROOT/(PREFIX+'proposed-'+family+'-theme-'+VERSION+'.scss');assert not path.exists();path.write_text(after)
        patch+=difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+entry['path'],tofile='b/'+entry['path'])
        rows.append(dict(target=entry['path'],before=entry,after=dict(path=str(path.relative_to(ROOT)),sha256=hashlib.sha256(after.encode()).hexdigest(),bytes=len(after.encode())),all_old_lines_preserved_in_order=True,added_lines=sum(e-s for kind,_,_,s,e in operations if kind=='insert')))
    path=ROOT/(PREFIX+'proposed-'+VERSION+'.diff');assert not path.exists();path.write_text(''.join(patch))
    out=ROOT/(PREFIX+'proposed-afterimages-'+VERSION+'.json');assert not out.exists();out.write_text(json.dumps(dict(schema_version=1,status='Proposal data only; no Sass parse/compile/product application',members=rows,patch=dict(path=str(path.relative_to(ROOT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),bytes=path.stat().st_size),fresh_compiles=0),indent=2)+'\n')
    print(json.dumps(rows))
