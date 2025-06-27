<!--
  Price Card Component - Canadian Grocery Index
  
  A reusable card component for displaying product price information
  with mini-charts and navigation to detailed product pages.
  
  Props:
  - product: Product name
  - currentPrice: Current price value
  - change: Absolute price change
  - changePercent: Percentage price change
  - geo: Geographic location
  - data: Array of price data points for mini-chart
  
  Features:
  - Interactive mini-chart showing price history
  - Color-coded price changes (red for increases, green for decreases)
  - Click navigation to detailed product page
  - Responsive design for mobile and desktop
  - Hover effects and animations
  
  @author Canadian Grocery Index Team
  @version 1.0.0
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { format } from 'date-fns';
  import { goto } from '$app/navigation';

  // Props interface for the PriceCard component
  export let product: {
    // Product name and description
    product: string;
    // Current (most recent) price
    currentPrice: number;
    // Previous period price
    previousPrice: number;
    // Absolute price change
    change: number;
    // Percentage price change
    changePercent: number;
    // Geographic location
    geo: string;
    // Full price history data for mini-chart
    data: any[];
  };

  // Handles click events on the price card
  // Navigates to the product detail page with encoded product and geo information
  function handleClick(): void {
    // Create a URL-friendly slug with product name and geo
    const slug = encodeURIComponent(`${product.product}|${product.geo}`);
    goto(`/product/${slug}`);
  }

  // Formats a product title by capitalizing words and handling subtitles
  // Parameters:
  //   productName - Raw product name from API
  // Returns: Object with mainTitle and subtitle
  function formatProductTitle(productName: string): { mainTitle: string; subtitle: string } {
    // Handle undefined or null product names
    if (!productName || typeof productName !== 'string') {
      return {
        mainTitle: 'Unknown Product',
        subtitle: ''
      };
    }

    const parts = productName.split(',');
    if (parts.length > 1) {
      return {
        mainTitle: parts[0].trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
        subtitle: parts.slice(1).join(',').trim()
      };
    } else {
      return {
        mainTitle: productName.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
        subtitle: ''
      };
    }
  }

  // Creates mini-chart data for displaying recent price history
  // Parameters:
  //   data - Array of price data points
  // Returns: Chart data object or null if insufficient data
  function createMiniChart(data: any[]): any {
    // Handle undefined or null data
    if (!data || !Array.isArray(data) || data.length < 2) return null;
    
    // Sort data by date (oldest to newest)
    const sortedData = data.sort((a, b) => new Date(a.REF_DATE).getTime() - new Date(b.REF_DATE).getTime());
    
    // Take the last 12 data points for the mini chart
    const chartData = sortedData.slice(-12);
    const values = chartData.map(d => d.VALUE);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;
    
    // Chart dimensions - full width, no padding
    const width = 280;
    const height = 50;
    
    // Calculate x positions to span full width
    const xStep = width / (chartData.length - 1);
    const yScale = height / valueRange;
    
    const points = chartData.map((d, i) => ({
      x: i * xStep, // This ensures first point is at x=0 and last point is at x=width
      y: height - (d.VALUE - minValue) * yScale,
      value: d.VALUE
    }));
    
    const pathData = points.length > 1 
      ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
      : '';
    
    // Create area path for gradient fill - extend to full width
    const areaPathData = points.length > 1 
      ? `M 0,${height} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${width},${height} Z`
      : '';
    
    return { pathData, areaPathData, points, minValue, maxValue };
  }

  // Reactive statements for computed values
  // Whether the price change is positive (increase)
  $: isPositive = product?.changePercent > 0;
  // Whether the price change is negative (decrease)
  $: isNegative = product?.changePercent < 0;
  // Color for price change indicators (red for increases, green for decreases)
  $: changeColor = isPositive ? '#ff4444' : isNegative ? '#00ff88' : '#888';
  // Formatted product title with main title and subtitle
  $: formattedTitle = formatProductTitle(product?.product || '');
  // Main product title (capitalized)
  $: mainTitle = formattedTitle.mainTitle;
  // Product subtitle (if any)
  $: subtitle = formattedTitle.subtitle;
  // Mini-chart data for the price history visualization
  $: miniChart = createMiniChart(product?.data || []);
  
  // Debug: Log the color for this product
  $: console.log(`Product: ${product?.product || 'Unknown'}, Change: ${product?.changePercent || 0}%, Color: ${changeColor}`);
</script>

<div class="price-card" on:click={handleClick} style="--change-color: {changeColor}">
  <div class="card-header">
    <div class="product-info">
      <h3 class="product-name">{mainTitle}</h3>
      {#if subtitle}
        <p class="product-subtitle">{subtitle}</p>
      {/if}
    </div>
    <span class="location">{product?.geo || 'Unknown Location'}</span>
  </div>
  
  <!-- Mini Chart -->
  {#if miniChart}
    <div class="mini-chart-container">
      <svg class="mini-chart" viewBox="0 0 280 50" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chartGradient-{(product?.product || 'unknown').replace(/\s+/g, '-')}-{product?._id || 'unknown'}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:{changeColor};stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:{changeColor};stop-opacity:0.05" />
          </linearGradient>
        </defs>
        
        <!-- Gradient fill area -->
        <path 
          d={miniChart.areaPathData} 
          fill="url(#chartGradient-{(product?.product || 'unknown').replace(/\s+/g, '-')}-{product?._id || 'unknown'})"
          stroke="none"
        />
        
        <!-- Line chart -->
        <path 
          d={miniChart.pathData} 
          stroke={changeColor}
          stroke-width="2" 
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        
        <!-- Data points -->
        {#each miniChart.points as point}
          <circle 
            cx={point.x} 
            cy={point.y} 
            r="1.5" 
            fill={changeColor}
            stroke="none"
          />
        {/each}
      </svg>
    </div>
  {/if}
  
  <div class="price-info">
    <div class="current-price">
      <span class="currency">$</span>
      <span class="amount">{product?.currentPrice?.toFixed(2) || '0.00'}</span>
      <span class="price-change" style="color: {changeColor}">
        {product?.change > 0 ? '+' : ''}{product?.change?.toFixed(2) || '0.00'} ({product?.changePercent > 0 ? '+' : ''}{product?.changePercent?.toFixed(1) || '0.0'}%)
      </span>
    </div>
  </div>
  
  <div class="previous-price">
    Previous: ${product?.previousPrice?.toFixed(2) || '0.00'}
  </div>
</div>

<style>
  .price-card {
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
    border: 1px solid #333;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .price-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--change-color);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .price-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
    border-color: var(--change-color);
  }

  .price-card:hover::before {
    opacity: 1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
  }

  .product-info {
    flex: 1;
    margin-right: 10px;
  }

  .product-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 4px 0;
    color: #ffffff;
    line-height: 1.3;
    letter-spacing: 0.5px;
  }

  .product-subtitle {
    font-size: 0.85rem;
    color: #888;
    margin: 0;
    line-height: 1.2;
    font-weight: 400;
  }

  .location {
    background: #333;
    color: #888;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .price-info {
    display: flex;
    justify-content: flex-start;
    align-items: baseline;
    margin-bottom: 8px;
  }

  .current-price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
  }

  .currency {
    font-size: 1.2rem;
    color: #888;
    margin-right: 2px;
  }

  .amount {
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
  }

  .price-change {
    font-size: 1.1rem;
    font-weight: 500;
    margin-left: 8px;
  }

  .previous-price {
    color: #888;
    font-size: 0.9rem;
    margin-bottom: 10px;
  }

  .mini-chart-container {
    display: flex;
    justify-content: center;
    margin: 15px 0;
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    width: 100%;
  }

  .mini-chart {
    background: transparent;
    width: 100%;
    height: 50px;
  }

  @media (max-width: 768px) {
    .price-card {
      padding: 15px;
    }

    .product-name {
      font-size: 1rem;
    }

    .product-subtitle {
      font-size: 0.8rem;
    }

    .amount {
      font-size: 1.6rem;
    }

    .price-change {
      font-size: 1rem;
    }

    .mini-chart-container {
      margin: 10px 0;
      padding: 8px;
    }
  }
</style> 