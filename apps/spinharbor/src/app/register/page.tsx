import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { PageSkeleton } from '@/components/shell/require-auth';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}
