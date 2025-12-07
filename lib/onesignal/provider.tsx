'use client';

import { ReactNode } from 'react';
import { OneSignalInit } from './init';

interface OneSignalProviderProps {
  children: ReactNode;
}

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  return (
    <>
      <OneSignalInit />
      {children}
    </>
  );
}
