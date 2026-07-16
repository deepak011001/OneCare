import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { brand } from '@onecare/ui';
import './globals.css';

export const metadata: Metadata = {
  title: `${brand.name} Admin`,
  description: 'Tenant administration portal',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
