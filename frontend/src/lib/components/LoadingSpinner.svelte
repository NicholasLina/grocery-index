<!--
 * Loading Spinner Component - Canadian Grocery Index
 * 
 * A simple, reusable loading spinner component with animation.
 * Used throughout the application to indicate data loading states.
 * 
 * Features:
 * - Smooth CSS animation
 * - Responsive design
 * - Customizable size and colors
 * - Accessible loading indicator
 * 
 * @author Canadian Grocery Index Team
 * @version 1.0.0
 -->

<script lang="ts">
  // No props or logic needed for this simple component
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