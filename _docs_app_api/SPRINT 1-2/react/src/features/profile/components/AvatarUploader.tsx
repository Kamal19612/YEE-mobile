import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAvatar } from '../api/profileApi';
import { profileKeys } from '../hooks/useProfile';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Validation côté client : améliore l'expérience (feedback immédiat, pas
 * d'aller-retour réseau pour un fichier évidemment invalide) mais n'est en
 * AUCUN CAS une mesure de sécurité — la validation qui compte est celle du
 * backend (UploadValidator::validate_image, basée sur le contenu réel du
 * fichier). Un attaquant peut trivialement contourner ce check client.
 */
export function AvatarUploader({ currentAvatarUrl }: { currentAvatarUrl: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: profileKeys.me });
      }
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setClientError(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setClientError('Formats acceptés : JPEG, PNG, WebP.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setClientError('L’image ne doit pas dépasser 5 Mo.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    mutate(file);
  }

  const displayedUrl = preview ?? currentAvatarUrl;

  return (
    <div className="flex items-center gap-4">
      <img
        src={displayedUrl}
        alt="Avatar"
        className="h-20 w-20 rounded-full object-cover border border-gray-200"
      />
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isPending ? 'Envoi…' : 'Changer la photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        {(clientError || error) && (
          <p role="alert" className="text-xs text-red-600">
            {clientError ?? extractApiErrorMessage(error)}
          </p>
        )}
      </div>
    </div>
  );
}
