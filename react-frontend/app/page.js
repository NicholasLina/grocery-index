import { Suspense } from 'react';
import HomePage from '../components/HomePage';
import HomePagePlaceholder from '../components/LoadingPlaceholder';

export const metadata = {
  title: 'Canadian Grocery Index - Track Food Prices in Canada',
  description: 'Visualize and explore Canadian grocery price trends, gainers, losers, and streaks. Powered by StatCan data.'
};

// Enable static generation with revalidation every 24 hours
export const revalidate = 86400; // 24 hours in seconds

// Pre-fetch data at build time and on revalidation
async function getHomePageData() {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/statcan';

    // Fetch all data in parallel
    const [priceRes, streakRes, allChangesRes] = await Promise.all([
      fetch(`${API_BASE}/price-changes?geo=Canada&limit=3`, {
        next: { revalidate: 86400 } // Cache for 24 hours
      }),
      fetch(`${API_BASE}/streaks?geo=Canada&limit=3`, {
        next: { revalidate: 86400 } // Cache for 24 hours
      }),
      fetch(`${API_BASE}/all-price-changes?geo=Canada`, {
        next: { revalidate: 86400 } // Cache for 24 hours
      })
    ]);

    if (!priceRes.ok || !streakRes.ok || !allChangesRes.ok) {
      throw new Error('Failed to fetch data');
    }

    const [priceData, streakData, allChangesData] = await Promise.all([
      priceRes.json(),
      streakRes.json(),
      allChangesRes.json()
    ]);

    return {
      gainers: priceData.gainers || [],
      losers: priceData.losers || [],
      streaks: streakData.streaks || [],
      allProductChanges: allChangesData.products || [],
      error: null
    };
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return {
      gainers: [],
      losers: [],
      streaks: [],
      allProductChanges: [],
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
