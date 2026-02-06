import type { GraphNode, Connection } from '../types/audio';

export interface Preset {
  id: string;
  name: string;
  description: string;
  nodes: GraphNode[];
  connections: Connection[];
}

export const PRESETS: Preset[] = [
  {
    id: 'hello-sound',
    name: '1. はじめての音',
    description:
      'OscillatorNodeからDestinationに直接つなぐ最小構成。AudioContextの基本を学びます。',
    nodes: [
      {
        id: 'osc_1',
        type: 'oscillator',
        position: { x: 100, y: 200 },
        params: { type: 'sine', frequency: 440, detune: 0 },
      },
      {
        id: 'destination_0',
        type: 'destination',
        position: { x: 500, y: 200 },
        params: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        from: { nodeId: 'osc_1', port: 'output' },
        to: { nodeId: 'destination_0', port: 'input' },
      },
    ],
  },
  {
    id: 'volume-control',
    name: '2. 音量を操る',
    description:
      'GainNodeを挟んで音量を制御します。gainの値(0〜1)で音量が変わることを確認してみましょう。',
    nodes: [
      {
        id: 'osc_1',
        type: 'oscillator',
        position: { x: 80, y: 200 },
        params: { type: 'sine', frequency: 440, detune: 0 },
      },
      {
        id: 'gain_1',
        type: 'gain',
        position: { x: 340, y: 200 },
        params: { gain: 0.3 },
      },
      {
        id: 'destination_0',
        type: 'destination',
        position: { x: 600, y: 200 },
        params: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        from: { nodeId: 'osc_1', port: 'output' },
        to: { nodeId: 'gain_1', port: 'input' },
      },
      {
        id: 'conn_2',
        from: { nodeId: 'gain_1', port: 'output' },
        to: { nodeId: 'destination_0', port: 'input' },
      },
    ],
  },
  {
    id: 'see-waveform',
    name: '3. 波形を見る',
    description:
      'AnalyserNodeを使って音声信号を可視化します。波形表示とスペクトラム表示を切り替えてみましょう。',
    nodes: [
      {
        id: 'osc_1',
        type: 'oscillator',
        position: { x: 60, y: 200 },
        params: { type: 'sawtooth', frequency: 220, detune: 0 },
      },
      {
        id: 'gain_1',
        type: 'gain',
        position: { x: 280, y: 200 },
        params: { gain: 0.3 },
      },
      {
        id: 'analyser_1',
        type: 'analyser',
        position: { x: 500, y: 120 },
        params: { fftSize: '2048' },
      },
      {
        id: 'destination_0',
        type: 'destination',
        position: { x: 500, y: 320 },
        params: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        from: { nodeId: 'osc_1', port: 'output' },
        to: { nodeId: 'gain_1', port: 'input' },
      },
      {
        id: 'conn_2',
        from: { nodeId: 'gain_1', port: 'output' },
        to: { nodeId: 'analyser_1', port: 'input' },
      },
      {
        id: 'conn_3',
        from: { nodeId: 'gain_1', port: 'output' },
        to: { nodeId: 'destination_0', port: 'input' },
      },
    ],
  },
  {
    id: 'filter-tone',
    name: '4. 音色フィルタ',
    description:
      'BiquadFilterNodeで倍音成分を削り、音色を変化させます。カットオフ周波数やQを動かして違いを聴いてみましょう。',
    nodes: [
      {
        id: 'osc_1',
        type: 'oscillator',
        position: { x: 60, y: 200 },
        params: { type: 'sawtooth', frequency: 220, detune: 0 },
      },
      {
        id: 'filter_1',
        type: 'biquadFilter',
        position: { x: 280, y: 200 },
        params: { type: 'lowpass', frequency: 800, Q: 5 },
      },
      {
        id: 'gain_1',
        type: 'gain',
        position: { x: 500, y: 200 },
        params: { gain: 0.3 },
      },
      {
        id: 'destination_0',
        type: 'destination',
        position: { x: 720, y: 200 },
        params: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        from: { nodeId: 'osc_1', port: 'output' },
        to: { nodeId: 'filter_1', port: 'input' },
      },
      {
        id: 'conn_2',
        from: { nodeId: 'filter_1', port: 'output' },
        to: { nodeId: 'gain_1', port: 'input' },
      },
      {
        id: 'conn_3',
        from: { nodeId: 'gain_1', port: 'output' },
        to: { nodeId: 'destination_0', port: 'input' },
      },
    ],
  },
  {
    id: 'echo-feedback',
    name: '5. エコーを作る',
    description:
      'DelayNodeでフィードバックループを構成し、エコー（残響）を作ります。delayTimeとフィードバックのgainを調整してみましょう。',
    nodes: [
      {
        id: 'osc_1',
        type: 'oscillator',
        position: { x: 60, y: 180 },
        params: { type: 'sine', frequency: 440, detune: 0 },
      },
      {
        id: 'gain_dry',
        type: 'gain',
        position: { x: 280, y: 120 },
        params: { gain: 0.4 },
      },
      {
        id: 'delay_1',
        type: 'delay',
        position: { x: 280, y: 280 },
        params: { delayTime: 0.3 },
      },
      {
        id: 'gain_fb',
        type: 'gain',
        position: { x: 500, y: 280 },
        params: { gain: 0.4 },
      },
      {
        id: 'gain_master',
        type: 'gain',
        position: { x: 560, y: 120 },
        params: { gain: 0.5 },
      },
      {
        id: 'destination_0',
        type: 'destination',
        position: { x: 780, y: 180 },
        params: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        from: { nodeId: 'osc_1', port: 'output' },
        to: { nodeId: 'gain_dry', port: 'input' },
      },
      {
        id: 'conn_2',
        from: { nodeId: 'osc_1', port: 'output' },
        to: { nodeId: 'delay_1', port: 'input' },
      },
      {
        id: 'conn_3',
        from: { nodeId: 'delay_1', port: 'output' },
        to: { nodeId: 'gain_fb', port: 'input' },
      },
      {
        id: 'conn_4',
        from: { nodeId: 'gain_fb', port: 'output' },
        to: { nodeId: 'delay_1', port: 'input' },
      },
      {
        id: 'conn_5',
        from: { nodeId: 'gain_fb', port: 'output' },
        to: { nodeId: 'gain_master', port: 'input' },
      },
      {
        id: 'conn_6',
        from: { nodeId: 'gain_dry', port: 'output' },
        to: { nodeId: 'gain_master', port: 'input' },
      },
      {
        id: 'conn_7',
        from: { nodeId: 'gain_master', port: 'output' },
        to: { nodeId: 'destination_0', port: 'input' },
      },
    ],
  },
  {
    id: 'additive-synth',
    name: '6. シンセサイザー',
    description:
      '複数のOscillatorNodeを異なる周波数で鳴らし、加算合成でリッチな音色を作ります。各オシレータの音量バランスを変えてみましょう。',
    nodes: [
      {
        id: 'osc_1',
        type: 'oscillator',
        position: { x: 60, y: 80 },
        params: { type: 'sine', frequency: 220, detune: 0 },
      },
      {
        id: 'osc_2',
        type: 'oscillator',
        position: { x: 60, y: 220 },
        params: { type: 'sine', frequency: 440, detune: 0 },
      },
      {
        id: 'osc_3',
        type: 'oscillator',
        position: { x: 60, y: 360 },
        params: { type: 'sine', frequency: 660, detune: 0 },
      },
      {
        id: 'gain_1',
        type: 'gain',
        position: { x: 300, y: 80 },
        params: { gain: 0.3 },
      },
      {
        id: 'gain_2',
        type: 'gain',
        position: { x: 300, y: 220 },
        params: { gain: 0.15 },
      },
      {
        id: 'gain_3',
        type: 'gain',
        position: { x: 300, y: 360 },
        params: { gain: 0.1 },
      },
      {
        id: 'gain_master',
        type: 'gain',
        position: { x: 540, y: 220 },
        params: { gain: 0.5 },
      },
      {
        id: 'destination_0',
        type: 'destination',
        position: { x: 760, y: 220 },
        params: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        from: { nodeId: 'osc_1', port: 'output' },
        to: { nodeId: 'gain_1', port: 'input' },
      },
      {
        id: 'conn_2',
        from: { nodeId: 'osc_2', port: 'output' },
        to: { nodeId: 'gain_2', port: 'input' },
      },
      {
        id: 'conn_3',
        from: { nodeId: 'osc_3', port: 'output' },
        to: { nodeId: 'gain_3', port: 'input' },
      },
      {
        id: 'conn_4',
        from: { nodeId: 'gain_1', port: 'output' },
        to: { nodeId: 'gain_master', port: 'input' },
      },
      {
        id: 'conn_5',
        from: { nodeId: 'gain_2', port: 'output' },
        to: { nodeId: 'gain_master', port: 'input' },
      },
      {
        id: 'conn_6',
        from: { nodeId: 'gain_3', port: 'output' },
        to: { nodeId: 'gain_master', port: 'input' },
      },
      {
        id: 'conn_7',
        from: { nodeId: 'gain_master', port: 'output' },
        to: { nodeId: 'destination_0', port: 'input' },
      },
    ],
  },
  {
    id: 'stereo-panning',
    name: '7. ステレオ空間',
    description:
      'StereoPannerNodeで左右の定位を制御します。panの値を-1(左)〜1(右)で動かして、音の位置が変わることを体感しましょう。',
    nodes: [
      {
        id: 'osc_1',
        type: 'oscillator',
        position: { x: 60, y: 200 },
        params: { type: 'square', frequency: 330, detune: 0 },
      },
      {
        id: 'gain_1',
        type: 'gain',
        position: { x: 280, y: 200 },
        params: { gain: 0.2 },
      },
      {
        id: 'panner_1',
        type: 'stereoPanner',
        position: { x: 500, y: 200 },
        params: { pan: -0.7 },
      },
      {
        id: 'destination_0',
        type: 'destination',
        position: { x: 720, y: 200 },
        params: {},
      },
    ],
    connections: [
      {
        id: 'conn_1',
        from: { nodeId: 'osc_1', port: 'output' },
        to: { nodeId: 'gain_1', port: 'input' },
      },
      {
        id: 'conn_2',
        from: { nodeId: 'gain_1', port: 'output' },
        to: { nodeId: 'panner_1', port: 'input' },
      },
      {
        id: 'conn_3',
        from: { nodeId: 'panner_1', port: 'output' },
        to: { nodeId: 'destination_0', port: 'input' },
      },
    ],
  },
];
