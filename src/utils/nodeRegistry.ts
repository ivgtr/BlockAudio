import type {
  AudioNodeType,
  NodeCategory,
  ParamDefinition,
  PortDefinition,
} from '../types/audio';

/** ノード種別ごとのメタ情報 */
export interface NodeMeta {
  type: AudioNodeType;
  label: string;
  category: NodeCategory;
  ports: PortDefinition[];
  params: ParamDefinition[];
  description: string;
}

/** カテゴリごとのテーマカラー */
export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  source: '#3b82f6', // blue
  effect: '#22c55e', // green
  analysis: '#a855f7', // purple
  output: '#f97316', // orange
};

/** ノードレジストリ: 全ノード種別のメタ情報 */
export const NODE_REGISTRY: Record<AudioNodeType, NodeMeta> = {
  oscillator: {
    type: 'oscillator',
    label: 'Oscillator',
    category: 'source',
    ports: [{ id: 'output', kind: 'output', label: 'out' }],
    params: [
      {
        key: 'type',
        label: 'Waveform',
        type: 'select',
        defaultValue: 'sine',
        options: [
          { label: 'Sine', value: 'sine' },
          { label: 'Square', value: 'square' },
          { label: 'Sawtooth', value: 'sawtooth' },
          { label: 'Triangle', value: 'triangle' },
        ],
      },
      {
        key: 'frequency',
        label: 'Frequency',
        type: 'range',
        min: 20,
        max: 2000,
        step: 1,
        defaultValue: 440,
      },
      {
        key: 'detune',
        label: 'Detune',
        type: 'range',
        min: -100,
        max: 100,
        step: 1,
        defaultValue: 0,
      },
    ],
    description:
      '周期的な波形を生成する音源ノード。Web Audio APIの OscillatorNode に対応します。',
  },

  gain: {
    type: 'gain',
    label: 'Gain',
    category: 'effect',
    ports: [
      { id: 'input', kind: 'input', label: 'in' },
      { id: 'output', kind: 'output', label: 'out' },
    ],
    params: [
      {
        key: 'gain',
        label: 'Gain',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
      },
    ],
    description: '音量を制御するノード。Web Audio APIの GainNode に対応します。',
  },

  destination: {
    type: 'destination',
    label: 'Destination',
    category: 'output',
    ports: [{ id: 'input', kind: 'input', label: 'in' }],
    params: [],
    description:
      '最終的な音声出力先（スピーカー）。Web Audio APIの AudioDestinationNode に対応します。',
  },

  analyser: {
    type: 'analyser',
    label: 'Analyser',
    category: 'analysis',
    ports: [
      { id: 'input', kind: 'input', label: 'in' },
      { id: 'output', kind: 'output', label: 'out' },
    ],
    params: [
      {
        key: 'fftSize',
        label: 'FFT Size',
        type: 'select',
        defaultValue: '2048',
        options: [
          { label: '256', value: '256' },
          { label: '512', value: '512' },
          { label: '1024', value: '1024' },
          { label: '2048', value: '2048' },
          { label: '4096', value: '4096' },
        ],
      },
    ],
    description:
      '信号の波形やスペクトラムを分析・可視化するノード。Web Audio APIの AnalyserNode に対応します。',
  },

  biquadFilter: {
    type: 'biquadFilter',
    label: 'BiquadFilter',
    category: 'effect',
    ports: [
      { id: 'input', kind: 'input', label: 'in' },
      { id: 'output', kind: 'output', label: 'out' },
    ],
    params: [
      {
        key: 'type',
        label: 'Filter Type',
        type: 'select',
        defaultValue: 'lowpass',
        options: [
          { label: 'Lowpass', value: 'lowpass' },
          { label: 'Highpass', value: 'highpass' },
          { label: 'Bandpass', value: 'bandpass' },
          { label: 'Notch', value: 'notch' },
          { label: 'Peaking', value: 'peaking' },
        ],
      },
      {
        key: 'frequency',
        label: 'Frequency',
        type: 'range',
        min: 20,
        max: 20000,
        step: 1,
        defaultValue: 1000,
      },
      {
        key: 'Q',
        label: 'Q',
        type: 'range',
        min: 0.1,
        max: 20,
        step: 0.1,
        defaultValue: 1,
      },
    ],
    description:
      '各種フィルタ処理を行うノード。Web Audio APIの BiquadFilterNode に対応します。',
  },

  delay: {
    type: 'delay',
    label: 'Delay',
    category: 'effect',
    ports: [
      { id: 'input', kind: 'input', label: 'in' },
      { id: 'output', kind: 'output', label: 'out' },
    ],
    params: [
      {
        key: 'delayTime',
        label: 'Delay Time',
        type: 'range',
        min: 0,
        max: 5,
        step: 0.01,
        defaultValue: 0.5,
      },
    ],
    description:
      '音声を遅延させるノード。Web Audio APIの DelayNode に対応します。',
  },

  stereoPanner: {
    type: 'stereoPanner',
    label: 'StereoPanner',
    category: 'effect',
    ports: [
      { id: 'input', kind: 'input', label: 'in' },
      { id: 'output', kind: 'output', label: 'out' },
    ],
    params: [
      {
        key: 'pan',
        label: 'Pan',
        type: 'range',
        min: -1,
        max: 1,
        step: 0.01,
        defaultValue: 0,
      },
    ],
    description:
      'ステレオ定位を制御するノード。Web Audio APIの StereoPannerNode に対応します。',
  },

  dynamicsCompressor: {
    type: 'dynamicsCompressor',
    label: 'Compressor',
    category: 'effect',
    ports: [
      { id: 'input', kind: 'input', label: 'in' },
      { id: 'output', kind: 'output', label: 'out' },
    ],
    params: [
      {
        key: 'threshold',
        label: 'Threshold',
        type: 'range',
        min: -100,
        max: 0,
        step: 1,
        defaultValue: -24,
      },
      {
        key: 'knee',
        label: 'Knee',
        type: 'range',
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 30,
      },
      {
        key: 'ratio',
        label: 'Ratio',
        type: 'range',
        min: 1,
        max: 20,
        step: 0.5,
        defaultValue: 12,
      },
      {
        key: 'attack',
        label: 'Attack',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.001,
        defaultValue: 0.003,
      },
      {
        key: 'release',
        label: 'Release',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.25,
      },
    ],
    description:
      'ダイナミクス（音量差）を圧縮するノード。Web Audio APIの DynamicsCompressorNode に対応します。',
  },
};

/** パレットに表示するノード一覧（destinationを除く） */
export const PALETTE_NODES = Object.values(NODE_REGISTRY).filter(
  (n) => n.type !== 'destination'
);

/** ノード種別からデフォルトパラメータ値を生成 */
export function getDefaultParams(
  type: AudioNodeType
): Record<string, number | string> {
  const meta = NODE_REGISTRY[type];
  const params: Record<string, number | string> = {};
  for (const p of meta.params) {
    params[p.key] = p.defaultValue;
  }
  return params;
}
