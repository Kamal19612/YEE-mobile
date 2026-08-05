import { useState, type FormEvent } from 'react';
import { useLogin } from '../hooks/useLogin';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const { mutate, isPending, error } = useLogin();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutate({ email, password, rememberMe });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="rounded border-gray-300"
        />
        Se souvenir de moi
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {extractApiErrorMessage(error)}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-white font-medium disabled:opacity-50"
      >
        {isPending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
