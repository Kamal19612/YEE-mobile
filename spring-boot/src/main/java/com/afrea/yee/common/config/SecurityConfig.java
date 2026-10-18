package com.afrea.yee.common.config;

import com.afrea.yee.auth.security.ApiAccessDeniedHandler;
import com.afrea.yee.auth.security.ApiAuthenticationEntryPoint;
import com.afrea.yee.auth.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	SecurityFilterChain securityFilterChain(
			HttpSecurity http,
			JwtAuthenticationFilter jwtAuthenticationFilter,
			ApiAuthenticationEntryPoint authenticationEntryPoint,
			ApiAccessDeniedHandler accessDeniedHandler) throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.cors(Customizer.withDefaults())
				.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				// SSE : conserver l’auth JWT sur les dispatches async Tomcat
				.securityContext(sc -> sc
						.securityContextRepository(new RequestAttributeSecurityContextRepository())
						.requireExplicitSave(true))
				.exceptionHandling(ex -> ex
						.authenticationEntryPoint(authenticationEntryPoint)
						.accessDeniedHandler(accessDeniedHandler))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.POST,
								"/api/auth/register",
								"/api/auth/verify-email",
								"/api/auth/login",
								"/api/auth/refresh",
								"/api/auth/forgot-password",
								"/api/auth/reset-password",
								"/api/auth/resend-verification")
						.permitAll()
						.requestMatchers("/api/auth/logout", "/api/auth/me").authenticated()
						.requestMatchers("/api/admin/**").hasRole("SITE_ADMIN")
						.requestMatchers(HttpMethod.GET, "/api/users/me", "/api/users/me/group-invites").authenticated()
						.requestMatchers(HttpMethod.PATCH, "/api/users/me").authenticated()
						.requestMatchers(HttpMethod.PUT, "/api/users/me/password").authenticated()
						.requestMatchers(HttpMethod.POST, "/api/users/me/avatar", "/api/users/me/cover").authenticated()
						.requestMatchers(HttpMethod.DELETE, "/api/users/me").authenticated()
						.requestMatchers(HttpMethod.GET, "/api/users/search").authenticated()
						.requestMatchers(HttpMethod.POST, "/api/users/*/follow").authenticated()
						.requestMatchers(HttpMethod.DELETE, "/api/users/*/follow").authenticated()
						.requestMatchers(HttpMethod.GET, "/api/feed/link-preview").authenticated()
						.requestMatchers(HttpMethod.POST, "/api/feed", "/api/feed/*/like", "/api/feed/*/comments").authenticated()
						.requestMatchers(HttpMethod.DELETE, "/api/feed/*", "/api/feed/*/like", "/api/feed/comments/*").authenticated()
						.requestMatchers(HttpMethod.POST, "/api/groups", "/api/groups/*/join", "/api/groups/*/invitations",
								"/api/groups/*/invitations/respond", "/api/groups/*/members/*/approve",
								"/api/groups/*/members/*/reject")
						.authenticated()
						.requestMatchers(HttpMethod.PATCH, "/api/groups/*", "/api/groups/*/members/*/role").authenticated()
						.requestMatchers(HttpMethod.DELETE, "/api/groups/*", "/api/groups/*/membership", "/api/groups/*/members/*")
						.authenticated()
						.requestMatchers(HttpMethod.POST, "/api/institutions", "/api/institutions/*/affiliation",
								"/api/institutions/*/affiliations/*/approve", "/api/institutions/*/affiliations/*/reject",
								"/api/institutions/*/referents")
						.authenticated()
						.requestMatchers(HttpMethod.PATCH, "/api/institutions/*").authenticated()
						.requestMatchers(HttpMethod.DELETE, "/api/institutions/*", "/api/institutions/*/affiliation",
								"/api/institutions/*/affiliations/*", "/api/institutions/*/referents/*")
						.authenticated()
						.requestMatchers("/api/notifications", "/api/notifications/**").authenticated()
						.requestMatchers("/api/conversations", "/api/conversations/**").authenticated()
						.requestMatchers(HttpMethod.GET, "/api/users", "/api/users/*", "/api/users/*/follow",
								// /media/** (hors /api) : avatars / covers statiques.
								// /api/feed/*/media/* et /api/media/post-media/* : contrôle dans PostMediaFileService.
								"/api/users/*/followers", "/api/users/*/following",
								"/media/**",
								"/api/media/**",
								"/api/feed", "/api/feed/*", "/api/feed/*/media/*",
								"/api/feed/*/comments", "/api/feed/*/likes", "/api/feed/*/likers",
								"/api/groups", "/api/groups/*", "/api/groups/*/members",
								"/api/institutions", "/api/institutions/*", "/api/institutions/*/affiliations")
						.permitAll()
						// Page d'erreur Boot : une lecture publique qui échoue
						// ne doit pas être transformée en 401.
						.requestMatchers("/error").permitAll()
						// Fermé par défaut. Un chemin oublié n'est plus public.
						.anyRequest().authenticated())
				.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}
}
