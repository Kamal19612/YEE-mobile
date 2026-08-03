<?php
/**
 * The template for displaying archive pages
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package BuddyBoss_Theme
 */

get_header();

$blog_type = 'standard'; // standard, grid, masonry.
$blog_type = apply_filters( 'bb_blog_type', $blog_type );

$class = '';

if ( 'masonry' === $blog_type ) {
	$class = 'bb-masonry';
} elseif ( 'grid' === $blog_type ) {
	$class = 'bb-grid';
} else {
	$class = 'bb-standard';
}
/*
 * Post archives (category / tag / author / date) get the blog listing header
 * -- title plus the Category and Sort filters -- so navigating by category
 * from /blog/ does not drop the controls. Every other archive keeps the
 * generic page header below.
 *
 * Rendered as a direct child of .site-content-grid (a sibling of #primary and
 * the sidebar) so it spans the full width above both columns.
 */
$bb_is_post_archive = is_category() || is_tag() || is_author() || is_date();

if ( $bb_is_post_archive ) {
	get_template_part( 'template-parts/blog-header' );
}
?>

<div id="primary" class="content-area">
	<main id="main" class="site-main">

		<?php if ( have_posts() ) : ?>
			<?php if ( ! $bb_is_post_archive ) : ?>
			<header class="page-header">
				<?php
				the_archive_title( '<h1 class="page-title">', '</h1>' );
				the_archive_description( '<div class="archive-description">', '</div>' );
				?>
			</header><!-- .page-header -->
			<?php endif; ?>

			<div class="post-grid <?php echo esc_attr( $class ); ?>">

				<?php if ( 'masonry' === $blog_type ) { ?>
					<div class="bb-masonry-sizer"></div>
				<?php } ?>

				<?php
				/* Start the Loop */
				while ( have_posts() ) :
					the_post();

					/*
					 * Include the Post-Format-specific template for the content.
					 * If you want to override this in a child theme, then include a file
					 * called content-___.php (where ___ is the Post Format name) and that will be used instead.
					 */
					get_template_part( 'template-parts/content', apply_filters( 'bb_blog_content', get_post_format() ) );

				endwhile;
				?>
			</div>

			<?php
			buddyboss_pagination();

		else :
			get_template_part( 'template-parts/content', 'none' );
			?>

		<?php endif; ?>

	</main><!-- #main -->
</div><!-- #primary -->

<?php get_sidebar(); ?>

<?php
get_footer();
