import { Suspense } from 'react';
import HomePage from '../components/HomePage';
import HomePagePlaceholder from '../components/LoadingPlaceholder';
import { fetchDataEndpoint } from '../lib/dataSource';

export const metadata = {
  title: 'Canadian Grocery Index - Track Food Prices in Canada',
  description: 'Visualize and explore Canadian grocery price trends, gainers, losers, and streaks. Powered by StatCan data.'
};

// Enable static generation with revalidation every 24 hours
export const revalidate = 86400; // 24 hours in seconds

// Pre-fetch data at build time and on revalidation
async function getHomePageData() {
  try {
    const [priceData, streakData, allChangesData, trendsData] = await Promise.all([
      fetchDataEndpoint('price-changes', { geo: 'Canada', limit: 3 }),
      fetchDataEndpoint('streaks', { geo: 'Canada', limit: 3 }),
      fetchDataEndpoint('all-price-changes', { geo: 'Canada' }),
      fetchDataEndpoint('product-trends', { geo: 'Canada', limit: 3, months: 12 }),
    ]);

    return {
      gainers: priceData.gainers || [],
      losers: priceData.losers || [],
      streaks: streakData.streaks || [],
      allProductChanges: allChangesData.products || [],
      productTrendLookup: trendsData.trends || {},
      error: null
    };
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return {
      gainers: [],
      losers: [],
      streaks: [],
      allProductChanges: [],
      productTrendLookup: {},
      error: 'Failed to load data. Please try again later.'
    };
  }
}

export default async function Page() {
  const data = await getHomePageData();

  return (
    <Suspense fallback={<HomePagePlaceholder />}>
      <HomePage initialData={data} />
    </Suspense>
  );
}
