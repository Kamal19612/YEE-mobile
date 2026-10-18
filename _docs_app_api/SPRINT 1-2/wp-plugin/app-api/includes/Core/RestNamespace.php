<?php

namespace AppApi\Core;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Centralise le namespace REST pour éviter les chaînes de caractères
 * dupliquées dans chaque contrôleur.
 */
final class RestNamespace {
    public const NAMESPACE = 'app/v1';
}
