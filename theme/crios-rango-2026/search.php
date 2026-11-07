<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

get_header();

$search_query = get_search_query();
$requested_post_type = get_query_var( 'post_type' );
$is_product_search = is_search()
    && ( 'product' === $requested_post_type
        || ( is_array( $requested_post_type ) && in_array( 'product', $requested_post_type, true ) ) );
?>
<main id="primary" class="cr-main">
    <div class="cr-shell cr-page-shell">
        <header class="cr-page__header">
            <p class="cr-eyebrow"><?php esc_html_e( 'Resultados', 'crios-rango-2026' ); ?></p>
            <h1>
                <?php
                if ( $is_product_search ) {
                    printf( esc_html__( 'Productos para: %s', 'crios-rango-2026' ), esc_html( $search_query ) );
                } else {
                    printf( esc_html__( 'Buscar: %s', 'crios-rango-2026' ), esc_html( $search_query ) );
                }
                ?>
            </h1>
        </header>
        <?php get_search_form(); ?>

        <?php if ( have_posts() ) : ?>
            <?php if ( $is_product_search && function_exists( 'wc_get_product' ) && function_exists( 'cr2026_render_product_card' ) ) : ?>
                <div class="cr-product-grid" data-cr-search-product-grid aria-live="polite">
                    <?php
                    $card_index = 0;
                    while ( have_posts() ) :
                        the_post();
                        $search_product = wc_get_product( get_the_ID() );
                        if ( $search_product instanceof WC_Product ) {
                            cr2026_render_product_card( $search_product, $card_index );
                            $card_index++;
                        }
                    endwhile;
                    ?>
                </div>
            <?php else : ?>
                <div class="cr-post-grid">
                    <?php while ( have_posts() ) : the_post(); ?>
                        <article <?php post_class( 'cr-post-card' ); ?>>
                            <?php if ( has_post_thumbnail() ) : ?><a href="<?php the_permalink(); ?>"><?php the_post_thumbnail( 'large' ); ?></a><?php endif; ?>
                            <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                            <?php the_excerpt(); ?>
                        </article>
                    <?php endwhile; ?>
                </div>
            <?php endif; ?>
            <?php the_posts_pagination(); ?>
        <?php else : ?>
            <?php if ( $is_product_search ) : ?>
                <p class="cr-search-no-products"><?php printf( esc_html__( 'No hemos encontrado productos para “%s”.', 'crios-rango-2026' ), esc_html( $search_query ) ); ?></p>
                <p><a href="<?php echo esc_url( cr2026_shop_url() ); ?>"><?php esc_html_e( 'Ver todos los productos', 'crios-rango-2026' ); ?></a></p>
            <?php else : ?>
                <p><?php esc_html_e( 'No hemos encontrado resultados.', 'crios-rango-2026' ); ?></p>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</main>
<?php get_footer(); ?>
