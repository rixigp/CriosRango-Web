<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

$brand_term = get_queried_object();
if ( ! $brand_term instanceof WP_Term || 'product_brand' !== $brand_term->taxonomy ) {
    get_header();
    echo '<main id="primary" class="cr-main"><div class="cr-shell cr-page-shell"><p>' . esc_html__( 'No encontramos esta marca.', 'crios-rango-2026' ) . '</p></div></main>';
    get_footer();
    return;
}

$GLOBALS['cr2026_product_listing_view'] = true;
$brand_logo_url = function_exists( 'cr2026_home_brand_image_url' ) ? cr2026_home_brand_image_url( $brand_term ) : '';
$brands_index_url = function_exists( 'cr2026_home_brands_url' ) ? cr2026_home_brands_url() : home_url( '/' );
$brand_query = isset( $GLOBALS['wp_query'] ) && $GLOBALS['wp_query'] instanceof WP_Query ? $GLOBALS['wp_query'] : null;
$brand_found_posts = $brand_query ? (int) $brand_query->found_posts : (int) $brand_term->count;

get_header( 'shop' );
?>
<main id="primary" class="cr-main cr-main--woocommerce cr-product-listing cr-brand-archive"
    data-cr-brand-archive
    data-brand-term-id="<?php echo esc_attr( (int) $brand_term->term_id ); ?>"
    data-brand-term-name="<?php echo esc_attr( $brand_term->name ); ?>"
    data-brand-term-slug="<?php echo esc_attr( $brand_term->slug ); ?>"
    data-brand-term-count="<?php echo esc_attr( (int) $brand_term->count ); ?>"
    data-brand-main-query-found="<?php echo esc_attr( $brand_found_posts ); ?>">
    <div class="cr-product-listing__shell cr-brand-archive__shell">
        <div class="cr-brand-archive__back-row">
            <a class="cr-parent-category__back" href="<?php echo esc_url( $brands_index_url ); ?>"
                data-fallback-url="<?php echo esc_url( $brands_index_url ); ?>"
                data-site-path="<?php echo esc_attr( wp_parse_url( home_url( '/' ), PHP_URL_PATH ) ); ?>"
                aria-label="<?php esc_attr_e( 'Volver a marcas', 'crios-rango-2026' ); ?>">
                <?php echo cr2026_icon( 'arrow' ); ?>
            </a>
        </div>
        <header class="cr-brand-archive__heading">
            <?php if ( $brand_logo_url ) : ?>
                <img src="<?php echo esc_url( $brand_logo_url ); ?>" alt="<?php echo esc_attr( $brand_term->name ); ?>" loading="eager" decoding="async">
            <?php else : ?>
                <h1><?php echo esc_html( $brand_term->name ); ?></h1>
            <?php endif; ?>
        </header>
        <?php if ( have_posts() ) : ?>
            <div class="cr-product-grid" data-cr-brand-product-grid aria-live="polite">
                <?php
                $brand_card_index = 0;
                while ( have_posts() ) :
                    the_post();
                    $brand_product = function_exists( 'wc_get_product' ) ? wc_get_product( get_the_ID() ) : false;
                    if ( $brand_product instanceof WC_Product ) {
                        cr2026_render_product_card( $brand_product, $brand_card_index );
                        $brand_card_index++;
                    }
                endwhile;
                ?>
            </div>
            <?php the_posts_pagination( array( 'mid_size' => 1, 'prev_text' => esc_html__( 'Anterior', 'crios-rango-2026' ), 'next_text' => esc_html__( 'Cargar más', 'crios-rango-2026' ) ) ); ?>
        <?php else : ?>
            <p class="cr-brand-archive__empty"><?php esc_html_e( 'No hay productos disponibles para esta marca.', 'crios-rango-2026' ); ?></p>
        <?php endif; ?>
    </div>
</main>
<?php get_footer( 'shop' ); ?>
