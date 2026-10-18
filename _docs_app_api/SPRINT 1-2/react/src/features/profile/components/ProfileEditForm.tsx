import { useEffect, useState, type FormEvent } from 'react';
import { useMyProfile, useUpdateProfile } from '../hooks/useProfile';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

type FormValues = {
  displayName: string;
  bio: string;
  profession: string;
  organization: string;
  location: string;
};

const EMPTY_FORM: FormValues = {
  displayName: '',
  bio: '',
  profession: '',
  organization: '',
  location: '',
};

/**
 * Envoie uniquement les champs modifiés (sémantique PATCH), pas l'objet
 * profil complet — cohérent avec ProfileFields::validate_and_sanitize()
 * côté backend, qui traite un champ absent comme "non modifié" plutôt que
 * "à vider".
 */
export function ProfileEditForm() {
  const { data: profile, isLoading } = useMyProfile();
  const { mutate, isPending, error, isSuccess } = useUpdateProfile();

  const [values, setValues] = useState<FormValues>(EMPTY_FORM);

  // Initialise le formulaire une fois le profil chargé (et à chaque
  // rechargement du profil depuis le serveur, ex. après un F5).
  useEffect(() => {
    if (profile) {
      setValues({
        displayName: profile.displayName,
        bio: profile.bio,
        profession: profile.profession,
        organization: profile.organization,
        location: profile.location,
      });
    }
  }, [profile]);

  if (isLoading || !profile) {
    return <p className="text-sm text-gray-500">Chargement du profil…</p>;
  }

  function handleChange(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutate(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
          Nom affiché
        </label>
        <input
          id="displayName"
          value={values.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          maxLength={60}
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="bio" className="text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          value={values.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          maxLength={500}
          rows={3}
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-xs text-gray-400">{values.bio.length}/500</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="profession" className="text-sm font-medium text-gray-700">
            Profession
          </label>
          <input
            id="profession"
            value={values.profession}
            onChange={(e) => handleChange('profession', e.target.value)}
            maxLength={120}
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="organization" className="text-sm font-medium text-gray-700">
            Organisation
          </label>
          <input
            id="organization"
            value={values.organization}
            onChange={(e) => handleChange('organization', e.target.value)}
            maxLength={120}
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="location" className="text-sm font-medium text-gray-700">
          Localisation
        </label>
        <input
          id="location"
          value={values.location}
          onChange={(e) => handleChange('location', e.target.value)}
          maxLength={120}
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {isSuccess && <p className="text-sm text-green-600">Profil mis à jour.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-indigo-600 px-4 py-2 text-white font-medium disabled:opacity-50"
      >
        {isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  );
}
