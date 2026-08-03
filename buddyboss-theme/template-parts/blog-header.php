<?php
/**
 * Blog listing header — title, Category / Sort filters, and action buttons.
 *
 * Mirrors the ReadyLaunch blog archive header (`readylaunch/blog/archive-header.php`)
 * for classic theme mode. The action buttons are NOT rendered here: firing
 * `bb_blog_archive_header_actions` lets Pro's "Subscribe" and the Member
 * Blogging add-on's "Create New" attach themselves, so each keeps its own
 * settings gate (Blog Settings -> Post Settings, and the member blogging
 * feature) instead of this template re-deriving them.
 *
 * @since   2.21.0
 *
 * @package BuddyBoss_Theme
 */

defined( 'ABSPATH' ) || exit;

$bb_blog_header_title       = '';
$bb_blog_header_description = '';

if ( is_category() || is_tag() ) {
	$bb_blog_header_title       = single_term_title( '', false );
	$bb_blog_header_description = term_description();
} elseif ( is_author() ) {
	/* translators: %s: author display name. */
	$bb_blog_header_title = sprintf( __( 'Posts by %s', 'buddyboss-theme' ), get_the_author_meta( 'display_name', (int) get_query_var( 'author' ) ) );
} elseif ( is_date() ) {
	$bb_blog_header_title = get_the_archive_title();
} else {
	// Posts page title when one is assigned, else a sensible default.
	$bb_blog_header_posts_page = (int) get_option( 'page_for_posts' );

	if ( $bb_blog_header_posts_page ) {
		$bb_blog_header_title = get_the_title( $bb_blog_header_posts_page );
	}

	if ( empty( $bb_blog_header_title ) ) {
		$bb_blog_header_title = __( 'Blog', 'buddyboss-theme' );
	}
}

// The sort selection carries across category navigation.
$bb_blog_header_is_asc   = 'asc' === strtolower( (string) get_query_var( 'order' ) );
$bb_blog_header_home_url = get_post_type_archive_link( 'post' );

if ( empty( $bb_blog_header_home_url ) ) {
	$bb_blog_header_posts_page = (int) get_option( 'page_for_posts' );
	$bb_blog_header_home_url   = $bb_blog_header_posts_page ? get_permalink( $bb_blog_header_posts_page ) : home_url( '/' );
}

$bb_blog_header_sort_arg = array(
	'orderby' => 'date',
	'order'   => 'asc',
);

$bb_blog_header_categories = get_categories(
	array(
		'hide_empty' => true,
		'orderby'    => 'name',
	)
);

$bb_blog_header_current_cat = is_category() ? (int) get_queried_object_id() : 0;
$bb_blog_header_current_url = is_category() ? get_category_link( $bb_blog_header_current_cat ) : $bb_blog_header_home_url;
?>
<div class="bb-blog-dir-header">
	<div class="bb-blog-dir-header__heading">
		<h1 class="bb-blog-dir-header__title"><?php echo esc_html( $bb_blog_header_title ); ?></h1>
		<?php if ( ! empty( $bb_blog_header_description ) ) : ?>
			<div class="bb-blog-dir-header__description"><?php echo wp_kses_post( $bb_blog_header_description ); ?></div>
		<?php endif; ?>
	</div>

	<div class="bb-blog-dir-header__controls">
		<?php if ( ! empty( $bb_blog_header_categories ) ) : ?>
			<label class="bb-blog-filter">
				<span class="screen-reader-text"><?php esc_html_e( 'Category', 'buddyboss-theme' ); ?></span>
				<select class="bb-blog-filter__select" data-bb-blog-filter="category">
					<option value="<?php echo esc_url( $bb_blog_header_is_asc ? add_query_arg( $bb_blog_header_sort_arg, $bb_blog_header_home_url ) : $bb_blog_header_home_url ); ?>"><?php esc_html_e( 'All Category', 'buddyboss-theme' ); ?></option>
					<?php
					foreach ( $bb_blog_header_categories as $bb_blog_header_category ) :
						$bb_blog_header_category_url = get_category_link( $bb_blog_header_category );

						if ( $bb_blog_header_is_asc ) {
							$bb_blog_header_category_url = add_query_arg( $bb_blog_header_sort_arg, $bb_blog_header_category_url );
						}
						?>
						<option value="<?php echo esc_url( $bb_blog_header_category_url ); ?>" <?php selected( $bb_blog_header_current_cat, (int) $bb_blog_header_category->term_id ); ?>><?php echo esc_html( $bb_blog_header_category->name ); ?></option>
					<?php endforeach; ?>
				</select>
			</label>
		<?php endif; ?>

		<label class="bb-blog-filter">
			<span class="screen-reader-text"><?php esc_html_e( 'Sort by', 'buddyboss-theme' ); ?></span>
			<select class="bb-blog-filter__select" data-bb-blog-filter="sort">
				<option value="<?php echo esc_url( $bb_blog_header_current_url ); ?>" <?php selected( ! $bb_blog_header_is_asc ); ?>><?php esc_html_e( 'Newest', 'buddyboss-theme' ); ?></option>
				<option value="<?php echo esc_url( add_query_arg( $bb_blog_header_sort_arg, $bb_blog_header_current_url ) ); ?>" <?php selected( $bb_blog_header_is_asc ); ?>><?php esc_html_e( 'Oldest', 'buddyboss-theme' ); ?></option>
			</select>
		</label>

		<?php
		/*
		 * Buffered rather than gated on has_action(): the callbacks are always
		 * registered but output nothing when their own settings gate fails
		 * (logged out, Subscriptions off, no create capability). Testing the
		 * rendered output instead keeps the divider and wrapper from appearing
		 * around nothing.
		 */
		ob_start();

		/** This action is documented in buddyboss-platform/src/bp-templates/bp-nouveau/readylaunch/blog/archive-header.php */
		do_action( 'bb_blog_archive_header_actions' );

		$bb_blog_header_actions = trim( ob_get_clean() );

		if ( '' !== $bb_blog_header_actions ) :
			?>
			<span class="bb-blog-dir-header__divider" aria-hidden="true"></span>

			<div class="bb-blog-dir-header__actions">
				<?php echo $bb_blog_header_actions; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- markup already escaped by the hooked callbacks. ?>
			</div>
			<?php
		endif;
		?>
	</div>
</div>
