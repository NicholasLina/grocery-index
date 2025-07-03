<!--
  Price Chart Component - Canadian Grocery Index
  
  A reusable SVG-based line chart component for displaying price history data.
  Features interactive tooltips, gradient fills, and responsive design.
  
  Props:
  - data: Array of price data points with REF_DATE and VALUE properties
  
  Features:
  - Interactive tooltips showing date and price on hover
  - Gradient fill underneath the line
  - Responsive design that adapts to container size
  - Smooth animations and transitions
  - Customizable colors and styling
  
  @author Canadian Grocery Index Team
  @version 1.0.0
-->

<script lang="ts">
  import { onMount } from "svelte";
  import { format, parseISO } from "date-fns";

  // Props
  // Array of price data points to display
  export let data: Array<{ REF_DATE: string; VALUE: number }> = [];

  // Internal state
  // Reference to the chart container element
  let chartContainer: HTMLDivElement;
  // Reference to the SVG element
  let svg: SVGElement;
  // Tooltip state
  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipDate = "";
  let tooltipValue = "";
  let activePoint: any = null;
  // Chart dimensions
  let width = 0; // Will be set by container measurement
  let height = 400; // Fixed height for now
  // Chart margins for axis labels
  let margin = { top: 20, right: 0, bottom: 40, left: 0 };
  // Initialize chartData as empty array
  let chartData: any[] = [];
  // Initialize chart dimensions
  let chartWidth = 0;
  let chartHeight = 0;

  // Chart configuration
  // Chart colors
  const colors = {
    line: "#3b82f6",
    fill: "url(#gradient)",
    grid: "#374151",
    text: "#9ca3af",
  };

  // Reactive statements
  // Wait for container to be sized before processing data
  $: containerReady = width > 0;

  // Chart dimensions excluding margins
  $: {
    chartWidth = Math.max(0, width - margin.left - margin.right);
    chartHeight = Math.max(0, height - margin.top - margin.bottom);
  }

  // Reactive statement to update width when container is available
  $: if (chartContainer) {
    const containerWidth = chartContainer.clientWidth;
    width = containerWidth > 0 ? containerWidth : 800; // Use container width or fallback
  }

  // Processed chart data with calculated positions
  $: {
    if (data && data.length >= 2 && containerReady && height > 0) {
      const processedData = processData();
      chartData = processedData;
    } else {
      chartData = [];
    }
  }

  // Processes raw data into chart-ready format with calculated positions
  // Returns: Array of data points with x, y coordinates
  function processData() {
    // Skip filtering for now - use raw data
    const filteredData = data;

    if (filteredData.length < 2) {
      console.warn(
        "PriceChart: Not enough data points to render chart.",
        filteredData,
      );
      return [];
    }

    if (!(chartWidth > 0 && chartHeight > 0)) {
      console.warn(
        "PriceChart: chartWidth or chartHeight is not positive.",
        chartWidth,
        chartHeight,
      );
      return [];
    }

    // Sort data by date (oldest to newest)
    const sortedData = [...filteredData].sort(
      (a, b) => new Date(a.REF_DATE).getTime() - new Date(b.REF_DATE).getTime(),
    );

    // Use full SVG width (chartWidth) without any x-axis offset
    const xScale = chartWidth / (sortedData.length - 1);
    const minPrice = Math.min(...sortedData.map((d) => d.VALUE));
    const maxPrice = Math.max(...sortedData.map((d) => d.VALUE));
    const priceRange = maxPrice - minPrice;
    const yScale = priceRange > 0 ? chartHeight / priceRange : 1;

    // Map data to chart coordinates - use full SVG width from 0 to chartWidth
    const result = sortedData.map((point, index) => ({
      ...point,
      x: index * xScale, // Start from 0, use full SVG width
      y: margin.top + chartHeight - (point.VALUE - minPrice) * yScale,
    }));

    return result;
  }

  // Generates the SVG path for the line chart
  // Returns: SVG path string
  function generatePath(): string {
    if (chartData.length === 0) return "";

    // Use the actual container width for the chart line
    const actualWidth = chartContainer ? chartContainer.clientWidth : width;
    console.log("Chart line dimensions:", { width, chartWidth, actualWidth });

    const points = chartData.map((point) => `${point.x},${point.y}`);
    return `M ${points.join(" L ")}`;
  }

  // Generates the SVG path for the gradient fill area
  // Returns: SVG path string
  function generateFillPath(): string {
    if (chartData.length === 0) return "";

    const points = chartData.map((point) => `${point.x},${point.y}`);
    const firstPoint = chartData[0];
    const lastPoint = chartData[chartData.length - 1];

    // Use the actual chart area height from the container
    const actualChartHeight = chartContainer
      ? chartContainer.clientHeight
      : height;
    console.log("Gradient dimensions:", {
      height,
      chartHeight,
      actualChartHeight,
      margin,
    });
    return `M ${firstPoint.x},${actualChartHeight} L ${points.join(" L ")} L ${lastPoint.x},${actualChartHeight} Z`;
  }

  // Handles mouse move events to show tooltip
  // Parameters:
  //   event - Mouse event object
  function handleMouseMove(event: MouseEvent): void {
    if (chartData.length === 0) return;

    const rect = chartContainer.getBoundingClientRect();
    const mouseX = event.clientX - (rect.left + 50);

    // Find the closest data point
    const closestPoint = chartData.reduce((closest, point) => {
      const distance = Math.abs(point.x - mouseX);
      return distance < Math.abs(closest.x - mouseX) ? point : closest;
    });

    // Position tooltip at mouse cursor
    tooltipX = event.clientX - rect.left;
    tooltipY = event.clientY - rect.top - 40;
    tooltipVisible = true;

    // Update tooltip content
    tooltipDate = formatDate(closestPoint.REF_DATE);
    tooltipValue = `$${closestPoint.VALUE.toFixed(2)}`;
    activePoint = closestPoint;
  }

  // Handles mouse leave events to hide tooltip
  function handleMouseLeave(): void {
    tooltipVisible = false;
    activePoint = null;
  }

  // Formats a date string to a readable format
  // Parameters:
  //   dateString - Date string in YYYY-MM format
  // Returns: Formatted date string
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
    });
  }

  // Generate grid lines
  $: gridLines =
    chartData.length > 0
      ? (() => {
          const lines = [];
          const numLines = 5;

          for (let i = 0; i <= numLines; i++) {
            const y = margin.top + (i * chartHeight) / numLines;
            lines.push({
              x1: 0, // Start from left edge of SVG
              y1: y,
              x2: chartWidth, // End at right edge of SVG
              y2: y,
            });
          }

          return lines;
        })()
      : [];

  // Lifecycle hook that runs when the component mounts
  // Sets up the chart dimensions and handles window resize
  onMount(() => {
    // Chart is ready with fixed dimensions
    console.log("PriceChart mounted with width:", width);

    // Optional: Add resize listener for future responsive behavior
    // window.addEventListener('resize', () => {
    //   // Could update width here if needed
    // });

    // return () => {
    //   window.removeEventListener('resize', updateDimensions);
    // };
  });
</script>

<div class="chart-wrapper" bind:this={chartContainer}>
  <div class="chart-area">
    <svg
      role="img"
      width={chartWidth}
      height={chartHeight}
      class="chart"
      on:mousemove={handleMouseMove}
      on:mouseenter={handleMouseMove}
      on:mouseleave={handleMouseLeave}
    >
      {#if chartData.length > 0}
        <!-- Grid lines -->
        {#each gridLines as line}
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#333"
            stroke-width="1"
            opacity="0.3"
          />
        {/each}

        <!-- Chart line -->
        <path
          d={generatePath()}
          stroke="#00ff88"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Gradient fill underneath the line -->
        {#if generateFillPath()}
          <defs>
            <linearGradient
              id="chartGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" style="stop-color:#00ff88;stop-opacity:0.3" />
              <stop
                offset="100%"
                style="stop-color:#00ff88;stop-opacity:0.05"
              />
            </linearGradient>
          </defs>
          <path
            d={generateFillPath()}
            fill="url(#chartGradient)"
            stroke="none"
          />
        {/if}

        {#if tooltipVisible && activePoint}
          <circle
            cx={activePoint.x}
            cy={activePoint.y}
            r="6"
            fill="#00ff88"
            stroke="#fff"
            stroke-width="2"
            style="pointer-events: none;"
          />
        {/if}
      {/if}
    </svg>

    <!-- Y-axis labels as overlay -->
    {#if chartData.length > 0}
      <div class="y-axis-labels-overlay">
        {#each Array.from({ length: 5 }, (_, i) => {
          const value = Math.max(...chartData.map((d) => d.VALUE)) - (i * (Math.max(...chartData.map((d) => d.VALUE)) - Math.min(...chartData.map((d) => d.VALUE)))) / 4;
          return { i, value };
        }) as item}
          <div class="y-label-overlay">{`$${item.value.toFixed(2)}`}</div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- X-axis labels (outside chart) -->
  {#if chartData.length > 0}
    <div class="x-axis-labels">
      {#each chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 6)) === 0) as point, i}
        <div class="x-label">{formatDate(point.REF_DATE)}</div>
      {/each}
    </div>
  {/if}

  {#if chartData.length === 0}
    <div class="no-data">
      <p>No data available for chart</p>
    </div>
  {/if}

  {#if tooltipVisible}
    <div class="tooltip tooltip-top-right">
      <div><strong>{tooltipValue}</strong></div>
      <div>{tooltipDate}</div>
    </div>
  {/if}
</div>

<style>
  .chart-wrapper {
    width: 100%;
    height: 100%;
    min-height: 400px;
    position: relative;
    display: grid;
    grid-template-columns: 1fr; /* Single column to use full width */
    grid-template-rows: 1fr auto;
    gap: 10px;
  }

  .chart-area {
    grid-column: 1; /* Use full width */
    grid-row: 1;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 300px;
    padding-left: 50px; /* Restore padding for y-axis labels */
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
    background: #222a;
    color: #fff;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.95rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    border: 1px solid #00ff88;
    z-index: 10;
    min-width: 90px;
    text-align: center;
    white-space: nowrap;
  }

  .tooltip-top-right {
    left: auto !important;
    right: 10px;
    top: 10px;
    bottom: auto;
    transform: none !important;
  }

  .y-axis-labels-overlay {
    position: absolute;
    top: 0;
    left: 0; /* Position within the padded area */
    width: 45px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none; /* Don't interfere with chart interactions */
  }

  .y-label-overlay {
    color: #888;
    font-size: 11px;
    text-align: right;
    padding-right: 5px;
  }

  .x-axis-labels {
    grid-column: 1; /* Use full width */
    grid-row: 2;
    display: flex;
    justify-content: space-between;
    padding: 10px 20px 0 20px; /* Reduced padding */
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
