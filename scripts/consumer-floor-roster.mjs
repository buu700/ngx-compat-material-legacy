/** Finite floor cases from reviewed source policy, before candidate execution. */
export function floorConfigurations(plan, line, manifest) {
  const row = plan.lines?.[line];
  if (plan.schema_version !== 1 || !row || !['main', '21.x'].includes(line)) throw new Error('unsupported floor plan/line');
  const expectedMajor = line === 'main' ? '22' : '21';
  if (manifest.version.split('.')[0] !== expectedMajor) throw new Error('floor plan line does not match source package');
  const advertised = manifest.engines.node.split('||').map(part => part.trim());
  if (JSON.stringify(advertised) !== JSON.stringify(row.library_node_minima.map(version => `^${version}`))) {
    throw new Error('advertised Node ranges changed; review the floor plan');
  }
  for (const [name, version] of [['core', row.framework], ['common', row.framework], ['forms', row.framework],
    ['platform-browser', row.framework], ['cdk', row.cdk], ['material', row.material]]) {
    if (manifest.peerDependencies[`@angular/${name}`] !== `^${version}`) throw new Error(`advertised ${name} floor changed`);
  }
  if (manifest.peerDependencies.rxjs !== plan.rxjs_minima.map(version => `^${version}`).join(' || ')) {
    throw new Error('advertised RxJS ranges changed; review the floor plan');
  }
  const configurations = row.library_node_minima.flatMap(node => plan.rxjs_minima.map(rxjs => ({
    group: 'library-runtime', case_id: `library/node-${node}/rxjs-${rxjs}/ts-${row.typescript_minimum}`,
    node, rxjs, typescript: row.typescript_minimum, ...row,
  })));
  configurations.push({group: 'library-runtime', case_id: 'library/current-supported-configuration',
    ...row, ...plan.current_configuration, typescript: plan.current_configuration.typescript_by_line[line]});
  for (const node of plan.cli_node_versions) configurations.push({group: 'cli-runtime-floors', case_id: `cli/node-${node}`, node});
  for (const configuration of configurations) {
    const pin = plan.node_sources[configuration.node];
    const filename = `node-v${configuration.node}-${plan.runtime_platform}.tar.xz`;
    if (!pin || !/^[0-9a-f]{64}$/.test(pin.sha256)
      || pin.url !== `https://nodejs.org/dist/v${configuration.node}/${filename}`) throw new Error('unqualified exact Node binary');
  }
  if (new Set(configurations.map(item => item.case_id)).size !== configurations.length) throw new Error('duplicate floor configuration');
  return configurations;
}

// Investigation of a proposed peer floor. Never part of the advertised roster.
export const RXJS_CANDIDATE = Object.freeze({version:'7.5.5',integrity:'sha512-sy+H0pQofO95VDmFLzyaw9xNJU4KTRSwQIGM6+iG3SypAtCiLDzpeG8sJrNCWn2Up9km+KhkvTdbkrdy+yzZdw=='});
export function candidateFloorConfigurations(plan,line,manifest) {
  return floorConfigurations(plan,line,manifest)
    .filter(c=>c.group==='library-runtime'&&c.rxjs==='7.4.0')
    .map(c=>({...c,group:'candidate-peer-experiment',case_id:`experiment/node-${c.node}/rxjs-${RXJS_CANDIDATE.version}/ts-${c.typescript}`,
      rxjs:RXJS_CANDIDATE.version,rxjs_integrity:RXJS_CANDIDATE.integrity,advertised_rxjs:manifest.peerDependencies.rxjs,acceptance_credit:false}));
}
