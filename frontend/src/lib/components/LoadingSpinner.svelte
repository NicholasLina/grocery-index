<script lang="ts">
  // Simple loading spinner component
</script>

<div class="loading-container">
  <div class="spinner"></div>
  <p class="loading-text">Loading price data...</p>
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 3px solid #333;
    border-top: 3px solid #00ff88;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  .loading-text {
    color: #888;
    font-size: 1.1rem;
    margin: 0;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style> 