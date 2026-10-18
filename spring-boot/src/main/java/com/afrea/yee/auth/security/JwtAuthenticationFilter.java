package com.afrea.yee.auth.security;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private final JwtService jwtService;
	private final UserRepository userRepository;
	private final ObjectMapper objectMapper;
	private final SecurityContextRepository securityContextRepository =
			new RequestAttributeSecurityContextRepository();

	public JwtAuthenticationFilter(
			JwtService jwtService,
			UserRepository userRepository,
			ObjectMapper objectMapper) {
		this.jwtService = jwtService;
		this.userRepository = userRepository;
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
			filterChain.doFilter(request, response);
			return;
		}

		String token = header.substring(7).trim();
		if (token.isEmpty()) {
			filterChain.doFilter(request, response);
			return;
		}

		try {
			UUID userId = jwtService.parseUserId(token);
			User user = userRepository.findById(userId).orElse(null);
			if (user == null || user.isAccountDeactivated()) {
				writeUnauthorized(response, "app_auth_invalid_payload", "Payload invalide.");
				return;
			}
			UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail(), user.isSiteAdmin());
			UsernamePasswordAuthenticationToken authentication =
					new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
			authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

			SecurityContext context = SecurityContextHolder.createEmptyContext();
			context.setAuthentication(authentication);
			SecurityContextHolder.setContext(context);
			// Persiste pour les dispatches async SSE (le filtre JWT ne se rejoue pas)
			securityContextRepository.saveContext(context, request, response);

			filterChain.doFilter(request, response);
		} catch (AppException ex) {
			writeUnauthorized(response, ex.getCode(), ex.getMessage());
		}
	}

	private void writeUnauthorized(HttpServletResponse response, String code, String message) throws IOException {
		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		objectMapper.writeValue(response.getOutputStream(), ApiResponse.fail(code, message));
	}
}
