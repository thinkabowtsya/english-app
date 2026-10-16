'use client';

import { useActionState } from 'react';
import { LoaderCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { login, type LoginState } from './actions';

const inputCls = 'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null, email: '' });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {pending ? 'Memproses…' : 'Masuk'}
      </Button>
    </form>
  );
}
