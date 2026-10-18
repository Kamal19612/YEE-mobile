import { useState, type FormEvent } from 'react';
import { useRegister } from '../hooks/useRegister';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { mutate, isPending, error } = useRegister();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);

    mutate(
      { email, password, displayName },
      {
        onSuccess: (result) => {
          if (result.success) {
            setSuccessMessage(result.data.message);
          }
        },
      },
    );
  }

  if (successMessage) {
    return (
      <div className="max-w-sm mx-auto text-center text-sm text-gray-700">
        <p>{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
          Nom affiché
        </label>
        <input
          id="displayName"
          type="text"
          required
          minLength={2}
          maxLength={60}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500">Au moins 10 caractères.</p>
      </div>

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
        {isPending ? 'Création du compte…' : 'Créer un compte'}
      </button>
    </form>
  );
}
