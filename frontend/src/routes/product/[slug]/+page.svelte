<!--
  Product Detail Page - Canadian Grocery Index
  
  This page displays detailed information about a specific grocery product,
  including historical price data, statistics, and interactive charts.
  
  Features:
  - Full price history visualization
  - Statistical analysis (mean, median, min, max, volatility)
  - Interactive price chart with tooltips
  - Data table with all historical records
  - Responsive design for mobile and desktop
  
  @author Canadian Grocery Index Team
  @version 1.0.0
-->

<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { format, parseISO } from "date-fns";
  import PriceChart from "$lib/components/PriceChart.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  // Interface representing a single price data point from the API
  interface PriceData {
    // Unique identifier for the record
    _id: string;
    // Reference date in YYYY-MM format
    REF_DATE: string;
    // Geographic location (e.g., 'Canada', 'Ontario')
    GEO: string;
    // Product name and description
    Products: string;
    // Vector identifier from StatCan
    VECTOR: string;
    // Price value
    VALUE: number;
  }

  // Interface representing calculated statistics for a product
  interface ProductStats {
    // Product name
    product: string;
    // Geographic location
    geo: string;
    // Current (most recent) price
    currentPrice: number;
    // Previous period price
    previousPrice: number;
    // Absolute price change
    change: number;
    // Percentage price change
    changePercent: number;
    // Mean price over all periods
    meanPrice: number;
    // Median price over all periods
    medianPrice: number;
    // Minimum price recorded
    minPrice: number;
    // Maximum price recorded
    maxPrice: number;
    // Price volatility (standard deviation)
    volatility: number;
    // Total number of data points
    dataPoints: number;
    // Full price history data
    data: PriceData[];
  }

  // Reactive state variables
  // Product slug from URL parameters
  $: productSlug = $page.params.slug;
  // Decoded product name and geo from URL slug
  $: [productName, geo] = decodeURIComponent(productSlug).split("|");
  // Formatted product title with main title and subtitle
  $: formattedTitle = formatProductTitle(productStats?.product || "");
  // Main product title (capitalized)
  $: mainTitle = formattedTitle.mainTitle;
  // Product subtitle (if any)
  $: subtitle = formattedTitle.subtitle;
  // Loading state indicator
  let loading = true;
  // Error message if data loading fails
  let error = "";
  // Product statistics and data
  let productStats: ProductStats | null = null;
  // Base URL for the API endpoints
  const API_BASE = "http://localhost:3000/api/statcan";

  // --- REGION FILTER STATE (copied from home page, with persistence) ---
  let geoValues: string[] = [];
  let selectedGeo: string = "Canada";

  // Fetches all available geographic locations from the API
  async function fetchGeoValues(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE}/debug`);
      const data = await response.json();
      return data.geoValues || [];
    } catch (err) {
      console.error("❌ Error fetching geo values:", err);
      return ["Canada"]; // Fallback to Canada if API fails
    }
  }

  // Handles geographic location change events
  async function handleGeoChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    selectedGeo = target.value;
    geo = selectedGeo;
    localStorage.setItem("selectedGeo", selectedGeo);
    await loadProductData();
  }

  // On mount, fetch geo values and load product data for the initial geo
  onMount(async () => {
    geoValues = await fetchGeoValues();
    // Try to load from localStorage, fallback to 'Canada'
    const storedGeo = localStorage.getItem("selectedGeo");
    selectedGeo = storedGeo || "Canada";
    geo = selectedGeo;
    await loadProductData();
  });

  // Helper function to calculate standard deviation
  // Parameters:
  //   values - Array of numeric values
  // Returns: Standard deviation value
  function calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
  }

  // Helper function to calculate median
  // Parameters:
  //   values - Array of numeric values
  // Returns: Median value
  function calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  // Fetches price data for the current product and geo
  // Returns: Array of price data points
  async function fetchProductData(): Promise<PriceData[]> {
    try {
      const response = await fetch(
        `${API_BASE}?product=${encodeURIComponent(productName)}&geo=${encodeURIComponent(geo)}`,
      );
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(
        `❌ Error fetching data for ${productName} in ${geo}:`,
        err,
      );
      return [];
    }
  }

  // Calculates comprehensive statistics from price data
  // Parameters:
  //   data - Array of price data points
  // Returns: Calculated product statistics or null if insufficient data
  function calculateStats(data: PriceData[]): ProductStats | null {
    if (data.length === 0) return null;

    // Sort by date to get most recent first
    const sortedData = data.sort(
      (a, b) => new Date(b.REF_DATE).getTime() - new Date(a.REF_DATE).getTime(),
    );

    const prices = sortedData.map((d) => d.VALUE);
    const currentPrice = sortedData[0].VALUE;
    const previousPrice =
      sortedData.length > 1 ? sortedData[1].VALUE : currentPrice;
    const change = currentPrice - previousPrice;
    const changePercent =
      previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

    return {
      product: sortedData[0].Products,
      geo: sortedData[0].GEO,
      currentPrice,
      previousPrice,
      change,
      changePercent,
      meanPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      medianPrice: calculateMedian(prices),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      volatility: calculateStandardDeviation(prices),
      dataPoints: prices.length,
      data: sortedData,
    };
  }

  // Loads product data and calculates statistics
  async function loadProductData(): Promise<void> {
    loading = true;
    error = "";

    try {
      const data = await fetchProductData();
      if (data.length === 0) {
        error = "No data found for this product";
        return;
      }

      productStats = calculateStats(data);
      if (!productStats) {
        error = "Unable to calculate statistics for this product";
      }
    } catch (err) {
      error = "Failed to load product data";
      console.error("❌ Error loading product data:", err);
    } finally {
      loading = false;
    }
  }

  // Parameters:
  //   productName - Raw product name from API
  // Returns: Object with mainTitle and subtitle
  function formatProductTitle(productName: string): {
    mainTitle: string;
    subtitle: string;
  } {
    // Handle undefined or null product names
    if (!productName || typeof productName !== "string") {
      return {
        mainTitle: "Unknown Product",
        subtitle: "",
      };
    }

    const parts = productName.split(",");
    if (parts.length > 1) {
      return {
        mainTitle: parts[0]
          .trim()
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" "),
        subtitle: parts.slice(1).join(",").trim(),
      };
    } else {
      return {
        mainTitle: productName
          .trim()
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" "),
        subtitle: "",
      };
    }
  }

  // Helper function to format currency
  function formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  // Helper function to format date
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
    });
  }

  $: if (productStats && productStats.data) {
    console.log("PriceChart data:", productStats.data);
  }
</script>

<svelte:head>
  <title
    >{productName ? productName : "Product Details"} - Canadian Grocery Index</title
  >
  <meta
    name="description"
    content="Detailed price history and statistics for {productName}"
  />
</svelte:head>

<header class="top-bar">
  <div class="top-bar-title">
    <button
      class="back-btn"
      on:click={() => history.back()}
      style="margin-right: 16px;">← Back</button
    >
    <h1>Canadian Grocery Index</h1>
  </div>
  <div class="controls">
    <div class="geo-filter">
      <label for="geo-select">Region:</label>
      <select
        id="geo-select"
        bind:value={selectedGeo}
        on:change={handleGeoChange}
      >
        {#each geoValues as geoOpt}
          <option value={geoOpt}>{geoOpt}</option>
        {/each}
      </select>
    </div>
  </div>
</header>
<main class="container">
  {#if loading}
    <LoadingSpinner />
  {:else if error}
    <div class="error-message">
      <p>❌ {error}</p>
      <button on:click={loadProductData}>Try Again</button>
    </div>
  {:else if productStats}
    <div class="product-header">
      <div class="product-info">
        <div class="product-name">
          <h1 class="product-name">{mainTitle}</h1>
          <p class="product-subtitle">{subtitle}</p>
        </div>
        <span class="location">{geo}</span>
      </div>

      <div class="current-price-display">
        <div class="price">
          <span
            class="currency"
            class:positive={(productStats.change ?? 0) > 0}
            class:negative={(productStats.change ?? 0) < 0}
          >
            $
          </span>
          <span class="amount">{productStats.currentPrice.toFixed(2)}</span>
          <div
            class="change"
            class:positive={(productStats.change ?? 0) > 0}
            class:negative={(productStats.change ?? 0) < 0}
          >
            {productStats.change > 0 ? "+" : ""}{productStats.change.toFixed(2)}
            ({productStats.changePercent > 0
              ? "+"
              : ""}{productStats.changePercent.toFixed(1)}%)
          </div>
        </div>
      </div>

      <div class="chart-container">
        <PriceChart data={productStats.data} change={productStats.change} />
      </div>
    </div>

    <!-- Price Statistics -->
    <section class="stats-section">
      <h3>Price Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-label">Previous Price</div>
          <div class="stat-value">
            {formatCurrency(productStats.previousPrice)}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-label">Highest Price</div>
          <div class="stat-value">{formatCurrency(productStats.maxPrice)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📉</div>
          <div class="stat-label">Lowest Price</div>
          <div class="stat-value">{formatCurrency(productStats.minPrice)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-label">Average Price</div>
          <div class="stat-value">{formatCurrency(productStats.meanPrice)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-label">Price Volatility</div>
          <div class="stat-value">
            {formatCurrency(productStats.volatility)}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📏</div>
          <div class="stat-label">Price Range</div>
          <div class="stat-value">
            {formatCurrency(productStats.maxPrice - productStats.minPrice)}
          </div>
        </div>
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
            {#each productStats.data as row, index}
              {@const prevRow = productStats.data[index + 1]}
              {@const change = prevRow ? row.VALUE - prevRow.VALUE : null}
              {@const changePercent =
                prevRow && prevRow.VALUE !== 0
                  ? ((change ?? 0) / prevRow.VALUE) * 100
                  : 0}
              <tr>
                <td>{formatDate(row.REF_DATE)}</td>
                <td>{formatCurrency(row.VALUE)}</td>
                <td
                  class:positive={(change ?? 0) > 0}
                  class:negative={(change ?? 0) < 0}
                >
                  {change !== null
                    ? (change > 0 ? "+" : "") + formatCurrency(change)
                    : "-"}
                </td>
                <td
                  class:positive={(changePercent ?? 0) > 0}
                  class:negative={(changePercent ?? 0) < 0}
                >
                  {changePercent !== null
                    ? (changePercent > 0 ? "+" : "") +
                      changePercent.toFixed(1) +
                      "%"
                    : "-"}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</main>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background: #0f0f0f;
    color: #ffffff;
    min-height: 100vh;
  }

  .top-bar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    width: 100vw;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 32px;
    height: 70px;
    background: #181818;
    margin-bottom: 40px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    z-index: 100;
    border-radius: 0;
  }
  .top-bar::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    width: 100vw;
    background: linear-gradient(45deg, #00ff88, #00ccff);
    pointer-events: none;
    z-index: 101;
  }
  .top-bar-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .top-bar-title h1 {
    font-size: 2rem;
    margin: 0;
    background: linear-gradient(45deg, #00ff88, #00ccff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .controls {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .geo-filter {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .geo-filter label {
    font-weight: 500;
    color: #ccc;
  }
  .geo-filter select {
    padding: 8px 12px;
    border: 1px solid #333;
    border-radius: 6px;
    background: #1a1a1a;
    color: #fff;
    font-size: 14px;
  }

  .product-header {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: #1a1a1a;
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 30px;
    border: 1px solid #333;
  }

  .product-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .product-name {
    margin: 0;
  }

  .product-subtitle {
    font-size: 1rem;
    color: #888;
    margin: 0;
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

  .current-price-display {
    text-align: right;
  }

  .price {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    margin-bottom: 10px;
  }

  .currency {
    font-size: 1.5rem;
    color: #00ff88;
    margin-right: 4px;
  }

  .amount {
    font-size: 3rem;
    font-weight: bold;
    color: #ffffff;
    line-height: 1;
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

  .stats-section,
  .chart-section,
  .table-section {
    background: #1a1a1a;
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 30px;
    border: 1px solid #333;
  }

  .stats-section h3,
  .chart-section h3,
  .table-section h3 {
    font-size: 1.5rem;
    margin: 0 0 25px 0;
    color: #ffffff;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }

  .stat-card {
    background: #2a2a2a;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    border: 1px solid #444;
  }

  .stat-icon {
    font-size: 2rem;
    margin-bottom: 10px;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #888;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: bold;
    color: #ffffff;
  }

  .chart-container {
    width: 100%;
    height: 400px;
    min-height: 300px;
  }

  .table-container {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: #2a2a2a;
    border-radius: 8px;
    overflow: hidden;
  }

  .data-table th,
  .data-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #444;
  }

  .data-table th {
    background: #333;
    font-weight: 600;
    color: #ffffff;
  }

  .data-table td {
    color: #ccc;
  }

  .data-table tr:hover {
    background: #333;
  }

  .positive {
    color: #ff4444 !important;
  }

  .negative {
    color: #00ff88 !important;
  }

  .error-message {
    text-align: center;
    padding: 40px;
    background: #1a1a1a;
    border-radius: 12px;
    border: 1px solid #ff4444;
  }

  .error-message p {
    font-size: 1.2rem;
    margin: 0 0 20px 0;
    color: #ff4444;
  }

  .error-message button {
    padding: 10px 20px;
    background: #ff4444;
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-weight: 600;
  }

  .error-message button:hover {
    background: #cc3333;
  }

  .currency.positive,
  .change.positive {
    color: #00ff88;
  }

  .currency.negative,
  .change.negative {
    color: #ff4d4f;
  }

  @media (max-width: 768px) {
    .container {
      padding: 15px;
    }

    .product-header {
      gap: 20px;
    }

    .product-info {
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }

    .current-price-display {
      text-align: center;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .top-bar {
      flex-direction: column;
      align-items: stretch;
      height: auto;
      padding: 12px 10px;
      gap: 10px;
    }
    .top-bar-title h1 {
      font-size: 1.5rem;
      text-align: center;
    }
    .controls {
      justify-content: center;
      gap: 15px;
    }
  }
</style>
