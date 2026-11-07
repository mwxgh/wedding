'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react';

import type { LoginRequest, LoginResponse } from '@repo/types';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';

import { FormAlert, FormField } from '../../_components/common';
import { clientFetch } from '../../_lib/api';
import { useAuth } from '../_lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: LoginRequest = { email, password };
      const res = await clientFetch<LoginResponse>('/admin/auth/login', {
        body,
      });
      login(res.accessToken);
      router.replace('/admin');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main
      className={`relative flex min-h-dvh items-center justify-center
        overflow-hidden bg-background p-4`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0
          bg-[radial-gradient(60rem_40rem_at_10%_-10%,color-mix(in_oklch,var(--primary),transparent_85%),transparent),radial-gradient(50rem_35rem_at_110%_110%,color-mix(in_oklch,var(--gold),transparent_80%),transparent)]`}
      />
      <Card className="relative w-full max-w-sm shadow-lift">
        <CardHeader className="items-center gap-3 text-center">
          <span
            aria-hidden
            className={`mx-auto grid size-12 place-items-center rounded-2xl
              bg-primary font-script text-2xl text-primary-foreground shadow-sm`}
          >
            W
          </span>
          <CardTitle className="font-serif text-2xl font-semibold">
            Wedding Admin
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để quản lý thiệp mời và khách mời
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && <FormAlert tone="error">{error}</FormAlert>}
            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="h-11"
              />
            </FormField>
            <FormField label="Mật khẩu" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  aria-controls="password"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOffIcon aria-hidden />
                  ) : (
                    <EyeIcon aria-hidden />
                  )}
                </Button>
              </div>
            </FormField>
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="mt-1 h-11"
            >
              {loading && (
                <Loader2Icon
                  data-icon="inline-start"
                  aria-hidden
                  className="animate-spin motion-reduce:animate-none"
                />
              )}
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
