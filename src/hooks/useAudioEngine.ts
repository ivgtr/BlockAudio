import { useCallback, useRef } from 'react';
import type { GraphNode, Connection } from '../types/audio';
import { NODE_REGISTRY } from '../utils/nodeRegistry';

/**
 * Web Audio API のグラフを管理するカスタムフック。
 * ビジュアルグラフの状態を受け取り、実際の AudioNode を生成・接続する。
 */
export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Map<string, AudioNode>>(new Map());
  const oscillatorsRef = useRef<Map<string, OscillatorNode>>(new Map());

  /** AudioContext を取得（なければ生成） */
  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  /** グラフの再構築: ビジュアル状態 → Web Audio API */
  const buildGraph = useCallback(
    (nodes: GraphNode[], connections: Connection[]) => {
      const ctx = getContext();

      // 既存ノードをクリーンアップ
      for (const osc of oscillatorsRef.current.values()) {
        try {
          osc.stop();
        } catch {
          // already stopped
        }
      }
      for (const node of nodesRef.current.values()) {
        try {
          node.disconnect();
        } catch {
          // ignore
        }
      }
      nodesRef.current.clear();
      oscillatorsRef.current.clear();

      // AudioNode を生成
      for (const gn of nodes) {
        const audioNode = createAudioNode(ctx, gn);
        if (audioNode) {
          nodesRef.current.set(gn.id, audioNode);
          if (audioNode instanceof OscillatorNode) {
            oscillatorsRef.current.set(gn.id, audioNode);
          }
        }
      }

      // 接続
      for (const conn of connections) {
        const fromNode = nodesRef.current.get(conn.from.nodeId);
        const toNode = nodesRef.current.get(conn.to.nodeId);
        if (fromNode && toNode) {
          try {
            fromNode.connect(toNode);
          } catch {
            // invalid connection
          }
        }
      }

      // Oscillator を開始
      for (const osc of oscillatorsRef.current.values()) {
        osc.start();
      }
    },
    [getContext]
  );

  /** グラフを停止 */
  const stopGraph = useCallback(() => {
    for (const osc of oscillatorsRef.current.values()) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    for (const node of nodesRef.current.values()) {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    nodesRef.current.clear();
    oscillatorsRef.current.clear();
  }, []);

  /** パラメータのリアルタイム更新 */
  const updateParam = useCallback(
    (nodeId: string, key: string, value: number | string) => {
      const audioNode = nodesRef.current.get(nodeId);
      if (!audioNode) return;

      if (audioNode instanceof OscillatorNode) {
        if (key === 'type') {
          audioNode.type = value as OscillatorType;
        } else if (key === 'frequency') {
          audioNode.frequency.value = value as number;
        } else if (key === 'detune') {
          audioNode.detune.value = value as number;
        }
      } else if (audioNode instanceof GainNode) {
        if (key === 'gain') {
          audioNode.gain.value = value as number;
        }
      } else if (audioNode instanceof BiquadFilterNode) {
        if (key === 'type') {
          audioNode.type = value as BiquadFilterType;
        } else if (key === 'frequency') {
          audioNode.frequency.value = value as number;
        } else if (key === 'Q') {
          audioNode.Q.value = value as number;
        }
      } else if (audioNode instanceof DelayNode) {
        if (key === 'delayTime') {
          audioNode.delayTime.value = value as number;
        }
      } else if (audioNode instanceof StereoPannerNode) {
        if (key === 'pan') {
          audioNode.pan.value = value as number;
        }
      } else if (audioNode instanceof DynamicsCompressorNode) {
        const paramMap: Record<string, AudioParam | undefined> = {
          threshold: audioNode.threshold,
          knee: audioNode.knee,
          ratio: audioNode.ratio,
          attack: audioNode.attack,
          release: audioNode.release,
        };
        const param = paramMap[key];
        if (param) {
          param.value = value as number;
        }
      } else if (audioNode instanceof AnalyserNode) {
        if (key === 'fftSize') {
          audioNode.fftSize = Number(value);
        }
      }
    },
    []
  );

  /** AnalyserNode への参照を取得 */
  const getAnalyserNode = useCallback(
    (nodeId: string): AnalyserNode | null => {
      const node = nodesRef.current.get(nodeId);
      return node instanceof AnalyserNode ? node : null;
    },
    []
  );

  /** AudioContext を resume（ユーザージェスチャー後に呼ぶ） */
  const resume = useCallback(async () => {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, [getContext]);

  return {
    buildGraph,
    stopGraph,
    updateParam,
    getAnalyserNode,
    resume,
  };
}

/** GraphNode の情報から実際の AudioNode を生成 */
function createAudioNode(
  ctx: AudioContext,
  gn: GraphNode
): AudioNode | null {
  const meta = NODE_REGISTRY[gn.type];
  if (!meta) return null;

  switch (gn.type) {
    case 'oscillator': {
      const osc = ctx.createOscillator();
      osc.type = (gn.params.type as OscillatorType) ?? 'sine';
      osc.frequency.value = (gn.params.frequency as number) ?? 440;
      osc.detune.value = (gn.params.detune as number) ?? 0;
      return osc;
    }
    case 'gain': {
      const gain = ctx.createGain();
      gain.gain.value = (gn.params.gain as number) ?? 0.5;
      return gain;
    }
    case 'destination':
      return ctx.destination;
    case 'analyser': {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = Number(gn.params.fftSize) || 2048;
      return analyser;
    }
    case 'biquadFilter': {
      const filter = ctx.createBiquadFilter();
      filter.type = (gn.params.type as BiquadFilterType) ?? 'lowpass';
      filter.frequency.value = (gn.params.frequency as number) ?? 1000;
      filter.Q.value = (gn.params.Q as number) ?? 1;
      return filter;
    }
    case 'delay': {
      const delay = ctx.createDelay(5);
      delay.delayTime.value = (gn.params.delayTime as number) ?? 0.5;
      return delay;
    }
    case 'stereoPanner': {
      const panner = ctx.createStereoPanner();
      panner.pan.value = (gn.params.pan as number) ?? 0;
      return panner;
    }
    case 'dynamicsCompressor': {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = (gn.params.threshold as number) ?? -24;
      comp.knee.value = (gn.params.knee as number) ?? 30;
      comp.ratio.value = (gn.params.ratio as number) ?? 12;
      comp.attack.value = (gn.params.attack as number) ?? 0.003;
      comp.release.value = (gn.params.release as number) ?? 0.25;
      return comp;
    }
    default:
      return null;
  }
}
