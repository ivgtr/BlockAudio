import { useEffect, useRef, useState } from 'react';

interface AnalyserVisualizerProps {
  analyserNode: AnalyserNode | null;
  width: number;
  height: number;
}

type VisualMode = 'waveform' | 'frequency';

/**
 * AnalyserNode のデータをリアルタイムに描画する Canvas コンポーネント。
 * 波形表示（Time Domain）とスペクトラム表示（Frequency Domain）を切り替えられる。
 */
export function AnalyserVisualizer({
  analyserNode,
  width,
  height,
}: AnalyserVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [mode, setMode] = useState<VisualMode>('waveform');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength =
      mode === 'waveform'
        ? analyserNode.fftSize
        : analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      if (mode === 'waveform') {
        analyserNode.getByteTimeDomainData(dataArray);
      } else {
        analyserNode.getByteFrequencyData(dataArray);
      }

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      if (mode === 'waveform') {
        drawWaveform(ctx, dataArray, bufferLength, width, height);
      } else {
        drawFrequency(ctx, dataArray, bufferLength, width, height);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyserNode, width, height, mode]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width, height, borderRadius: 4 }}
      />
      <div className="absolute top-1 right-1 flex gap-1">
        <button
          onClick={() => setMode('waveform')}
          className={`px-1.5 py-0.5 text-[9px] rounded ${
            mode === 'waveform'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Wave
        </button>
        <button
          onClick={() => setMode('frequency')}
          className={`px-1.5 py-0.5 text-[9px] rounded ${
            mode === 'frequency'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          FFT
        </button>
      </div>
    </div>
  );
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  bufferLength: number,
  w: number,
  h: number
) {
  // Grid lines
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Waveform
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#22c55e';
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 6;
  ctx.beginPath();

  const sliceWidth = w / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = data[i] / 128.0;
    const y = (v * h) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawFrequency(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  bufferLength: number,
  w: number,
  h: number
) {
  const barWidth = (w / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (data[i] / 255) * h;

    const hue = (i / bufferLength) * 120 + 200; // blue to green gradient
    ctx.fillStyle = `hsla(${hue}, 80%, 55%, 0.9)`;
    ctx.shadowColor = `hsla(${hue}, 80%, 55%, 0.5)`;
    ctx.shadowBlur = 4;
    ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

    x += barWidth;
    if (x > w) break;
  }
  ctx.shadowBlur = 0;
}
