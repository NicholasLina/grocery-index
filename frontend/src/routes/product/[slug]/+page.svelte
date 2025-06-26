<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { format, parseISO } from 'date-fns';
  import PriceChart from '$lib/components/PriceChart.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  interface PriceData {
    _id: string;
    REF_DATE: string;
    GEO: string;
    Products: string;
    VECTOR: string;
    VALUE: number;
  }

  interface ProductStats {
    currentPrice: number;
    previousPrice: number;
    change: number;
    changePercent: number;
    highestPrice: number;
    lowestPrice: number;
    averagePrice: number;
    priceVolatility: number;
    dataPoints: number;
  }

  let productData: PriceData[] = [];
  let productName: string = '';
  let geo: string = '';
  let loading = true;
  let error = '';
  let stats: ProductStats | null = null;

  // Reactive statement to sort data
  $: sortedProductData = productData.sort((a, b) => new Date(b.REF_DATE).getTime() - new Date(a.REF_DATE).getTime());

  // Precompute all display logic for the table
  $: tableRows = sortedProductData.map((item, index, array) => {
    const prev = array[index + 1];
    const change = prev ? item.VALUE - prev.VALUE : null;
    const changePct = prev && prev.VALUE !== 0 ? ((item.VALUE - prev.VALUE) / prev.VALUE) * 100 : null;
    return {
      ...item,
      change,
      changeClass: change == null ? '' : change > 0 ? 'positive' : change < 0 ? 'negative' : '',
      changeDisplay: change == null ? '-' : (change > 0 ? '+' : '') + formatCurrency(change),
      changePct,
      changePctClass: changePct == null ? '' : changePct > 0 ? 'positive' : changePct < 0 ? 'negative' : '',
      changePctDisplay: changePct == null ? '-' : (changePct > 0 ? '+' : '') + changePct.toFixed(1) + '%'
    };
  });

  const API_BASE = 'http://localhost:3000/api/statcan';

  async function fetchProductData(product: string, geo: string) {
    try {
      const response = await fetch(`${API_BASE}?geo=${encodeURIComponent(geo)}&product=${encodeURIComponent(product)}`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`Error fetching data for ${product}:`, err);
      return [];
    }
  }

  function calculateStats(data: PriceData[]): ProductStats | null {
    if (data.length === 0) return null;

    // Sort by date (oldest to newest)
    const sortedData = data.sort((a, b) => new Date(a.REF_DATE).getTime() - new Date(b.REF_DATE).getTime());
    
    const values = sortedData.map(d => d.VALUE);
    const currentPrice = sortedData[sortedData.length - 1].VALUE;
    const previousPrice = sortedData[sortedData.length - 2]?.VALUE || currentPrice;
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    
    const highestPrice = Math.max(...values);
    const lowestPrice = Math.min(...values);
    const averagePrice = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate price volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - averagePrice, 2), 0) / values.length;
    const priceVolatility = Math.sqrt(variance);

    return {
      currentPrice,
      previousPrice,
      change,
      changePercent,
      highestPrice,
      lowestPrice,
      averagePrice,
      priceVolatility,
      dataPoints: data.length
    };
  }

  function formatProductTitle(productName: string) {
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

  function formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  function formatDate(dateString: string): string {
    return format(parseISO(dateString), 'MMM yyyy');
  }

  function calculatePercentageChange(currentValue: number, previousValue: number): string {
    if (previousValue === 0) return '-';
    const changePercent = ((currentValue - previousValue) / previousValue) * 100;
    return changePercent.toFixed(1) + '%';
  }

  function formatChangeWithSign(currentValue: number, previousValue: number): string {
    const change = currentValue - previousValue;
    if (change > 0) {
      return '+' + formatCurrency(change);
    } else if (change < 0) {
      return formatCurrency(change);
    } else {
      return '-';
    }
  }

  function formatPercentageWithSign(currentValue: number, previousValue: number): string {
    if (previousValue === 0) return '-';
    const changePercent = ((currentValue - previousValue) / previousValue) * 100;
    if (changePercent > 0) {
      return '+' + changePercent.toFixed(1) + '%';
    } else if (changePercent < 0) {
      return changePercent.toFixed(1) + '%';
    } else {
      return '-';
    }
  }

  function getChangeDisplay(currentValue: number, previousValue: number) {
    if (!previousValue) return { value: '-', class: '' };
    
    const change = currentValue - previousValue;
    if (change > 0) {
      return { value: '+' + formatCurrency(change), class: 'positive' };
    } else if (change < 0) {
      return { value: formatCurrency(change), class: 'negative' };
    } else {
      return { value: '-', class: '' };
    }
  }

  function getPercentageDisplay(currentValue: number, previousValue: number) {
    if (!previousValue) return { value: '-', class: '' };
    
    const changePercent = ((currentValue - previousValue) / previousValue) * 100;
    if (changePercent > 0) {
      return { value: '+' + changePercent.toFixed(1) + '%', class: 'positive' };
    } else if (changePercent < 0) {
      return { value: changePercent.toFixed(1) + '%', class: 'negative' };
    } else {
      return { value: '-', class: '' };
    }
  }

  onMount(async () => {
    const params = $page.params;
    const slug = params.slug;
    
    if (slug) {
      // Decode the slug to get product name and geo
      const decoded = decodeURIComponent(slug);
      const [product, geoParam] = decoded.split('|');
      
      if (product && geoParam) {
        productName = product;
        geo = geoParam;
        
        try {
          const data = await fetchProductData(product, geo);
          productData = data;
          stats = calculateStats(data);
        } catch (err) {
          error = 'Failed to load product data';
          console.error('Error loading product data:', err);
        } finally {
          loading = false;
        }
      } else {
        error = 'Invalid product URL';
        loading = false;
      }
    } else {
      error = 'No product specified';
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>{productName ? formatProductTitle(productName).mainTitle : 'Product Details'} - Canadian Grocery Index</title>
  <meta name="description" content="Detailed price history and statistics for {productName}" />
</svelte:head>

<main class="container">
  <header class="header">
    <button class="back-btn" on:click={() => goto('/')}>← Back to Dashboard</button>
    <h1>Product Details</h1>
  </header>

  {#if error}
    <div class="error">
      {error}
    </div>
  {/if}

  {#if loading}
    <LoadingSpinner />
  {:else if productData.length > 0 && stats}
    {@const { mainTitle, subtitle } = formatProductTitle(productName)}
    
    <div class="product-header">
      <div class="product-info">
        <h2 class="product-name">{mainTitle}</h2>
        {#if subtitle}
          <p class="product-subtitle">{subtitle}</p>
        {/if}
        <span class="location">{geo}</span>
      </div>
      
      <div class="current-price-display">
        <div class="price">
          <span class="currency">$</span>
          <span class="amount">{stats.currentPrice.toFixed(2)}</span>
        </div>
        <div class="change" class:positive={stats.changePercent > 0} class:negative={stats.changePercent < 0}>
          {stats.change > 0 ? '+' : ''}{stats.change.toFixed(2)} ({stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%)
        </div>
      </div>
    </div>

    <!-- Statistics Grid -->
    <section class="stats-section">
      <h3>Price Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-label">Previous Price</div>
          <div class="stat-value">{formatCurrency(stats.previousPrice)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-label">Highest Price</div>
          <div class="stat-value">{formatCurrency(stats.highestPrice)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📉</div>
          <div class="stat-label">Lowest Price</div>
          <div class="stat-value">{formatCurrency(stats.lowestPrice)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-label">Average Price</div>
          <div class="stat-value">{formatCurrency(stats.averagePrice)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-label">Price Volatility</div>
          <div class="stat-value">{formatCurrency(stats.priceVolatility)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📏</div>
          <div class="stat-label">Price Range</div>
          <div class="stat-value">{formatCurrency(stats.highestPrice - stats.lowestPrice)}</div>
        </div>
      </div>
    </section>

    <!-- Price Chart -->
    <section class="chart-section">
      <h3>Price History</h3>
      <div class="chart-container">
        <PriceChart data={productData} />
      </div>
    </section>

    <!-- Historical Data Table -->
    <section class="table-section">
      <h3>Historical Data</h3>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Price</th>
              <th>Change</th>
              <th>Change %</th>
            </tr>
          </thead>
          <tbody>
            {#each tableRows as row}
              <tr>
                <td>{formatDate(row.REF_DATE)}</td>
                <td>{formatCurrency(row.VALUE)}</td>
                <td class={row.changeClass}>{row.changeDisplay}</td>
                <td class={row.changePctClass}>{row.changePctDisplay}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {:else}
    <div class="no-data">
      <p>No data available for this product</p>
    </div>
  {/if}
</main>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0a;
    min-height: 100vh;
    color: #ffffff;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #333;
  }

  .back-btn {
    background: #333;
    border: none;
    color: #ffffff;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  .back-btn:hover {
    background: #444;
    transform: translateX(-2px);
  }

  h1 {
    font-size: 2rem;
    margin: 0;
    background: linear-gradient(45deg, #00ff88, #00ccff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .error {
    background: #ff4444;
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: center;
  }

  .product-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding: 20px;
    background: #1a1a1a;
    border-radius: 12px;
    border: 1px solid #333;
  }

  .product-name {
    font-size: 1.8rem;
    margin: 0 0 8px 0;
    color: #ffffff;
  }

  .product-subtitle {
    font-size: 1rem;
    color: #888;
    margin: 0 0 10px 0;
  }

  .location {
    background: #333;
    color: #888;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .current-price-display {
    text-align: right;
  }

  .price {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    margin-bottom: 5px;
  }

  .currency {
    font-size: 1.5rem;
    color: #888;
    margin-right: 2px;
  }

  .amount {
    font-size: 2.5rem;
    font-weight: 700;
    color: #ffffff;
  }

  .change {
    font-size: 1.2rem;
    font-weight: 600;
  }

  .change.positive {
    color: #ff4444;
  }

  .change.negative {
    color: #00ff88;
  }

  .stats-section, .chart-section, .table-section {
    margin-bottom: 40px;
  }

  h3 {
    font-size: 1.4rem;
    margin: 0 0 20px 0;
    color: #ffffff;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 10px;
  }

  .stat-card {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 15px;
    text-align: center;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .stat-icon {
    font-size: 1.8rem;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: #ffffff;
  }

  .chart-container {
    background: transparent;
    border: none;
    padding: 0;
  }

  .table-container {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 20px;
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th,
  .data-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #333;
  }

  .data-table th {
    background: #2a2a2a;
    font-weight: 600;
    color: #00ff88;
  }

  .data-table tr:hover {
    background: #2a2a2a;
  }

  .positive {
    color: #ff4444;
  }

  .negative {
    color: #00ff88;
  }

  .no-data {
    text-align: center;
    padding: 60px;
    color: #888;
    font-style: italic;
  }

  @media (max-width: 768px) {
    .container {
      padding: 10px;
    }

    .product-header {
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }

    .current-price-display {
      text-align: center;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }

    h1 {
      font-size: 1.5rem;
    }

    .product-name {
      font-size: 1.4rem;
    }
  }
</style> 