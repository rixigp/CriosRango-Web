<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

$GLOBALS['cr2026_brands_index_view'] = true;
$brands = cr2026_brands_index_terms();

get_header( 'shop' );
?>
<main id="primary" class="cr-main cr-main--woocommerce cr-brands-index">
    <div class="cr-brands-index__shell">
        <?php if ( function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) : ?>
            <?php cr2026_render_category_toolbar( __( 'Nuestras marcas', 'crios-rango-2026' ), home_url( '/' ), 'parent', false ); ?>
        <?php endif; ?>
        <header class="cr-brands-index__toolbar">
            <a class="cr-parent-category__back" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php esc_attr_e( 'Volver a Inicio', 'crios-rango-2026' ); ?>">
                <?php echo cr2026_icon( 'arrow' ); ?>
            </a>
            <h1>Nuestras marcas</h1>
        </header>

        <?php if ( ! empty( $brands ) ) : ?>
            <div class="cr-brands-index__grid" aria-label="<?php esc_attr_e( 'Todas nuestras marcas', 'crios-rango-2026' ); ?>">
                <?php foreach ( $brands as $brand ) : ?>
                    <?php
                    $brand_url = get_term_link( $brand, 'product_brand' );
                    if ( is_wp_error( $brand_url ) ) { continue; }
                    $brand_logo = cr2026_home_brand_image_url( $brand );
                    ?>
                    <a class="cr-brands-index__card" href="<?php echo esc_url( $brand_url ); ?>"
                        data-brand-term-id="<?php echo esc_attr( (int) $brand->term_id ); ?>"
                        data-brand-term-name="<?php echo esc_attr( $brand->name ); ?>"
                        data-brand-term-slug="<?php echo esc_attr( $brand->slug ); ?>">
                        <?php if ( $brand_logo ) : ?>
                            <img src="<?php echo esc_url( $brand_logo ); ?>" alt="<?php echo esc_attr( $brand->name ); ?>" loading="lazy" decoding="async">
                        <?php else : ?>
                            <span><?php echo esc_html( $brand->name ); ?></span>
                        <?php endif; ?>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <p class="cr-brands-index__empty"><?php esc_html_e( 'No hay marcas disponibles.', 'crios-rango-2026' ); ?></p>
        <?php endif; ?>
    </div>
</main>
<?php get_footer( 'shop' ); ?>
