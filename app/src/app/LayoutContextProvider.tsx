import React, { createContext, useContext, ReactNode } from 'react';

const LayoutContext = createContext({});

export const LayoutContextProvider = ({ children }: { children: ReactNode }) => {
  return (
    <LayoutContext.Provider value={{}}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayoutContext = () => useContext(LayoutContext);
