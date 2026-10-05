'use client';
import { useState, useTransition } from 'react';
import { resendVerification } from '@/actions/auth';
import { useT } from '@/i18n/client';

export function VerifyBar({ email }: { email: string }) {
  const t = useT().verifyBar;
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="verify-bar">
      <span>{t.text(email)}</span>
      {msg ? <span>{msg}</span> : (
        <button disabled={pending} onClick={() => start(async () => { const r = await resendVerification(); setMsg(r?.ok || r?.error || null); })}>
          {pending ? t.sending : t.resend}
        </button>
      )}
    </div>
  );
}
