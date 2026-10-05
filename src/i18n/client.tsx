'use client';
import { createContext, useContext } from 'react';
import { messages, type Messages } from './messages';
import type { Locale } from './config';

const LocaleContext = createContext<Locale>('en');

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
export const useT = (): Messages => messages[useContext(LocaleContext)];
