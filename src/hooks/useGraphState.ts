import { useCallback, useState } from 'react';
import type {
  AppState,
  AudioNodeType,
  Connection,
  GraphNode,
  Position,
} from '../types/audio';
import { getDefaultParams } from '../utils/nodeRegistry';

let nextId = 1;
function generateId(): string {
  return `node_${nextId++}`;
}

function generateConnectionId(): string {
  return `conn_${nextId++}`;
}

const INITIAL_STATE: AppState = {
  nodes: [
    {
      id: 'destination_0',
      type: 'destination',
      position: { x: 600, y: 250 },
      params: {},
    },
  ],
  connections: [],
  isPlaying: false,
  selectedNodeId: null,
  canvasOffset: { x: 0, y: 0 },
  zoom: 1,
};

/**
 * グラフの状態管理カスタムフック。
 * ノードの追加/削除/移動、接続の追加/削除、パラメータ変更などを管理する。
 */
export function useGraphState() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  /** ノードを追加 */
  const addNode = useCallback(
    (type: AudioNodeType, position: Position) => {
      const id = generateId();
      const node: GraphNode = {
        id,
        type,
        position,
        params: getDefaultParams(type),
      };
      setState((prev) => ({
        ...prev,
        nodes: [...prev.nodes, node],
      }));
      return id;
    },
    []
  );

  /** ノードを削除（関連する接続も削除） */
  const removeNode = useCallback((nodeId: string) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      connections: prev.connections.filter(
        (c) => c.from.nodeId !== nodeId && c.to.nodeId !== nodeId
      ),
      selectedNodeId:
        prev.selectedNodeId === nodeId ? null : prev.selectedNodeId,
    }));
  }, []);

  /** ノード位置を更新 */
  const moveNode = useCallback((nodeId: string, position: Position) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      ),
    }));
  }, []);

  /** 接続を追加 */
  const addConnection = useCallback(
    (from: { nodeId: string; port: string }, to: { nodeId: string; port: string }) => {
      // 重複チェック
      setState((prev) => {
        const exists = prev.connections.some(
          (c) =>
            c.from.nodeId === from.nodeId &&
            c.from.port === from.port &&
            c.to.nodeId === to.nodeId &&
            c.to.port === to.port
        );
        if (exists) return prev;

        const conn: Connection = {
          id: generateConnectionId(),
          from,
          to,
        };
        return {
          ...prev,
          connections: [...prev.connections, conn],
        };
      });
    },
    []
  );

  /** 接続を削除 */
  const removeConnection = useCallback((connectionId: string) => {
    setState((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== connectionId),
    }));
  }, []);

  /** パラメータを更新 */
  const updateParam = useCallback(
    (nodeId: string, key: string, value: number | string) => {
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, params: { ...n.params, [key]: value } }
            : n
        ),
      }));
    },
    []
  );

  /** 再生/停止を切り替え */
  const setPlaying = useCallback((isPlaying: boolean) => {
    setState((prev) => ({ ...prev, isPlaying }));
  }, []);

  /** ノードを選択 */
  const selectNode = useCallback((nodeId: string | null) => {
    setState((prev) => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  /** キャンバスオフセットを更新 */
  const setCanvasOffset = useCallback((offset: Position) => {
    setState((prev) => ({ ...prev, canvasOffset: offset }));
  }, []);

  /** ズームを更新 */
  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.25, Math.min(2, zoom)) }));
  }, []);

  /** プリセットをロード */
  const loadPreset = useCallback((preset: Pick<AppState, 'nodes' | 'connections'>) => {
    setState((prev) => ({
      ...prev,
      nodes: preset.nodes,
      connections: preset.connections,
      isPlaying: false,
      selectedNodeId: null,
    }));
  }, []);

  return {
    state,
    addNode,
    removeNode,
    moveNode,
    addConnection,
    removeConnection,
    updateParam,
    setPlaying,
    selectNode,
    setCanvasOffset,
    setZoom,
    loadPreset,
  };
}
