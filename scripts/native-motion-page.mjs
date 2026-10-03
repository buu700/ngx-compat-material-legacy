import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const templatePath = join(dirname(fileURLToPath(import.meta.url)), 'native-motion-consumer.ts');

export function motionSource(zoneless) {
  const raw = readFileSync(templatePath, 'utf8');
  if (raw.includes('.detectChanges(') || raw.includes('@angular/animations') || raw.includes('markForCheck(')) {
    throw new Error('native-motion consumer uses a change-detection stand-in');
  }
  return raw
    .replace('/*ZONE_IMPORT*/', zoneless ? '' : "import 'zone.js';\n")
    .replace('/*ZONE_NAMED*/', zoneless ? ', provideZonelessChangeDetection' : '')
    .replace('/*ZONE_PROVIDER*/', zoneless ? 'provideZonelessChangeDetection(), ' : '');
}
