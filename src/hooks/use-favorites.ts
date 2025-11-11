
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FavoriteItem, UnitCategory } from '@/types';

const FAVORITES_KEY = 'swapUnitsFavorites';
const MAX_FAVORITE_ITEMS = 6; // Maximum number of favorites to store

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  useEffect(() => {
    // Load favorites from localStorage on initial mount
    if (typeof window !== 'undefined') {
      try {
        const storedFavorites = localStorage.getItem(FAVORITES_KEY);
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }
      } catch (error) {
        console.error("Error reading favorites from localStorage:", error);
        setFavorites([]); // Fallback to empty array on error
      } finally {
        setIsLoadingFavorites(false);
      }
    } else {
      setIsLoadingFavorites(false); // Fallback for non-browser environments
    }
  }, []);

  const addFavorite = useCallback((itemData: {
    category: UnitCategory;
    fromUnit: string;
    toUnit: string;
    name: string;
  }) => {
    const newItem: FavoriteItem = {
      ...itemData,
      id: crypto.randomUUID(),
    };

    setFavorites(prevFavorites => {
      // Prevent duplicates based on category, fromUnit, and toUnit
      const isDuplicate = prevFavorites.some(
        fav => fav.category === newItem.category && fav.fromUnit === newItem.fromUnit && fav.toUnit === newItem.toUnit
      );
      if (isDuplicate) {
        // Optionally, provide feedback that the favorite already exists
        console.log("Favorite already exists.");
        return prevFavorites;
      }

      const updatedFavorites = [newItem, ...prevFavorites].slice(0, MAX_FAVORITE_ITEMS);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
        } catch (error) {
          console.error("Error saving favorites to localStorage:", error);
        }
      }
      return updatedFavorites;
    });
  }, []);

  const removeFavorite = useCallback((favoriteId: string) => {
    setFavorites(prevFavorites => {
      const updatedFavorites = prevFavorites.filter(fav => fav.id !== favoriteId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
        } catch (error) {
          console.error("Error removing favorite from localStorage:", error);
        }
      }
      return updatedFavorites;
    });
  }, []);

  const clearAllFavorites = useCallback(() => {
    setFavorites([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(FAVORITES_KEY);
      } catch (error) {
        console.error("Error clearing all favorites from localStorage:", error);
      }
    }
  }, []);


  return { favorites, addFavorite, removeFavorite, clearAllFavorites, isLoadingFavorites };
}

