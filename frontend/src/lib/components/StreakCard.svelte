<!--
  Streak Card Component - Canadian Grocery Index
  Displays a product's current streak of consecutive price increases or decreases.
  Props:
  - streak: { product, geo, streakLength, streakType, data }
-->
<script lang="ts">
    import { format } from "date-fns";
    import PriceChart from "./PriceChart.svelte";

    export let streak: {
        product: string;
        geo: string;
        streakLength: number;
        streakType: "increase" | "decrease";
        data: any[];
    };

    // Format product title
    function formatProductTitle(productName: string): {
        mainTitle: string;
        subtitle: string;
    } {
        if (!productName || typeof productName !== "string") {
            return { mainTitle: "Unknown Product", subtitle: "" };
        }
        const parts = productName.split(",");
        if (parts.length > 1) {
            return {
                mainTitle: parts[0]
                    .trim()
                    .split(" ")
                    .map(
                        (word) =>
                            word.charAt(0).toUpperCase() +
                            word.slice(1).toLowerCase(),
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
                            word.charAt(0).toUpperCase() +
                            word.slice(1).toLowerCase(),
                    )
                    .join(" "),
                subtitle: "",
            };
        }
    }

    $: formattedTitle = formatProductTitle(streak.product);
    $: mainTitle = formattedTitle.mainTitle;
    $: subtitle = formattedTitle.subtitle;
    $: streakColor = streak.streakType === "increase" ? "#00ff88" : "#ff4444";
    $: streakLabel =
        streak.streakType === "increase"
            ? "Consecutive Increases"
            : "Consecutive Decreases";

    // Create mini-chart data for displaying recent price history (copied from PriceCard)
    function createMiniChart(data: any[]): any {
        if (!data || !Array.isArray(data) || data.length < 2) return null;
        const sortedData = data.sort(
            (a, b) =>
                new Date(a.REF_DATE).getTime() - new Date(b.REF_DATE).getTime(),
        );
        const chartData = sortedData.slice(-12);
        const values = chartData.map((d) => d.VALUE);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue;
        const width = 280;
        const height = 50;
        const xStep = width / (chartData.length - 1);
        const yScale = height / valueRange;
        const points = chartData.map((d, i) => ({
            x: i * xStep,
            y: height - (d.VALUE - minValue) * yScale,
            value: d.VALUE,
        }));
        const pathData =
            points.length > 1
                ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
                : "";
        const areaPathData =
            points.length > 1
                ? `M 0,${height} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${width},${height} Z`
                : "";
        return { pathData, areaPathData, points, minValue, maxValue };
    }
    $: miniChart = createMiniChart(streak.data || []);
</script>

<a
    class="streak-card"
    style="--streak-color: {streakColor}"
    href={`/product/${encodeURIComponent(streak.product + "|" + streak.geo)}`}
>
    <div class="card-header">
        <div class="product-info">
            <h3 class="product-name">{mainTitle}</h3>
            {#if subtitle}
                <p class="product-subtitle">{subtitle}</p>
            {/if}
        </div>
        <span class="location">{streak.geo}</span>
    </div>
    <div class="mini-chart-container">
        {#if miniChart}
            <svg
                class="mini-chart"
                viewBox="0 0 280 50"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <linearGradient
                        id="streakChartGradient-{(
                            streak.product || 'unknown'
                        ).replace(/\s+/g, '-')}"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                    >
                        <stop
                            offset="0%"
                            style="stop-color:{streakColor};stop-opacity:0.3"
                        />
                        <stop
                            offset="100%"
                            style="stop-color:{streakColor};stop-opacity:0.05"
                        />
                    </linearGradient>
                </defs>
                <path
                    d={miniChart.areaPathData}
                    fill="url(#streakChartGradient-{(
                        streak.product || 'unknown'
                    ).replace(/\s+/g, '-')})"
                    stroke="none"
                />
                <path
                    d={miniChart.pathData}
                    stroke={streakColor}
                    stroke-width="2"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        {/if}
    </div>
    <div class="streak-info">
        <span class="streak-length" style="color: {streakColor}"
            >{streak.streakLength}</span
        >
        <span class="streak-label">{streakLabel}</span>
    </div>
</a>

<style>
    .streak-card {
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
        border: 1px solid #333;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
        text-decoration: none;
    }
    .streak-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--streak-color);
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    .streak-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
    }
    .streak-card:hover::before {
        opacity: 1;
    }
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    .product-info {
        flex: 1;
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
        margin: 0 0 20px 0;
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
    .mini-chart-container {
        width: 100%;
        height: 60px;
        margin: 0 0 8px 0;
    }
    .streak-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }
    .streak-length {
        font-size: 2.2rem;
        font-weight: bold;
        line-height: 1;
    }
    .streak-label {
        font-size: 1rem;
        color: #ccc;
    }
</style>
