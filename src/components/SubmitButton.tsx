'use client';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, pendingText = 'Please wait…', className = 'btn', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} {...rest}>{pending ? pendingText : children}</button>;
}
