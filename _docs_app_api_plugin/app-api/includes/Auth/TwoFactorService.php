<?php

namespace AppApi\Auth;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * ARCHITECTURE 2FA — non activée dans ce sprint, posée pour ne pas avoir à
 * modifier le flux de login plus tard (cahier des charges : "double
 * authentification (prévoir l'architecture)").
 *
 * Flux prévu une fois activé (TOTP, type Google Authenticator) :
 *
 * 1. POST /auth/login avec email+password valides ET user->two_factor_enabled === true
 *    -> AuthController NE délivre PAS immédiatement les tokens.
 *    -> Il émet un "challenge_token" de courte durée (5 min, même mécanique
 *       que JwtService mais avec un claim `purpose: '2fa_challenge'`, pour
 *       qu'il ne puisse jamais être confondu avec un access token).
 *    -> Réponse : { success: true, data: { requires2fa: true, challengeToken } }
 *
 * 2. Le frontend affiche un écran de saisie du code TOTP à 6 chiffres, et
 *    appelle POST /auth/2fa/verify avec { challengeToken, code }.
 *
 * 3. is_code_valid() vérifie le code contre le secret TOTP stocké
 *    (chiffré en base, jamais en clair — cf. Chiffrement des données
 *    sensibles dans les exigences sécurité).
 *
 * 4. Si valide : émission normale de l'access token + refresh token, comme
 *    un login classique.
 *
 * Cette classe est un STUB volontaire : l'algorithme TOTP (RFC 6238) et
 * l'écran d'enrôlement (QR code, secret, codes de récupération) seront
 * implémentés dans un sprint dédié "Sécurité renforcée", une fois le socle
 * d'authentification simple validé en production.
 */
final class TwoFactorService {

    /**
     * @return bool Toujours false tant que la 2FA n'est pas activée pour
     *              l'utilisateur (colonne user meta à ajouter au sprint dédié).
     */
    public static function is_enabled_for_user( int $user_id ): bool {
        return (bool) get_user_meta( $user_id, 'app_2fa_enabled', true );
    }

    // is_code_valid(), generate_secret(), generate_recovery_codes() :
    // implémentés au sprint "Sécurité renforcée".
}
