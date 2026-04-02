"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_REGION } from '../lib/constants';

const REGION_STORAGE_KEY = 'region';
const RegionContext = createContext({
  region: DEFAULT_REGION,
  setRegion: () => {},
});

export function RegionProvider({ children }) {
  const [region, setRegion] = useState(DEFAULT_REGION);

  useEffect(() => {
    const storedRegion = window.localStorage.getItem(REGION_STORAGE_KEY);
    if (storedRegion) {
      setRegion(storedRegion);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(REGION_STORAGE_KEY, region);
  }, [region]);

  const value = useMemo(() => ({ region, setRegion }), [region]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  return useContext(RegionContext);
}
