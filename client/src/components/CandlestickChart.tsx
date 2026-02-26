import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle, IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartOverlay {
  type: 'zone_top' | 'zone_bottom' | 'level';
  price: number;
  color: string;
  label?: string;
  dashed?: boolean;
}

interface CandlestickChartProps {
  data: CandleData[];
  overlays?: ChartOverlay[];
  height?: number;
  className?: string;
}

export default function CandlestickChart({
  data,
  overlays = [],
  height = 320,
  className = '',
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#111827' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      rightPriceScale: { borderColor: '#374151' },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: '#4b5563', labelBackgroundColor: '#374151' },
        horzLine: { color: '#4b5563', labelBackgroundColor: '#374151' },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Sort by time and deduplicate
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const deduped = sorted.filter((c, i, arr) => i === 0 || c.time !== arr[i - 1].time);
    series.setData(deduped as Parameters<typeof series.setData>[0]);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data when prop changes
  useEffect(() => {
    if (!seriesRef.current || !data.length) return;
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const deduped = sorted.filter((c, i, arr) => i === 0 || c.time !== arr[i - 1].time);
    seriesRef.current.setData(deduped as Parameters<typeof seriesRef.current.setData>[0]);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Sync overlays (price lines)
  useEffect(() => {
    if (!seriesRef.current) return;

    // Remove old price lines
    priceLinesRef.current.forEach((pl) => {
      try { seriesRef.current?.removePriceLine(pl); } catch { /* ignore */ }
    });
    priceLinesRef.current = [];

    // Add new price lines
    overlays.forEach((o) => {
      if (!seriesRef.current) return;
      const pl = seriesRef.current.createPriceLine({
        price: o.price,
        color: o.color,
        lineWidth: 2,
        lineStyle: o.dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true,
        title: o.label ?? '',
      });
      priceLinesRef.current.push(pl);
    });
  }, [overlays]);

  return <div ref={containerRef} style={{ height }} className={`w-full rounded-lg overflow-hidden ${className}`} />;
}
