'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConversionHistoryItem, UnitCategory, ConversionHistoryMeta } from '@/types';

const HISTORY_KEY = 'swapUnitsConversionHistory';
const MAX_HISTORY_ITEMS = 8; 

export function useConversionHistory() {
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Added isLoading state

  useEffect(() => {
    // Load history from localStorage on initial mount
    if (typeof window !== 'undefined') {
      try {
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        }
      } catch (error) {
        console.error("Error reading conversion history from localStorage:", error);
        setHistory([]);
      } finally {
        setIsLoading(false); // Set loading to false after attempting to load
      }
    } else {
      setIsLoading(false); // Fallback for non-browser environments (though this is a client hook)
    }
  }, []);

  const addHistoryItem = useCallback((itemData: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
    meta?: ConversionHistoryMeta;
  }) => {
    const newItem: ConversionHistoryItem = {
      ...itemData,
      id: crypto.randomUUID(), 
      timestamp: Date.now(),
    };

    setHistory(prevHistory => {
      if (prevHistory.length > 0) {
        const lastItem = prevHistory[0];
        const isDuplicate =
          lastItem.category === newItem.category &&
          lastItem.fromUnit === newItem.fromUnit &&
          lastItem.toUnit === newItem.toUnit &&
          lastItem.fromValue === newItem.fromValue &&
          lastItem.toValue === newItem.toValue;
        if (isDuplicate) {
          return prevHistory;
        }
      }

      const updatedHistory = [newItem, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (error) {
          console.error("Error saving conversion history to localStorage:", error);
        }
      }
      return updatedHistory;
    });
  }, []);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') {
        try {
            localStorage.removeItem(HISTORY_KEY);
        } catch (error) {
            console.error("Error clearing conversion history from localStorage:", error);
        }
    }
  }, []);


  return { history, addHistoryItem, clearHistory, isLoading }; // Return isLoading
}
