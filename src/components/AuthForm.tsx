'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { login, register, requestPasswordReset, resetPassword, type FormState } from '@/actions/auth';
import { useT } from '@/i18n/client';
import { Flash } from './Flash';
import { SubmitButton } from './SubmitButton';

export function LoginForm({ next }: { next?: string }) {
  const a = useT().auth;
  const [state, action] = useActionState<FormState, FormData>(login, undefined);
  return (
    <section className="auth">
      <h1>{a.signInTitle}</h1>
      <Flash state={state} />
      <form action={action}>
        {next && <input type="hidden" name="next" value={next} />}
        <label>{a.email} <input type="email" name="email" dir="ltr" required autoComplete="email" /></label>
        <label>{a.password} <input type="password" name="password" required autoComplete="current-password" /></label>
        <SubmitButton pendingText={a.signingIn}>{a.signInButton}</SubmitButton>
      </form>
      <p className="quiet"><Link href="/forgot">{a.forgot}</Link></p>
      <p className="quiet">{a.newHere}<Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}>{a.createFree}</Link></p>
    </section>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const a = useT().auth;
  const [state, action] = useActionState<FormState, FormData>(register, undefined);
  return (
    <section className="auth">
      <h1>{a.registerTitle}</h1>
      <p className="quiet">{a.registerIntro}</p>
      <Flash state={state} />
      <form action={action}>
        {next && <input type="hidden" name="next" value={next} />}
        <label>{a.email} <input type="email" name="email" dir="ltr" required autoComplete="email" /></label>
        <label>{a.password} <input type="password" name="password" minLength={8} required autoComplete="new-password" /><small>{a.passwordHint}</small></label>
        <label>{a.confirmPassword} <input type="password" name="confirmPassword" minLength={8} required autoComplete="new-password" /></label>
        <SubmitButton pendingText={a.creating}>{a.createButton}</SubmitButton>
      </form>
      <p className="quiet">{a.agree[0]}<Link href="/terms">{a.agree[1]}</Link>{a.agree[2]}<Link href="/privacy">{a.agree[3]}</Link>{a.agree[4]}</p>
      <p className="quiet">{a.already}<Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>{a.signInLink}</Link></p>
    </section>
  );
}

export function ForgotForm() {
  const a = useT().auth;
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  return (
    <section className="auth">
      <h1>{a.forgotTitle}</h1>
      <Flash state={state} />
      {!state?.ok && (
        <form action={action}>
          <label>{a.email} <input type="email" name="email" dir="ltr" required autoComplete="email" /></label>
          <SubmitButton pendingText={a.sending}>{a.sendLink}</SubmitButton>
        </form>
      )}
      <p className="quiet"><Link href="/login">{a.backToSignIn}</Link></p>
    </section>
  );
}

export function ResetForm({ token }: { token: string }) {
  const a = useT().auth;
  const [state, action] = useActionState<FormState, FormData>(resetPassword, undefined);
  return (
    <section className="auth">
      <h1>{a.resetTitle}</h1>
      <Flash state={state} />
      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <label>{a.newPassword} <input type="password" name="password" minLength={8} required autoComplete="new-password" /></label>
        <SubmitButton pendingText={a.saving}>{a.savePassword}</SubmitButton>
      </form>
    </section>
  );
}
