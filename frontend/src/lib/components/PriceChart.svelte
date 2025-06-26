<script lang="ts">
  import { onMount } from 'svelte';
  import { format, parseISO } from 'date-fns';

  export let data: Array<{
    REF_DATE: string;
    VALUE: number;
    GEO: string;
    Products: string;
  }>;

  let chartContainer: HTMLElement;
  let chartWidth = 600;
  let chartHeight = 400;
  let padding = 60;

  $: chartData = data
    .sort((a, b) => new Date(a.REF_DATE).getTime() - new Date(b.REF_DATE).getTime())
    .map((item, index) => ({
      ...item,
      index,
      date: new Date(item.REF_DATE)
    }));

  $: chartInfo = (() => {
    if (chartData.length === 0) return null;
    
    const values = chartData.map(d => d.VALUE);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;
    
    const xScale = (chartWidth - 2 * padding) / (chartData.length - 1);
    const yScale = (chartHeight - 2 * padding) / valueRange;
    
    const points = chartData.map((d, i) => ({
      x: padding + i * xScale,
      y: chartHeight - padding - (d.VALUE - minValue) * yScale,
      value: d.VALUE,
      date: d.date
    }));
    
    const pathData = points.length > 1 
      ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
      : '';
    
    return { points, pathData, minValue, maxValue, valueRange };
  })();

  let hoveredPoint: { x: number; y: number; value: number; date: Date } | null = null;
  let tooltipX = 0;
  let tooltipY = 0;

  function handleMouseOver(point, event) {
    hoveredPoint = point;
    const rect = chartContainer.getBoundingClientRect();
    tooltipX = event.clientX - rect.left;
    tooltipY = event.clientY - rect.top;
  }

  function handleMouseOut() {
    hoveredPoint = null;
  }

  function formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  function formatDate(date: Date): string {
    return format(date, 'MMM yyyy');
  }

  onMount(() => {
    if (chartContainer) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          chartWidth = entry.contentRect.width - 70;
          chartHeight = 400;
        }
      });
      resizeObserver.observe(chartContainer);
      return () => resizeObserver.disconnect();
    }
  });
</script>

<div class="chart-wrapper" bind:this={chartContainer}>
  <!-- Y-axis labels (outside chart) -->
  {#if chartData.length > 0 && chartInfo}
    {@const { minValue, maxValue, valueRange } = chartInfo}
    <div class="y-axis-labels">
      {#each Array.from({ length: 5 }, (_, i) => i) as i}
        {@const value = maxValue - (i * valueRange) / 4}
        <div class="y-label">{formatCurrency(value)}</div>
      {/each}
    </div>
  {/if}

  <div class="chart-area">
    <svg width={chartWidth} height={chartHeight} class="chart">
      {#if chartData.length > 0 && chartInfo}
        {@const { points, pathData, minValue, maxValue, valueRange } = chartInfo}
        
        <!-- Grid lines -->
        {#each Array.from({ length: 5 }, (_, i) => i) as i}
          {@const y = padding + (i * (chartHeight - 2 * padding)) / 4}
          <line 
            x1={padding} 
            y1={y} 
            x2={chartWidth - padding} 
            y2={y} 
            stroke="#333" 
            stroke-width="1"
            opacity="0.3"
          />
        {/each}

        <!-- Chart line -->
        <path 
          d={pathData} 
          stroke="#00ff88" 
          stroke-width="3" 
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Gradient fill underneath the line -->
        {#if pathData}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#00ff88;stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:#00ff88;stop-opacity:0.05" />
            </linearGradient>
          </defs>
          <path 
            d={`${pathData} L ${points[points.length - 1].x},${chartHeight - padding} L ${points[0].x},${chartHeight - padding} Z`}
            fill="url(#chartGradient)"
            stroke="none"
          />
        {/if}

        <!-- Data points -->
        {#each points as point}
          <circle 
            cx={point.x} 
            cy={point.y} 
            r="4" 
            fill="#00ff88"
            stroke="#1a1a1a"
            stroke-width="2"
            on:mouseover={(e) => handleMouseOver(point, e)}
            on:mousemove={(e) => handleMouseOver(point, e)}
            on:mouseout={handleMouseOut}
          />
        {/each}
      {/if}
    </svg>
  </div>

  <!-- X-axis labels (outside chart) -->
  {#if chartData.length > 0 && chartInfo}
    {@const { points } = chartInfo}
    <div class="x-axis-labels">
      {#each points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0) as point, i}
        <div class="x-label">{formatDate(point.date)}</div>
      {/each}
    </div>
  {/if}
  
  {#if chartData.length === 0}
    <div class="no-data">
      <p>No data available for chart</p>
    </div>
  {/if}

  {#if hoveredPoint}
    <div class="tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
      <div><strong>{formatCurrency(hoveredPoint.value)}</strong></div>
      <div>{formatDate(hoveredPoint.date)}</div>
    </div>
  {/if}
</div>

<style>
  .chart-wrapper {
    width: 100%;
    position: relative;
    display: grid;
    grid-template-columns: 60px 1fr;
    grid-template-rows: 1fr auto;
    gap: 10px;
  }

  .chart-area {
    grid-column: 2;
    grid-row: 1;
    position: relative;
  }

  .chart {
    background: #1a1a1a;
    border-radius: 8px;
    border: 1px solid #333;
    width: 100%;
    height: 100%;
  }

  .no-data {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: #888;
    font-style: italic;
  }

  .tooltip {
    position: absolute;
    pointer-events: none;
    background: #222;
    color: #fff;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.95rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    border: 1px solid #00ff88;
    z-index: 10;
    min-width: 90px;
    text-align: center;
    white-space: nowrap;
  }

  .y-axis-labels {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 0;
    align-items: flex-end;
  }

  .y-label {
    color: #888;
    font-size: 12px;
    text-align: right;
    padding-right: 10px;
  }

  .x-axis-labels {
    grid-column: 2;
    grid-row: 2;
    display: flex;
    justify-content: space-between;
    padding: 10px 40px 0 40px;
  }

  .x-label {
    color: #888;
    font-size: 11px;
    text-align: center;
    flex: 1;
  }

  @media (max-width: 768px) {
    .chart-wrapper {
      max-width: 100%;
    }
  }
</style> 