"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ImageMap = Map<string, string>;

const MenuImagesContext = createContext<ImageMap>(new Map());

export function MenuImagesProvider({ children }: { children: React.ReactNode }) {
  const [imageMap, setImageMap] = useState<ImageMap>(new Map());

  useEffect(() => {
    let cancelled = false;

    fetch("/api/menu/images")
      .then((res) => res.json())
      .then((data: Record<string, string>) => {
        if (!cancelled) {
          setImageMap(new Map(Object.entries(data)));
        }
      })
      .catch((err) => {
        console.error("[MenuImagesContext] Failed to load images:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MenuImagesContext.Provider value={imageMap}>
      {children}
    </MenuImagesContext.Provider>
  );
}

export function useMenuImages(): ImageMap {
  return useContext(MenuImagesContext);
}
