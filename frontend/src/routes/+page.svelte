<script lang="ts">
  import { onMount } from 'svelte';
  import { format, subMonths } from 'date-fns';
  import PriceCard from '$lib/components/PriceCard.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  interface PriceData {
    _id: string;
    REF_DATE: string;
    GEO: string;
    Products: string;
    VECTOR: string;
    VALUE: number;
  }

  interface ProductChange {
    product: string;
    currentPrice: number;
    previousPrice: number;
    change: number;
    changePercent: number;
    geo: string;
    data: PriceData[];
  }

  let products: string[] = [];
  let geoValues: string[] = [];
  let selectedGeo: string = 'Canada';
  let topGainers: ProductChange[] = [];
  let topLosers: ProductChange[] = [];
  let loading = true;
  let error = '';

  const API_BASE = 'http://localhost:3000/api/statcan';

  async function fetchProducts() {
    try {
      const response = await fetch(`${API_BASE}/products`);
      const data = await response.json();
      return data.products;
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    }
  }

  async function fetchGeoValues() {
    try {
      const response = await fetch(`${API_BASE}/debug`);
      const data = await response.json();
      return data.geoValues || [];
    } catch (err) {
      console.error('Error fetching geo values:', err);
      return ['Canada']; // Fallback
    }
  }

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

  function calculatePriceChanges(data: PriceData[]): ProductChange | null {
    if (data.length < 2) return null;

    // Sort by date to get most recent first
    const sortedData = data.sort((a, b) => new Date(b.REF_DATE).getTime() - new Date(a.REF_DATE).getTime());
    
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
      data: sortedData
    };
  }

  async function loadPriceChanges() {
    loading = true;
    error = '';
    
    try {
      // Get a sample of products (first 30 for better coverage)
      const allProducts = await fetchProducts();
      const sampleProducts = allProducts.slice(0, 30);
      
      const allChanges: ProductChange[] = [];
      
      for (const product of sampleProducts) {
        const data = await fetchProductData(product, selectedGeo);
        const change = calculatePriceChanges(data);
        if (change) {
          allChanges.push(change);
        }
      }
      
      // Separate gainers and losers
      const gainers = allChanges.filter(change => change.changePercent > 0);
      const losers = allChanges.filter(change => change.changePercent < 0);
      
      // Sort gainers by percentage increase (highest first)
      topGainers = gainers
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 3);
      
      // Sort losers by percentage decrease (lowest first, then take absolute value)
      topLosers = losers
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 3);
      
    } catch (err) {
      error = 'Failed to load price data';
      console.error('Error loading price changes:', err);
    } finally {
      loading = false;
    }
  }

  async function handleGeoChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedGeo = target.value;
    await loadPriceChanges();
  }

  onMount(async () => {
    geoValues = await fetchGeoValues();
    await loadPriceChanges();
  });
</script>

<svelte:head>
  <title>Canadian Grocery Index - Stock Market Style</title>
  <meta name="description" content="Track grocery price changes in real-time" />
</svelte:head>

<main class="container">
  <header class="header">
    <h1>Canadian Grocery Index</h1>
    <p class="subtitle">Top Gainers & Losers - This Month's Biggest Movers</p>
    
    <div class="controls">
      <div class="geo-filter">
        <label for="geo-select">Region:</label>
        <select id="geo-select" bind:value={selectedGeo} on:change={handleGeoChange}>
          {#each geoValues as geo}
            <option value={geo}>{geo}</option>
          {/each}
        </select>
      </div>
      
      <button class="refresh-btn" on:click={loadPriceChanges} disabled={loading}>
        {loading ? 'Loading...' : '🔄 Refresh'}
      </button>
    </div>
  </header>

  {#if error}
    <div class="error">
      {error}
    </div>
  {/if}

  {#if loading}
    <LoadingSpinner />
  {:else}
    <div class="content">
      <!-- Biggest Discounts Section -->
      <section class="section">
        <h2 class="section-title losers-title">
          Biggest Discounts
          <span class="section-subtitle">Highest Percentage Decreases</span>
        </h2>
        <div class="price-grid">
          {#each topLosers as product (product.product)}
            <PriceCard {product} />
          {/each}
        </div>
        {#if topLosers.length === 0}
          <div class="no-data">
            <p>No price decreases found in the data</p>
          </div>
        {/if}
      </section>

      <!-- Most Expensive Section -->
      <section class="section">
        <h2 class="section-title gainers-title">
          Most Expensive
          <span class="section-subtitle">Highest Percentage Increases</span>
        </h2>
        <div class="price-grid">
          {#each topGainers as product (product.product)}
            <PriceCard {product} />
          {/each}
        </div>
        {#if topGainers.length === 0}
          <div class="no-data">
            <p>No price increases found in the data</p>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</main>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0a;
    min-height: 100vh;
    color: #ffffff;
  }

  .header {
    text-align: center;
    margin-bottom: 40px;
    padding: 20px 0;
    border-bottom: 1px solid #333;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0 0 10px 0;
    background: linear-gradient(45deg, #00ff88, #00ccff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #888;
    margin: 0 0 20px 0;
  }

  .controls {
    display: flex;
    justify-content: center;
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
    color: #888;
    font-weight: 500;
  }

  .geo-filter select {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #ffffff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .geo-filter select:hover {
    border-color: #00ff88;
  }

  .geo-filter select:focus {
    outline: none;
    border-color: #00ff88;
    box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
  }

  .refresh-btn {
    background: linear-gradient(45deg, #00ff88, #00ccff);
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    color: #000;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 255, 136, 0.3);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: #ff4444;
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: center;
  }

  .section {
    margin-bottom: 50px;
  }

  .section-title {
    font-size: 1.8rem;
    margin: 0 0 20px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .gainers-title {
    color: #ff4444;
  }

  .losers-title {
    color: #00ff88;
  }

  .section-subtitle {
    font-size: 0.9rem;
    color: #888;
    font-weight: normal;
  }

  .price-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }

  .no-data {
    text-align: center;
    padding: 40px;
    color: #888;
    font-style: italic;
    background: #1a1a1a;
    border-radius: 12px;
    border: 1px solid #333;
  }

  @media (max-width: 768px) {
    .container {
      padding: 10px;
    }

    h1 {
      font-size: 2rem;
    }

    .section-title {
      font-size: 1.5rem;
    }

    .controls {
      flex-direction: column;
      gap: 15px;
    }

    .geo-filter {
      flex-direction: column;
      gap: 5px;
    }

    .price-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
