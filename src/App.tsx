import { useCallback } from 'react';
import { useGraphState } from './hooks/useGraphState';
import { useAudioEngine } from './hooks/useAudioEngine';
import { generateCode } from './utils/codeGenerator';
import { PALETTE_NODES, CATEGORY_COLORS, NODE_REGISTRY } from './utils/nodeRegistry';
import type { AudioNodeType } from './types/audio';

function App() {
  const {
    state,
    addNode,
    removeNode,
    moveNode,
    removeConnection,
    updateParam,
    setPlaying,
    selectNode,
  } = useGraphState();

  const { buildGraph, stopGraph, updateParam: updateAudioParam, resume } =
    useAudioEngine();

  // 再生/停止の制御
  const handlePlay = useCallback(async () => {
    await resume();
    buildGraph(state.nodes, state.connections);
    setPlaying(true);
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
      const x = 200 + Math.random() * 200;
      const y = 100 + Math.random() * 300;
      addNode(type, { x, y });
    },
    [addNode]
  );

  // 生成されたコード
  const code = generateCode(state.nodes, state.connections);

  // 選択中のノード
  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);
  const selectedMeta = selectedNode
    ? NODE_REGISTRY[selectedNode.type]
    : null;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-mono">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-wide">
          Web Audio Playground
        </h1>
        <div className="flex items-center gap-2">
          {!state.isPlaying ? (
            <button
              onClick={handlePlay}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
            >
              ▶ Play
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors"
            >
              ■ Stop
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <aside className="w-48 bg-gray-800 border-r border-gray-700 p-3 overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Nodes
          </h2>
          <div className="flex flex-col gap-2">
            {PALETTE_NODES.map((meta) => (
              <button
                key={meta.type}
                onClick={() => handleAddNode(meta.type)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm text-left hover:bg-gray-700 transition-colors"
                style={{ borderLeft: `3px solid ${CATEGORY_COLORS[meta.category]}` }}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas Area (placeholder) */}
        <main
          className="flex-1 relative bg-gray-900 overflow-hidden"
          onClick={() => selectNode(null)}
        >
          <svg className="w-full h-full">
            {/* Connections */}
            {state.connections.map((conn) => {
              const fromNode = state.nodes.find(
                (n) => n.id === conn.from.nodeId
              );
              const toNode = state.nodes.find(
                (n) => n.id === conn.to.nodeId
              );
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.position.x + 160;
              const y1 = fromNode.position.y + 40;
              const x2 = toNode.position.x;
              const y2 = toNode.position.y + 40;
              const cx = (x1 + x2) / 2;

              return (
                <path
                  key={conn.id}
                  d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="none"
                  className="cursor-pointer hover:stroke-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeConnection(conn.id);
                  }}
                />
              );
            })}

            {/* Nodes */}
            {state.nodes.map((node) => {
              const meta = NODE_REGISTRY[node.type];
              const color = CATEGORY_COLORS[meta.category];
              const isSelected = state.selectedNodeId === node.id;

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
                    e.stopPropagation();
                    const startX = e.clientX - node.position.x;
                    const startY = e.clientY - node.position.y;
                    const handleMouseMove = (ev: MouseEvent) => {
                      moveNode(node.id, {
                        x: ev.clientX - startX,
                        y: ev.clientY - startY,
                      });
                    };
                    const handleMouseUp = () => {
                      document.removeEventListener(
                        'mousemove',
                        handleMouseMove
                      );
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <rect
                    width={160}
                    height={80}
                    rx={8}
                    fill="#1f2937"
                    stroke={isSelected ? '#f59e0b' : color}
                    strokeWidth={isSelected ? 2 : 1}
                    opacity={0.95}
                  />
                  <rect
                    width={160}
                    height={24}
                    rx={8}
                    fill={color}
                    opacity={0.8}
                  />
                  <rect
                    y={16}
                    width={160}
                    height={8}
                    fill={color}
                    opacity={0.8}
                  />
                  <text
                    x={12}
                    y={17}
                    fill="white"
                    fontSize={12}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {meta.label}
                  </text>
                  {/* Input port */}
                  {meta.ports.some((p) => p.kind === 'input') && (
                    <circle cx={0} cy={50} r={6} fill={color} stroke="#111" strokeWidth={1.5} />
                  )}
                  {/* Output port */}
                  {meta.ports.some((p) => p.kind === 'output') && (
                    <circle cx={160} cy={50} r={6} fill={color} stroke="#111" strokeWidth={1.5} />
                  )}
                  {/* Inline param preview */}
                  {meta.params.length > 0 && (
                    <text
                      x={12}
                      y={50}
                      fill="#9ca3af"
                      fontSize={10}
                      fontFamily="monospace"
                    >
                      {meta.params
                        .slice(0, 2)
                        .map((p) => `${p.label}: ${node.params[p.key] ?? p.defaultValue}`)
                        .join(' | ')}
                    </text>
                  )}
                  {/* Delete button (except destination) */}
                  {node.type !== 'destination' && (
                    <text
                      x={142}
                      y={68}
                      fill="#ef4444"
                      fontSize={14}
                      className="cursor-pointer hover:opacity-80"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                    >
                      ✕
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Empty state hint */}
          {state.nodes.length <= 1 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-600 text-sm">
                左のパレットからノードを追加してください
              </p>
            </div>
          )}
        </main>

        {/* Inspector Panel */}
        <aside className="w-64 bg-gray-800 border-l border-gray-700 p-3 overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Inspector
          </h2>
          {selectedNode && selectedMeta ? (
            <div className="flex flex-col gap-3">
              <div
                className="text-sm font-bold px-2 py-1 rounded"
                style={{
                  backgroundColor: CATEGORY_COLORS[selectedMeta.category] + '33',
                  color: CATEGORY_COLORS[selectedMeta.category],
                }}
              >
                {selectedMeta.label}
              </div>
              <p className="text-xs text-gray-400">
                {selectedMeta.description}
              </p>

              {/* Parameters */}
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
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-300 w-12 text-right tabular-nums">
                        {selectedNode.params[param.key] ?? param.defaultValue}
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
                      className="bg-gray-700 text-gray-200 text-sm px-2 py-1 rounded border border-gray-600"
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
          ) : (
            <p className="text-xs text-gray-500">
              ノードを選択すると詳細が表示されます
            </p>
          )}
        </aside>
      </div>

      {/* Code Preview */}
      <div className="h-40 bg-gray-950 border-t border-gray-700 overflow-auto">
        <div className="flex items-center justify-between px-4 py-1 bg-gray-800 border-b border-gray-700">
          <span className="text-xs text-gray-400">
            Generated Code
          </span>
        </div>
        <pre className="p-4 text-xs text-green-400 leading-relaxed whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    </div>
  );
}

export default App;
