<?php
/**
 * Parent product categories use the app-like subcategory landing.
 * Leaf categories delegate to the untouched WooCommerce archive.
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$current_term = get_queried_object();
if ( ! $current_term instanceof WP_Term || 'product_cat' !== $current_term->taxonomy ) {
    wc_get_template( 'archive-product.php' );
    return;
}

$subcategories = cr2026_product_cat_children( $current_term->term_id );
if ( cr2026_category_filters_selected() ) {
    wc_get_template( 'archive-product.php' );
    return;
}
if ( empty( $subcategories ) ) {
    wc_get_template( 'archive-product.php' );
    return;
}

$GLOBALS['cr2026_parent_category_view'] = true;
$display_title = cr2026_product_cat_display_name( $current_term );
$back_url = cr2026_category_back_url( $current_term );

wp_enqueue_style(
    'cr2026-category-roboto',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&display=swap',
    array(),
    null
);
get_header();
?>

<main id="primary" class="cr-parent-category__canvas">
    <?php cr2026_render_category_toolbar( $display_title, $back_url, 'parent', true ); ?>

    <?php cr2026_render_category_filter_sheet( $current_term, 'parent' ); ?>

    <div class="cr-parent-category__grid" aria-label="<?php echo esc_attr( sprintf( __( 'Subcategorías de %s', 'crios-rango-2026' ), $display_title ) ); ?>">
        <?php foreach ( $subcategories as $subcategory ) : ?>
            <?php
            $subcategory_url = get_term_link( $subcategory );
            if ( is_wp_error( $subcategory_url ) ) {
                continue;
            }
            $image_url = cr2026_subcategory_image_url( $subcategory );
            ?>
            <a class="cr-parent-category__item" href="<?php echo esc_url( $subcategory_url ); ?>">
                <span class="cr-parent-category__media">
                    <?php if ( $image_url ) : ?>
                        <img src="<?php echo esc_url( $image_url ); ?>" alt="<?php echo esc_attr( cr2026_product_cat_display_name( $subcategory ) ); ?>" loading="lazy" decoding="async">
                    <?php else : ?>
                        <span class="cr-parent-category__placeholder" aria-hidden="true"></span>
                    <?php endif; ?>
                </span>
                <span class="cr-parent-category__label"><?php echo esc_html( cr2026_product_cat_display_name( $subcategory ) ); ?></span>
            </a>
        <?php endforeach; ?>
    </div>
</main>

<?php get_footer(); ?>
