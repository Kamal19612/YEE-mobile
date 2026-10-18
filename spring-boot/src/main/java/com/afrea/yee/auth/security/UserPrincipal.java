package com.afrea.yee.auth.security;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class UserPrincipal implements UserDetails {

	private final UUID id;
	private final String email;
	private final boolean siteAdmin;

	public UserPrincipal(UUID id, String email, boolean siteAdmin) {
		this.id = id;
		this.email = email;
		this.siteAdmin = siteAdmin;
	}

	public UUID getId() {
		return id;
	}

	public boolean isSiteAdmin() {
		return siteAdmin;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		if (siteAdmin) {
			return List.of(new SimpleGrantedAuthority("ROLE_SITE_ADMIN"));
		}
		return List.of(new SimpleGrantedAuthority("ROLE_USER"));
	}

	@Override
	public String getPassword() {
		return "";
	}

	@Override
	public String getUsername() {
		return email;
	}

	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	@Override
	public boolean isAccountNonLocked() {
		return true;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	@Override
	public boolean isEnabled() {
		return true;
	}
}
