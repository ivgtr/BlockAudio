import { useCallback, useEffect, useRef, useState } from 'react';
import { useGraphState } from './hooks/useGraphState';
import { useAudioEngine } from './hooks/useAudioEngine';
import { generateCode } from './utils/codeGenerator';
import {
  PALETTE_NODES,
  CATEGORY_COLORS,
  NODE_REGISTRY,
} from './utils/nodeRegistry';
import { PRESETS } from './utils/presets';
import { AnalyserVisualizer } from './components/AnalyserVisualizer';
import type { AudioNodeType, NodeCategory } from './types/audio';

/** ノードブロックの寸法 */
const NODE_W = 180;
const NODE_H = 88;
const PORT_R = 7;

/** ポートの座標計算（ノードローカル座標） */
function inputPortPos() {
  return { x: 0, y: NODE_H / 2 };
}
function outputPortPos() {
  return { x: NODE_W, y: NODE_H / 2 };
}

/** ドラッグ中のワイヤー情報 */
interface DraggingWire {
  fromNodeId: string;
  fromPort: string;
  fromX: number;
  fromY: number;
  currentX: number;
  currentY: number;
}

function App() {
  const {
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
  } = useGraphState();

  const {
    buildGraph,
    stopGraph,
    updateParam: updateAudioParam,
    getAnalyserNode,
    resume,
  } = useAudioEngine();

  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingWire, setDraggingWire] = useState<DraggingWire | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [codeExpanded, setCodeExpanded] = useState(true);

  // Analyser ノードの実参照を取得するためのフレーム更新
  const [, forceUpdate] = useState(0);

  // 再生/停止の制御
  const handlePlay = useCallback(async () => {
    await resume();
    buildGraph(state.nodes, state.connections);
    setPlaying(true);
    // Analyser visualization を更新させるために強制再レンダー
    setTimeout(() => forceUpdate((n) => n + 1), 50);
  }, [resume, buildGraph, state.nodes, state.connections, setPlaying]);

  const handleStop = useCallback(() => {
    stopGraph();
    setPlaying(false);
  }, [stopGraph, setPlaying]);

  // パラメータ変更時にオーディオエンジンにも反映
  const handleParamChange = useCallback(
    (nodeId: string, key: string, value: number | string) => {
      updateParam(nodeId, key, value);
      updateAudioParam(nodeId, key, value);
    },
    [updateParam, updateAudioParam]
  );

  // パレットからのノード追加
  const handleAddNode = useCallback(
    (type: AudioNodeType) => {
      // キャンバスの見える範囲に配置
      const x = -state.canvasOffset.x + 200 + Math.random() * 200;
      const y = -state.canvasOffset.y + 100 + Math.random() * 300;
      addNode(type, { x, y });
    },
    [addNode, state.canvasOffset]
  );

  // SVG座標への変換
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: clientX, y: clientY };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / state.zoom - state.canvasOffset.x,
        y: (clientY - rect.top) / state.zoom - state.canvasOffset.y,
      };
    },
    [state.zoom, state.canvasOffset]
  );

  // --- ポートからのワイヤードラッグ ---
  const handlePortMouseDown = useCallback(
    (
      e: React.MouseEvent,
      nodeId: string,
      port: string,
      portGlobalX: number,
      portGlobalY: number
    ) => {
      e.stopPropagation();
      e.preventDefault();
      setDraggingWire({
        fromNodeId: nodeId,
        fromPort: port,
        fromX: portGlobalX,
        fromY: portGlobalY,
        currentX: portGlobalX,
        currentY: portGlobalY,
      });
    },
    []
  );

  // グローバルマウスムーブ（ワイヤードラッグ）
  useEffect(() => {
    if (!draggingWire) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setDraggingWire((prev) =>
        prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null
      );
    };

    const handleMouseUp = (e: MouseEvent) => {
      // ドロップ先のポートを探す
      const pos = screenToCanvas(e.clientX, e.clientY);
      if (draggingWire) {
        // ノードの入力ポートに近いか判定
        for (const node of state.nodes) {
          if (node.id === draggingWire.fromNodeId) continue;
          const meta = NODE_REGISTRY[node.type];
          const hasInput = meta.ports.some((p) => p.kind === 'input');
          const hasOutput = meta.ports.some((p) => p.kind === 'output');

          if (draggingWire.fromPort === 'output' && hasInput) {
            const portPos = inputPortPos();
            const px = node.position.x + portPos.x;
            const py = node.position.y + portPos.y;
            const dist = Math.hypot(pos.x - px, pos.y - py);
            if (dist < 20) {
              addConnection(
                {
                  nodeId: draggingWire.fromNodeId,
                  port: draggingWire.fromPort,
                },
                { nodeId: node.id, port: 'input' }
              );
              break;
            }
          }
          if (draggingWire.fromPort === 'input' && hasOutput) {
            const portPos = outputPortPos();
            const px = node.position.x + portPos.x;
            const py = node.position.y + portPos.y;
            const dist = Math.hypot(pos.x - px, pos.y - py);
            if (dist < 20) {
              addConnection(
                { nodeId: node.id, port: 'output' },
                {
                  nodeId: draggingWire.fromNodeId,
                  port: draggingWire.fromPort,
                }
              );
              break;
            }
          }
        }
      }
      setDraggingWire(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingWire, state.nodes, addConnection, screenToCanvas]);

  // --- キャンバスパン ---
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // 中クリック or Alt+左クリックでパン
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX - state.canvasOffset.x * state.zoom,
          y: e.clientY - state.canvasOffset.y * state.zoom,
        };
      }
    },
    [state.canvasOffset, state.zoom]
  );

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCanvasOffset({
        x: (e.clientX - panStartRef.current.x) / state.zoom,
        y: (e.clientY - panStartRef.current.y) / state.zoom,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, state.zoom, setCanvasOffset]);

  // --- ズーム ---
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(state.zoom + delta);
    },
    [state.zoom, setZoom]
  );

  // --- キーボードショートカット ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Delete' ||
        e.key === 'Backspace'
      ) {
        // フォーカスがinput/select内なら無視
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        if (
          state.selectedNodeId &&
          state.selectedNodeId !== 'destination_0'
        ) {
          removeNode(state.selectedNodeId);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedNodeId, removeNode]);

  // プリセットロード
  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const preset = PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      if (state.isPlaying) {
        stopGraph();
        setPlaying(false);
      }
      loadPreset({ nodes: preset.nodes, connections: preset.connections });
    },
    [loadPreset, state.isPlaying, stopGraph, setPlaying]
  );

  // 生成されたコード
  const code = generateCode(state.nodes, state.connections);

  // 選択中のノード
  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);
  const selectedMeta = selectedNode
    ? NODE_REGISTRY[selectedNode.type]
    : null;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-mono select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900/90 border-b border-gray-700/50 backdrop-blur-sm">
        <h1 className="text-lg font-bold tracking-wide bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Web Audio Playground
        </h1>
        <div className="flex items-center gap-3">
          {/* Preset selector */}
          <select
            className="bg-gray-800 text-gray-300 text-xs px-2 py-1.5 rounded border border-gray-600 hover:border-gray-500 transition-colors"
            value=""
            onChange={(e) => handleLoadPreset(e.target.value)}
          >
            <option value="" disabled>
              Presets...
            </option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {/* Play/Stop */}
          {!state.isPlaying ? (
            <button
              onClick={handlePlay}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-all shadow-lg shadow-green-900/30 hover:shadow-green-800/40"
            >
              ▶ Play
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-all shadow-lg shadow-red-900/30"
            >
              ■ Stop
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <aside className="w-48 bg-gray-900/80 border-r border-gray-700/50 p-3 overflow-y-auto flex-shrink-0">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Nodes
          </h2>
          <div className="flex flex-col gap-1.5">
            {PALETTE_NODES.map((meta) => (
              <button
                key={meta.type}
                onClick={() => handleAddNode(meta.type)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm text-left hover:bg-gray-800 transition-all group"
                style={{
                  borderLeft: `3px solid ${CATEGORY_COLORS[meta.category]}`,
                }}
              >
                <span className="text-gray-300 group-hover:text-white transition-colors">
                  {meta.label}
                </span>
              </button>
            ))}
          </div>

          {/* 操作ヒント */}
          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Tips
            </h3>
            <ul className="text-[10px] text-gray-500 space-y-1 leading-relaxed">
              <li>ポートをドラッグで接続</li>
              <li>ワイヤーをクリックで削除</li>
              <li>Delete キーでノード削除</li>
              <li>Alt+ドラッグでキャンバス移動</li>
              <li>ホイールでズーム</li>
            </ul>
          </div>
        </aside>

        {/* Canvas Area */}
        <main
          className="flex-1 relative overflow-hidden"
          style={{ background: 'radial-gradient(circle at 50% 50%, #111827, #030712)' }}
          onClick={() => selectNode(null)}
          onMouseDown={handleCanvasMouseDown}
        >
          {/* Grid pattern */}
          <svg
            ref={svgRef}
            className="w-full h-full"
            onWheel={handleWheel}
            style={{ cursor: isPanning ? 'grabbing' : draggingWire ? 'crosshair' : 'default' }}
          >
            <defs>
              {/* Grid pattern */}
              <pattern
                id="grid"
                width={40 * state.zoom}
                height={40 * state.zoom}
                patternUnits="userSpaceOnUse"
                x={(state.canvasOffset.x * state.zoom) % (40 * state.zoom)}
                y={(state.canvasOffset.y * state.zoom) % (40 * state.zoom)}
              >
                <circle
                  cx={1}
                  cy={1}
                  r={0.8}
                  fill="#1e293b"
                />
              </pattern>

              {/* Glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Glass effect - frosted background */}
              <filter id="glass">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
              </filter>

              {/* Animated dash for signal flow */}
              <style>{`
                @keyframes flowDash {
                  to { stroke-dashoffset: -20; }
                }
                .wire-flow {
                  animation: flowDash 0.8s linear infinite;
                }
              `}</style>
            </defs>

            {/* Grid background */}
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Transform group for pan/zoom */}
            <g
              transform={`scale(${state.zoom}) translate(${state.canvasOffset.x}, ${state.canvasOffset.y})`}
            >
              {/* Connections */}
              {state.connections.map((conn) => {
                const fromNode = state.nodes.find(
                  (n) => n.id === conn.from.nodeId
                );
                const toNode = state.nodes.find(
                  (n) => n.id === conn.to.nodeId
                );
                if (!fromNode || !toNode) return null;

                const fromMeta = NODE_REGISTRY[fromNode.type];
                const fromColor = CATEGORY_COLORS[fromMeta.category];

                const oPort = outputPortPos();
                const iPort = inputPortPos();
                const x1 = fromNode.position.x + oPort.x;
                const y1 = fromNode.position.y + oPort.y;
                const x2 = toNode.position.x + iPort.x;
                const y2 = toNode.position.y + iPort.y;
                const dx = Math.abs(x2 - x1) * 0.5;

                return (
                  <g key={conn.id}>
                    {/* Shadow/glow wire */}
                    <path
                      d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                      stroke={fromColor}
                      strokeWidth={6}
                      fill="none"
                      opacity={0.15}
                    />
                    {/* Base wire */}
                    <path
                      d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                      stroke={fromColor}
                      strokeWidth={2.5}
                      fill="none"
                      opacity={0.7}
                      className="cursor-pointer hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConnection(conn.id);
                      }}
                    />
                    {/* Signal flow animation (only when playing) */}
                    {state.isPlaying && (
                      <path
                        d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                        stroke={fromColor}
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="4 16"
                        opacity={0.9}
                        className="wire-flow"
                      />
                    )}
                    {/* Clickable invisible wider path for easier clicking */}
                    <path
                      d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                      stroke="transparent"
                      strokeWidth={14}
                      fill="none"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConnection(conn.id);
                      }}
                    />
                  </g>
                );
              })}

              {/* Dragging wire preview */}
              {draggingWire && (
                <path
                  d={(() => {
                    const x1 = draggingWire.fromX;
                    const y1 = draggingWire.fromY;
                    const x2 = draggingWire.currentX;
                    const y2 = draggingWire.currentY;
                    const dx = Math.abs(x2 - x1) * 0.5;
                    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  })()}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="6 4"
                  opacity={0.8}
                />
              )}

              {/* Nodes */}
              {state.nodes.map((node) => {
                const meta = NODE_REGISTRY[node.type];
                const color = CATEGORY_COLORS[meta.category];
                const isSelected = state.selectedNodeId === node.id;
                const hasInput = meta.ports.some((p) => p.kind === 'input');
                const hasOutput = meta.ports.some((p) => p.kind === 'output');
                const iPort = inputPortPos();
                const oPort = outputPortPos();

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.position.x}, ${node.position.y})`}
                    className="cursor-move"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectNode(node.id);
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      const startX = e.clientX / state.zoom - node.position.x;
                      const startY = e.clientY / state.zoom - node.position.y;
                      const handleMouseMove = (ev: MouseEvent) => {
                        moveNode(node.id, {
                          x: ev.clientX / state.zoom - startX,
                          y: ev.clientY / state.zoom - startY,
                        });
                      };
                      const handleMouseUp = () => {
                        document.removeEventListener(
                          'mousemove',
                          handleMouseMove
                        );
                        document.removeEventListener(
                          'mouseup',
                          handleMouseUp
                        );
                      };
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                    {/* Node shadow */}
                    <rect
                      x={2}
                      y={3}
                      width={NODE_W}
                      height={NODE_H}
                      rx={10}
                      fill="black"
                      opacity={0.3}
                    />

                    {/* Node body - glass effect */}
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={10}
                      fill="#111827"
                      stroke={isSelected ? '#f59e0b' : color}
                      strokeWidth={isSelected ? 2 : 1}
                      opacity={0.92}
                    />

                    {/* Header gradient */}
                    <clipPath id={`header-clip-${node.id}`}>
                      <rect width={NODE_W} height={26} rx={10} />
                    </clipPath>
                    <rect
                      width={NODE_W}
                      height={26}
                      clipPath={`url(#header-clip-${node.id})`}
                      fill={color}
                      opacity={0.75}
                    />
                    {/* Fill bottom corners of header */}
                    <rect
                      y={16}
                      width={NODE_W}
                      height={10}
                      clipPath={`url(#header-clip-${node.id})`}
                      fill={color}
                      opacity={0.75}
                    />

                    {/* Node label */}
                    <text
                      x={14}
                      y={18}
                      fill="white"
                      fontSize={11}
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {meta.label}
                    </text>

                    {/* Inline param preview */}
                    {meta.params.length > 0 && (
                      <text
                        x={14}
                        y={50}
                        fill="#9ca3af"
                        fontSize={10}
                        fontFamily="monospace"
                      >
                        {meta.params
                          .slice(0, 2)
                          .map(
                            (p) =>
                              `${p.label}: ${node.params[p.key] ?? p.defaultValue}`
                          )
                          .join(' | ')}
                      </text>
                    )}

                    {/* Second line of params if needed */}
                    {meta.params.length > 2 && (
                      <text
                        x={14}
                        y={65}
                        fill="#6b7280"
                        fontSize={9}
                        fontFamily="monospace"
                      >
                        {meta.params
                          .slice(2, 4)
                          .map(
                            (p) =>
                              `${p.label}: ${node.params[p.key] ?? p.defaultValue}`
                          )
                          .join(' | ')}
                      </text>
                    )}

                    {/* Input port */}
                    {hasInput && (
                      <g
                        className="cursor-crosshair"
                        onMouseDown={(e) =>
                          handlePortMouseDown(
                            e,
                            node.id,
                            'input',
                            node.position.x + iPort.x,
                            node.position.y + iPort.y
                          )
                        }
                      >
                        <circle
                          cx={iPort.x}
                          cy={iPort.y}
                          r={PORT_R + 4}
                          fill="transparent"
                        />
                        <circle
                          cx={iPort.x}
                          cy={iPort.y}
                          r={PORT_R}
                          fill="#1f2937"
                          stroke={color}
                          strokeWidth={2}
                        />
                        <circle
                          cx={iPort.x}
                          cy={iPort.y}
                          r={3}
                          fill={color}
                        />
                      </g>
                    )}

                    {/* Output port */}
                    {hasOutput && (
                      <g
                        className="cursor-crosshair"
                        onMouseDown={(e) =>
                          handlePortMouseDown(
                            e,
                            node.id,
                            'output',
                            node.position.x + oPort.x,
                            node.position.y + oPort.y
                          )
                        }
                      >
                        <circle
                          cx={oPort.x}
                          cy={oPort.y}
                          r={PORT_R + 4}
                          fill="transparent"
                        />
                        <circle
                          cx={oPort.x}
                          cy={oPort.y}
                          r={PORT_R}
                          fill="#1f2937"
                          stroke={color}
                          strokeWidth={2}
                        />
                        <circle
                          cx={oPort.x}
                          cy={oPort.y}
                          r={3}
                          fill={color}
                        />
                      </g>
                    )}

                    {/* Delete button (except destination) */}
                    {node.type !== 'destination' && (
                      <g
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNode(node.id);
                        }}
                      >
                        <circle
                          cx={NODE_W - 14}
                          cy={14}
                          r={8}
                          fill="#1f2937"
                          stroke="#374151"
                          strokeWidth={1}
                          opacity={0.8}
                        />
                        <text
                          x={NODE_W - 14}
                          y={18}
                          fill="#ef4444"
                          fontSize={12}
                          textAnchor="middle"
                          className="pointer-events-none"
                        >
                          ✕
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Analyser Visualizer overlays */}
          {state.isPlaying &&
            state.nodes
              .filter((n) => n.type === 'analyser')
              .map((node) => {
                const analyser = getAnalyserNode(node.id);
                const screenX =
                  (node.position.x + state.canvasOffset.x) * state.zoom;
                const screenY =
                  (node.position.y + state.canvasOffset.y) * state.zoom +
                  NODE_H * state.zoom +
                  4;
                return (
                  <div
                    key={`viz-${node.id}`}
                    className="absolute pointer-events-auto"
                    style={{
                      left: screenX,
                      top: screenY,
                      transform: `scale(${state.zoom})`,
                      transformOrigin: 'top left',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AnalyserVisualizer
                      analyserNode={analyser}
                      width={NODE_W}
                      height={80}
                    />
                  </div>
                );
              })}

          {/* Empty state hint */}
          {state.nodes.length <= 1 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">
                  左のパレットからノードを追加してください
                </p>
                <p className="text-gray-700 text-xs">
                  またはプリセットを選択して始められます
                </p>
              </div>
            </div>
          )}

          {/* Zoom indicator */}
          <div className="absolute bottom-2 left-2 text-[10px] text-gray-600">
            {Math.round(state.zoom * 100)}%
          </div>
        </main>

        {/* Inspector Panel */}
        <aside className="w-72 bg-gray-900/80 border-l border-gray-700/50 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Inspector
            </h2>
            {selectedNode && selectedMeta ? (
              <div className="flex flex-col gap-3">
                {/* Node title */}
                <div
                  className="text-sm font-bold px-3 py-1.5 rounded-lg"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[selectedMeta.category] + '22',
                    color: CATEGORY_COLORS[selectedMeta.category],
                    borderLeft: `3px solid ${CATEGORY_COLORS[selectedMeta.category]}`,
                  }}
                >
                  {selectedMeta.label}
                </div>

                {/* Description */}
                <p className="text-xs text-gray-400 leading-relaxed">
                  {selectedMeta.description}
                </p>

                {/* Category badge */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[selectedMeta.category] + '22',
                      color: CATEGORY_COLORS[selectedMeta.category],
                    }}
                  >
                    {categoryLabel(selectedMeta.category)}
                  </span>
                </div>

                {/* Parameters */}
                {selectedMeta.params.length > 0 && (
                  <div className="border-t border-gray-700/50 pt-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Parameters
                    </h3>
                    <div className="flex flex-col gap-3">
                      {selectedMeta.params.map((param) => (
                        <div key={param.key} className="flex flex-col gap-1">
                          <label className="text-xs text-gray-400">
                            {param.label}
                          </label>
                          {param.type === 'range' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={
                                  (selectedNode.params[param.key] as number) ??
                                  param.defaultValue
                                }
                                onChange={(e) =>
                                  handleParamChange(
                                    selectedNode.id,
                                    param.key,
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="flex-1 accent-indigo-500"
                              />
                              <span className="text-xs text-gray-300 w-14 text-right tabular-nums bg-gray-800 px-1.5 py-0.5 rounded">
                                {selectedNode.params[param.key] ??
                                  param.defaultValue}
                              </span>
                            </div>
                          ) : (
                            <select
                              value={
                                (selectedNode.params[param.key] as string) ??
                                param.defaultValue
                              }
                              onChange={(e) =>
                                handleParamChange(
                                  selectedNode.id,
                                  param.key,
                                  e.target.value
                                )
                              }
                              className="bg-gray-800 text-gray-200 text-sm px-2 py-1.5 rounded border border-gray-600 hover:border-gray-500 transition-colors"
                            >
                              {param.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Node ID for reference */}
                <div className="border-t border-gray-700/50 pt-2 mt-1">
                  <p className="text-[10px] text-gray-600">
                    ID: {selectedNode.id}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 space-y-3">
                <p>ノードを選択すると詳細が表示されます</p>

                {/* Connection info */}
                {state.connections.length > 0 && (
                  <div className="border-t border-gray-700/50 pt-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Connections ({state.connections.length})
                    </h3>
                    <div className="space-y-1">
                      {state.connections.map((conn) => {
                        const from = state.nodes.find(
                          (n) => n.id === conn.from.nodeId
                        );
                        const to = state.nodes.find(
                          (n) => n.id === conn.to.nodeId
                        );
                        if (!from || !to) return null;
                        const fMeta = NODE_REGISTRY[from.type];
                        const tMeta = NODE_REGISTRY[to.type];
                        return (
                          <div
                            key={conn.id}
                            className="flex items-center gap-1 text-[10px] text-gray-500"
                          >
                            <span style={{ color: CATEGORY_COLORS[fMeta.category] }}>
                              {fMeta.label}
                            </span>
                            <span>→</span>
                            <span style={{ color: CATEGORY_COLORS[tMeta.category] }}>
                              {tMeta.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preset description (if a preset is loaded matching current graph) */}
          {state.nodes.length > 1 && (
            <div className="border-t border-gray-700/50 p-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Graph Summary
              </h3>
              <p className="text-[10px] text-gray-500">
                {state.nodes.length} nodes, {state.connections.length}{' '}
                connections
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Code Preview */}
      <div
        className={`bg-gray-950 border-t border-gray-700/50 overflow-hidden transition-all ${
          codeExpanded ? 'h-44' : 'h-8'
        }`}
      >
        <button
          className="flex items-center justify-between w-full px-4 py-1.5 bg-gray-900/80 border-b border-gray-700/50 hover:bg-gray-800 transition-colors"
          onClick={() => setCodeExpanded(!codeExpanded)}
        >
          <span className="text-xs text-gray-400">Generated Code</span>
          <span className="text-xs text-gray-600">
            {codeExpanded ? '▼' : '▲'}
          </span>
        </button>
        {codeExpanded && (
          <pre className="p-4 text-xs text-green-400 leading-relaxed whitespace-pre-wrap overflow-auto h-[calc(100%-32px)]">
            {code}
          </pre>
        )}
      </div>
    </div>
  );
}

function categoryLabel(cat: NodeCategory): string {
  switch (cat) {
    case 'source':
      return 'Source';
    case 'effect':
      return 'Effect';
    case 'analysis':
      return 'Analysis';
    case 'output':
      return 'Output';
  }
}

export default App;
