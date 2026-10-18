<?php

namespace AppApi\Media;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Validation d'upload réutilisable par tous les modules qui acceptent des
 * fichiers (Profil ici, puis Feed/Archives dans des sprints ultérieurs).
 *
 * Point de sécurité important : on ne fait JAMAIS confiance à l'extension
 * du fichier ni au Content-Type envoyé par le navigateur (facilement
 * falsifiables). La vérification se fait sur les "magic bytes" réels du
 * fichier via getimagesize()/finfo, qui lisent le contenu binaire.
 */
final class UploadValidator {

    private const ALLOWED_IMAGE_MIME_TYPES = [ 'image/jpeg', 'image/png', 'image/webp' ];
    private const MAX_IMAGE_SIZE_BYTES     = 5 * MB_IN_BYTES;

    /**
     * @param array $file Une entrée de $_FILES (ex. $_FILES['avatar']).
     * @return true|\WP_Error
     */
    public static function validate_image( array $file ) {
        if ( ! isset( $file['tmp_name'], $file['size'], $file['error'] ) ) {
            return new \WP_Error( 'invalid_upload', 'Fichier manquant ou requête malformée.' );
        }

        if ( UPLOAD_ERR_OK !== $file['error'] ) {
            return new \WP_Error( 'upload_error', 'Erreur lors du transfert du fichier.' );
        }

        if ( $file['size'] > self::MAX_IMAGE_SIZE_BYTES ) {
            return new \WP_Error( 'file_too_large', 'L’image ne doit pas dépasser 5 Mo.' );
        }

        // Vérifie le CONTENU réel du fichier, pas son nom/extension.
        $finfo     = finfo_open( FILEINFO_MIME_TYPE );
        $real_mime = finfo_file( $finfo, $file['tmp_name'] );
        finfo_close( $finfo );

        if ( ! in_array( $real_mime, self::ALLOWED_IMAGE_MIME_TYPES, true ) ) {
            return new \WP_Error( 'invalid_file_type', 'Seuls les formats JPEG, PNG et WebP sont acceptés.' );
        }

        // Double vérification : le fichier doit être décodable comme une
        // vraie image (bloque les fichiers polyglottes qui seraient valides
        // à la fois comme image ET comme script exécutable).
        $image_info = @getimagesize( $file['tmp_name'] );
        if ( false === $image_info ) {
            return new \WP_Error( 'invalid_image', 'Le fichier n’est pas une image valide.' );
        }

        return true;
    }
}
