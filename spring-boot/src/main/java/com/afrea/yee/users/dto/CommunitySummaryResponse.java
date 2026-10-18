package com.afrea.yee.users.dto;

/** Effectifs réels de la carte « Communauté YEE ». Pas de compteur « en ligne ». */
public record CommunitySummaryResponse(long members, long groups) {
}
