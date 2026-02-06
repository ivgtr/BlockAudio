/** Web Audio Playground で扱うノードの種別 */
export type AudioNodeType =
  // Phase 1: 基本ノード
  | 'oscillator'
  | 'gain'
  | 'destination'
  | 'analyser'
  // Phase 2: フィルタ・エフェクト
  | 'biquadFilter'
  | 'delay'
  | 'stereoPanner'
  | 'dynamicsCompressor';

/** ノードのカテゴリ（カラーコーディング用） */
export type NodeCategory = 'source' | 'effect' | 'analysis' | 'output';

/** キャンバス上の座標 */
export interface Position {
  x: number;
  y: number;
}

/** ポートの種別 */
export type PortKind = 'input' | 'output';

/** ノード上のポート定義 */
export interface PortDefinition {
  id: string;
  kind: PortKind;
  label: string;
}

/** パラメータ定義 */
export interface ParamDefinition {
  key: string;
  label: string;
  type: 'range' | 'select';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string;
  options?: { label: string; value: string }[];
}

/** キャンバス上に配置されたノード */
export interface GraphNode {
  id: string;
  type: AudioNodeType;
  position: Position;
  params: Record<string, number | string>;
}

/** ノード間の接続 */
export interface Connection {
  id: string;
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
}

/** アプリケーション全体の状態 */
export interface AppState {
  nodes: GraphNode[];
  connections: Connection[];
  isPlaying: boolean;
  selectedNodeId: string | null;
  canvasOffset: Position;
  zoom: number;
}
