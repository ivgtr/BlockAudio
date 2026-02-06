import type { GraphNode, Connection } from '../types/audio';

/**
 * ビジュアルグラフの状態から、対応する Web Audio API の JavaScript コードを生成する。
 */
export function generateCode(
  nodes: GraphNode[],
  connections: Connection[]
): string {
  if (nodes.length === 0) return '// ノードを追加して接続してください';

  const lines: string[] = [];
  const varNames = new Map<string, string>();
  const counters: Record<string, number> = {};

  // 変数名の生成
  for (const node of nodes) {
    if (node.type === 'destination') {
      varNames.set(node.id, 'ctx.destination');
      continue;
    }
    const base = node.type;
    counters[base] = (counters[base] ?? 0) + 1;
    const suffix = counters[base] > 1 ? String(counters[base]) : '';
    varNames.set(node.id, `${base}${suffix}`);
  }

  lines.push('const ctx = new AudioContext();');
  lines.push('');

  // ノード生成
  for (const node of nodes) {
    if (node.type === 'destination') continue;

    const varName = varNames.get(node.id)!;

    switch (node.type) {
      case 'oscillator': {
        lines.push(`const ${varName} = ctx.createOscillator();`);
        lines.push(`${varName}.type = '${node.params.type ?? 'sine'}';`);
        lines.push(
          `${varName}.frequency.value = ${node.params.frequency ?? 440};`
        );
        if (node.params.detune && node.params.detune !== 0) {
          lines.push(`${varName}.detune.value = ${node.params.detune};`);
        }
        break;
      }
      case 'gain': {
        lines.push(`const ${varName} = ctx.createGain();`);
        lines.push(`${varName}.gain.value = ${node.params.gain ?? 0.5};`);
        break;
      }
      case 'analyser': {
        lines.push(`const ${varName} = ctx.createAnalyser();`);
        lines.push(`${varName}.fftSize = ${node.params.fftSize ?? 2048};`);
        break;
      }
      case 'biquadFilter': {
        lines.push(`const ${varName} = ctx.createBiquadFilter();`);
        lines.push(
          `${varName}.type = '${node.params.type ?? 'lowpass'}';`
        );
        lines.push(
          `${varName}.frequency.value = ${node.params.frequency ?? 1000};`
        );
        lines.push(`${varName}.Q.value = ${node.params.Q ?? 1};`);
        break;
      }
      case 'delay': {
        lines.push(`const ${varName} = ctx.createDelay(5);`);
        lines.push(
          `${varName}.delayTime.value = ${node.params.delayTime ?? 0.5};`
        );
        break;
      }
      case 'stereoPanner': {
        lines.push(`const ${varName} = ctx.createStereoPanner();`);
        lines.push(`${varName}.pan.value = ${node.params.pan ?? 0};`);
        break;
      }
      case 'dynamicsCompressor': {
        lines.push(`const ${varName} = ctx.createDynamicsCompressor();`);
        lines.push(
          `${varName}.threshold.value = ${node.params.threshold ?? -24};`
        );
        lines.push(`${varName}.knee.value = ${node.params.knee ?? 30};`);
        lines.push(`${varName}.ratio.value = ${node.params.ratio ?? 12};`);
        lines.push(
          `${varName}.attack.value = ${node.params.attack ?? 0.003};`
        );
        lines.push(
          `${varName}.release.value = ${node.params.release ?? 0.25};`
        );
        break;
      }
    }
    lines.push('');
  }

  // 接続
  if (connections.length > 0) {
    for (const conn of connections) {
      const fromVar = varNames.get(conn.from.nodeId);
      const toVar = varNames.get(conn.to.nodeId);
      if (fromVar && toVar) {
        lines.push(`${fromVar}.connect(${toVar});`);
      }
    }
    lines.push('');
  }

  // Oscillator の start()
  const oscillators = nodes.filter((n) => n.type === 'oscillator');
  for (const osc of oscillators) {
    const varName = varNames.get(osc.id);
    if (varName) {
      lines.push(`${varName}.start();`);
    }
  }

  return lines.join('\n');
}
