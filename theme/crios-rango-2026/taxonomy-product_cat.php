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
if ( empty( $subcategories ) ) {
    wc_get_template( 'archive-product.php' );
    return;
}

$GLOBALS['cr2026_parent_category_view'] = true;
$display_title = cr2026_product_cat_display_name( $current_term );
$back_url = home_url( '/' );

if ( ! empty( $current_term->parent ) ) {
    $parent_term = get_term( (int) $current_term->parent, 'product_cat' );
    if ( $parent_term instanceof WP_Term && ! is_wp_error( $parent_term ) ) {
        $parent_link = get_term_link( $parent_term );
        if ( ! is_wp_error( $parent_link ) ) {
            $back_url = $parent_link;
        }
    }
}

$cart_count = cr2026_cart_count();
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <?php wp_head(); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&display=swap" rel="stylesheet">
</head>
<body <?php body_class( 'cr-parent-category-view' ); ?>>
<?php wp_body_open(); ?>
<a class="cr-skip-link" href="#primary"><?php esc_html_e( 'Saltar al contenido', 'crios-rango-2026' ); ?></a>

<header class="cr-header cr-header--app-home cr-header--app-category" data-cr-header>
    <div class="cr-home-topbar">
        <a class="cr-home-mark" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
            <img class="cr-home-mark__logo" src="<?php echo esc_url( get_template_directory_uri() . '/assets/images/brand/home_logo.png' ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>" width="34" height="34" decoding="async">
        </a>
        <div class="cr-home-topbar__actions">
            <a class="cr-app-icon-button" href="<?php echo esc_url( home_url( '/?s=&post_type=product' ) ); ?>" aria-label="<?php esc_attr_e( 'Buscar', 'crios-rango-2026' ); ?>">
                <?php echo cr2026_icon( 'search' ); ?>
            </a>
            <a class="cr-app-icon-button cr-cart-link" href="<?php echo esc_url( function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/carrito/' ) ); ?>" aria-label="<?php esc_attr_e( 'Carrito', 'crios-rango-2026' ); ?>">
                <?php echo cr2026_icon( 'bag' ); ?>
                <span class="cr-cart-count<?php echo 0 === $cart_count ? ' is-empty' : ''; ?>" data-cr-cart-count data-count="<?php echo esc_attr( $cart_count ); ?>"><?php echo esc_html( $cart_count ); ?></span>
            </a>
        </div>
    </div>
</header>

<main id="primary" class="cr-parent-category__canvas">
    <div class="cr-parent-category__toolbar">
        <a class="cr-parent-category__back" href="<?php echo esc_url( $back_url ); ?>" aria-label="<?php esc_attr_e( 'Volver', 'crios-rango-2026' ); ?>">
            <?php echo cr2026_icon( 'arrow' ); ?>
        </a>
        <h1 class="cr-parent-category__title"><?php echo esc_html( $display_title ); ?></h1>
        <button class="cr-parent-category__filters" type="button" disabled aria-disabled="true"><?php esc_html_e( 'Filtros', 'crios-rango-2026' ); ?></button>
    </div>

    <div class="cr-parent-category__grid" aria-label="<?php echo esc_attr( sprintf( __( 'Subcategorías de %s', 'crios-rango-2026' ), $display_title ) ); ?>">
        <?php foreach ( $subcategories as $subcategory ) : ?>
            <?php
            $subcategory_url = get_term_link( $subcategory );
            if ( is_wp_error( $subcategory_url ) ) {
                continue;
            }
            $image_url = cr2026_product_cat_image_url( $current_term, $subcategory );
            ?>
            <a class="cr-parent-category__item" href="<?php echo esc_url( $subcategory_url ); ?>">
                <span class="cr-parent-category__media">
                    <?php if ( $image_url ) : ?>
                        <img src="<?php echo esc_url( $image_url ); ?>" alt="<?php echo esc_attr( $subcategory->name ); ?>" loading="lazy" decoding="async">
                    <?php else : ?>
                        <span class="cr-parent-category__placeholder" aria-hidden="true"></span>
                    <?php endif; ?>
                </span>
                <span class="cr-parent-category__label"><?php echo esc_html( $subcategory->name ); ?></span>
            </a>
        <?php endforeach; ?>
    </div>
</main>

<?php get_footer(); ?>
