import { useState, useEffect } from "react";
import { Thesis, DEMO_THESES } from "@/lib/thesis";

const STORAGE_KEY = "binturong.theses";

export function useTheses() {
  const [theses, setTheses] = useState<Thesis[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEMO_THESES;
    } catch {
      return DEMO_THESES;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theses));
  }, [theses]);

  const addThesis = (thesis: Omit<Thesis, "id" | "createdAt">) => {
    const newThesis: Thesis = {
      ...thesis,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTheses((prev) => [newThesis, ...prev]);
    return newThesis;
  };

  const updateThesis = (id: string, updates: Partial<Thesis>) => {
    setTheses((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteThesis = (id: string) => {
    setTheses((prev) => prev.filter((t) => t.id !== id));
  };

  return { theses, addThesis, updateThesis, deleteThesis };
}
