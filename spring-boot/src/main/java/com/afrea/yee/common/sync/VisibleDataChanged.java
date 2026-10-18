package com.afrea.yee.common.sync;

/**
 * Signal envoyé après un enregistrement réussi.
 * Il ne transporte aucun contenu : les écrans ouverts rechargent
 * la zone (fil, groupes, membres, institutions, ressources, événements)
 * avec leurs propres droits.
 */
public record VisibleDataChanged(String area) {

	public static VisibleDataChanged feed() {
		return new VisibleDataChanged("feed");
	}

	public static VisibleDataChanged groups() {
		return new VisibleDataChanged("groups");
	}

	public static VisibleDataChanged members() {
		return new VisibleDataChanged("members");
	}

	public static VisibleDataChanged institutions() {
		return new VisibleDataChanged("institutions");
	}

	public static VisibleDataChanged resources() {
		return new VisibleDataChanged("resources");
	}

	public static VisibleDataChanged events() {
		return new VisibleDataChanged("events");
	}
}
