<!-- Main Dashboard Page - Canadian Grocery Index -->

<script lang="ts">
  import { onMount } from "svelte";
  import { format, subMonths } from "date-fns";
  import PriceCard from "$lib/components/PriceCard.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import StreakCard from "$lib/components/StreakCard.svelte";

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

  // Interface representing calculated price change data for a product
  interface ProductChange {
    // Product name
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
    // Full price history data (always an array)
    data: any[];
    // Price from one year ago
    yearAgoPrice?: number;
    // 1-year absolute change
    yearAgoChange?: number;
    // 1-year percent change
    yearAgoPercent?: number;
  }

  // Reactive state variables
  // Array of all available product names
  let products: string[] = [];
  // Array of available geographic locations
  let geoValues: string[] = [];
  // Currently selected geographic location
  let selectedGeo: string = "Canada";
  // Top 3 products with highest price increases
  let topGainers: ProductChange[] = [];
  // Top 3 products with highest price decreases
  let topLosers: ProductChange[] = [];
  // Top 3 products with longest current streaks
  let streaks: any[] = [];
  // Loading state indicator
  let loading = true;
  // Error message if data loading fails
  let error = "";
  // Array to hold all product price changes for the selected region
  let allProductChanges: ProductChange[] = [];
  // --- Sorting state for all products table ---
  let sortColumn: string = "product";
  let sortDirection: "asc" | "desc" = "asc";

  // Base URL for the API endpoints
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  // Fetches all available product names from the API
  // Returns: Array of product names
  async function fetchProducts(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE}/products`);
      const data = await response.json();
      return data.products;
    } catch (err) {
      console.error("❌ Error fetching products:", err);
      return [];
    }
  }

  // Fetches all available geographic locations from the API
  // Returns: Array of geographic locations
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

  // Fetches price data for a specific product and geographic location
  // Parameters:
  //   product - Product name to fetch data for
  //   geo - Geographic location to fetch data for
  // Returns: Array of price data points
  async function fetchProductData(
    product: string,
    geo: string,
  ): Promise<PriceData[]> {
    try {
      const response = await fetch(
        `${API_BASE}?geo=${encodeURIComponent(geo)}&product=${encodeURIComponent(product)}`,
      );
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`❌ Error fetching data for ${product}:`, err);
      return [];
    }
  }

  // Calculates price change statistics from an array of price data
  // Parameters:
  //   data - Array of price data points
  // Returns: Calculated price change data or null if insufficient data
  function calculatePriceChanges(data: PriceData[]): ProductChange | null {
    if (data.length < 2) return null;

    // Sort by date to get most recent first
    const sortedData = data.sort(
      (a, b) => new Date(b.REF_DATE).getTime() - new Date(a.REF_DATE).getTime(),
    );

    const currentPrice = sortedData[0].VALUE;
    const previousPrice = sortedData[1].VALUE;
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

    return {
      product: sortedData[0].Products,
      currentPrice,
      previousPrice,
      change,
      changePercent,
      geo: sortedData[0].GEO,
      data: sortedData,
    };
  }

  // Loads pre-calculated price changes for the selected region
  // Uses the optimized backend endpoint for fast retrieval
  async function loadPriceChanges(): Promise<void> {
    loading = true;
    error = "";

    try {
      const response = await fetch(
        `${API_BASE}/price-changes?geo=${encodeURIComponent(selectedGeo)}&limit=3`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Map the backend data to our frontend format and fetch full data for charts
      const gainersWithData = await Promise.all(
        data.gainers.map(async (item: any) => {
          // Fetch full historical data for the mini-chart
          const fullData = await fetchProductData(item.product, item.geo);
          return {
            product: item.product,
            currentPrice: item.currentPrice,
            previousPrice: item.previousPrice,
            change: item.change,
            changePercent: item.changePercent,
            geo: item.geo,
            data: fullData, // Include full data for mini-chart
          };
        }),
      );

      const losersWithData = await Promise.all(
        data.losers.map(async (item: any) => {
          // Fetch full historical data for the mini-chart
          const fullData = await fetchProductData(item.product, item.geo);
          return {
            product: item.product,
            currentPrice: item.currentPrice,
            previousPrice: item.previousPrice,
            change: item.change,
            changePercent: item.changePercent,
            geo: item.geo,
            data: fullData, // Include full data for mini-chart
          };
        }),
      );

      topGainers = gainersWithData;
      topLosers = losersWithData;

      // Fetch streaks
      const streaksRes = await fetch(
        `${API_BASE}/streaks?geo=${encodeURIComponent(selectedGeo)}&limit=3`,
      );
      const streaksData = await streaksRes.json();
      streaks = streaksData.streaks || [];
    } catch (err) {
      error = "Failed to load price data";
      console.error("❌ Error loading price changes:", err);
    } finally {
      loading = false;
    }
  }

  // Handles geographic location change events
  // Reloads price data when the user selects a different region
  // Parameters:
  //   event - Change event from the select element
  async function handleGeoChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    selectedGeo = target.value;
    localStorage.setItem("selectedGeo", selectedGeo);
    await loadPriceChanges();
  }

  // Helper to fetch all product changes for the region (now uses new endpoint)
  async function fetchAllProductChanges(geo: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${API_BASE}/all-price-changes?geo=${encodeURIComponent(geo)}`,
      );
      const data = await response.json();
      return (data.products || []).map((p: any) => ({
        ...p,
        data: p.data ?? [],
      }));
    } catch (err) {
      console.error("❌ Error fetching all product changes:", err);
      return [];
    }
  }

  // Load all product changes when region changes
  $: if (!loading && selectedGeo) {
    fetchAllProductChanges(selectedGeo).then((data) => {
      allProductChanges = data;
    });
  }

  // Lifecycle hook that runs when the component mounts
  // Initializes the page by loading geographic locations and price data
  onMount(async () => {
    geoValues = await fetchGeoValues();
    // Try to load from localStorage, fallback to 'Canada'
    const storedGeo = localStorage.getItem("selectedGeo");
    selectedGeo = storedGeo || "Canada";
    await loadPriceChanges();
  });

  function setSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
  }

  // Utility to generate slug from product name
  function productToSlug(productName: string): string {
    return productName.toLowerCase().replace(/\s+/g, "-");
  }

  // --- Reactive sorted products for the table ---
  $: sortedProducts = [...allProductChanges].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    switch (sortColumn) {
      case "product":
        aValue = a.product.toLowerCase();
        bValue = b.product.toLowerCase();
        break;
      case "currentPrice":
        aValue = a.currentPrice;
        bValue = b.currentPrice;
        break;
      case "change":
        aValue = a.change;
        bValue = b.change;
        break;
      case "changePercent":
        aValue = a.changePercent;
        bValue = b.changePercent;
        break;
      case "yearChange":
        aValue =
          a.yearAgoPrice !== null && a.yearAgoPrice !== undefined
            ? a.currentPrice - a.yearAgoPrice
            : null;
        bValue =
          b.yearAgoPrice !== null && b.yearAgoPrice !== undefined
            ? b.currentPrice - b.yearAgoPrice
            : null;
        break;
      // No default
    }
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
</script>

<svelte:head>
  <title>Canadian Grocery Index</title>
  <meta
    name="description"
    content="Track grocery price changes to inform your food purchases"
  />
</svelte:head>

<header class="top-bar">
  <div class="top-bar-title">
    <span class="maple-leaf" aria-label="Canada">🍁</span>
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
        {#each geoValues as geo}
          <option value={geo}>{geo}</option>
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
      <button on:click={loadPriceChanges}>Try Again</button>
    </div>
  {:else}
    <div class="content">
      <!-- Arrange sections side by side on desktop/tablet -->
      <div class="sections-row">
        <!-- Biggest Discounts Section -->
        <section class="section">
          <h2 class="section-title">Biggest Discounts</h2>
          <div class="cards-grid">
            {#each topLosers as product}
              <PriceCard {product} />
            {/each}
          </div>
        </section>

        <!-- Most Expensive Section -->
        <section class="section">
          <h2 class="section-title">Most Expensive</h2>
          <div class="cards-grid">
            {#each topGainers as product}
              <PriceCard {product} />
            {/each}
          </div>
        </section>

        <!-- Longest Streaks Section -->
        <section class="section">
          <h2 class="section-title">Long Trends</h2>
          <div class="cards-grid">
            {#each streaks as streak}
              <StreakCard {streak} />
            {/each}
          </div>
        </section>
      </div>
    </div>
  {/if}

  <!-- All Products Table -->
  {#if !loading && !error && allProductChanges.length > 0}
    <section class="section" style="margin-top: 40px;">
      <h2 class="section-title">All Products ({selectedGeo})</h2>
      <div style="overflow-x: auto;">
        <table class="all-products-table">
          <thead>
            <tr>
              <th on:click={() => setSort("product")} style="cursor:pointer">
                Product {sortColumn === "product"
                  ? sortDirection === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>
              <th
                on:click={() => setSort("currentPrice")}
                style="cursor:pointer"
              >
                Current Price {sortColumn === "currentPrice"
                  ? sortDirection === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>
              <th on:click={() => setSort("change")} style="cursor:pointer">
                Change ($) {sortColumn === "change"
                  ? sortDirection === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>
              <th
                on:click={() => setSort("changePercent")}
                style="cursor:pointer"
              >
                Change (%) {sortColumn === "changePercent"
                  ? sortDirection === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>
              <th on:click={() => setSort("yearChange")} style="cursor:pointer">
                Change (1 Year) {sortColumn === "yearChange"
                  ? sortDirection === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {#each sortedProducts as product}
              <tr>
                <td
                  ><a href={`/product/${productToSlug(product.product)}`}
                    >{product.product}</a
                  ></td
                >
                <td>{product.currentPrice?.toFixed(2) ?? "-"}</td>
                <td
                  style="color: {product.change > 0
                    ? '#ff4444'
                    : product.change < 0
                      ? '#00ff88'
                      : '#fff'}"
                >
                  {product.change?.toFixed(2) ?? "-"}
                </td>
                <td
                  style="color: {product.changePercent > 0
                    ? '#ff4444'
                    : product.changePercent < 0
                      ? '#00ff88'
                      : '#fff'}"
                >
                  {product.changePercent?.toFixed(2) ?? "-"}%
                </td>
                <td>
                  {#if product.yearAgoPrice !== null && product.yearAgoPrice !== undefined}
                    <span
                      style="color: {product.yearAgoChange !== undefined &&
                      product.yearAgoChange > 0
                        ? '#ff4444'
                        : product.yearAgoChange !== undefined &&
                            product.yearAgoChange < 0
                          ? '#00ff88'
                          : '#fff'}"
                    >
                      {product.yearAgoChange !== undefined
                        ? (product.yearAgoChange >= 0 ? "+" : "") +
                          product.yearAgoChange.toFixed(2)
                        : "-"}
                      ({product.yearAgoPercent === null ||
                      product.yearAgoPercent === undefined
                        ? "-"
                        : product.yearAgoPercent.toFixed(2) + "%"})
                    </span>
                  {:else}
                    -
                  {/if}
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
    position: sticky;
  }

  .top-bar::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    width: 100vw;
    background: white;
    pointer-events: none;
    z-index: 101;
  }

  .top-bar-title {
    display: flex;
    align-items: center;
  }

  .top-bar-title h1 {
    font-size: 2rem;
    margin: 0;
    background: white;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .container {
    max-width: min(90%, 1500px);
    margin: 0 auto;
    padding: 20px;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background: #0f0f0f;
    color: #ffffff;
    min-height: 100vh;
    margin-top: 0;
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

  .refresh-btn {
    padding: 8px 16px;
    background: linear-gradient(45deg, #00ff88, #00ccff);
    border: none;
    border-radius: 6px;
    color: #000;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .sections-row {
    display: flex;
    flex-direction: row;
    gap: 20px;
  }

  .sections-row > .section {
    flex: 1 1 0;
    min-width: 0;
  }

  .section {
    background: #1a1a1a;
    border-radius: 12px;
    padding: 30px;
    border: 1px solid #333;
  }

  .section-title {
    font-size: 1.8rem;
    margin: 0 0 25px 0;
    color: #ffffff;
    text-align: center;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
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

  tbody a {
    color: white;
  }

  @media (max-width: 768px) {
    .sections-row {
      flex-direction: column;
      gap: 20px;
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
    .container {
      padding: 0;
    }
    .section {
      padding: 10px;
    }
  }

  .all-products-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    background: #181818;
    color: #fff;
    font-size: 15px;
  }
  .all-products-table th,
  .all-products-table td {
    border: 1px solid #333;
    padding: 8px 12px;
    text-align: left;
  }
  .all-products-table th {
    background: #222;
    font-weight: 600;
  }
  .all-products-table tr:nth-child(even) {
    background: #1a1a1a;
  }
  .all-products-table tr:hover {
    background: #222;
  }

  .maple-leaf {
    font-size: 2rem;
    margin-right: 10px;
    vertical-align: middle;
    display: inline-block;
    line-height: 1;
  }
</style>
