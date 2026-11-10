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
$brand_filtered = ! empty( cr2026_category_filter_selected_values( 'size_ids' ) ) || ! empty( cr2026_category_filter_selected_values( 'color_ids' ) );
$brand_remove_filter_url = remove_query_arg( array( 'size_ids', 'color_ids', 'brand_ids' ) );
$brand_debug = ( function_exists( 'wp_get_environment_type' ) && in_array( wp_get_environment_type(), array( 'staging', 'development', 'local' ), true ) )
    || ( isset( $_SERVER['REQUEST_URI'] ) && 0 === strpos( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ), '/prueba/' ) );

get_header( 'shop' );
?>
<main id="primary" class="cr-main cr-main--woocommerce cr-product-listing cr-brand-archive"
    data-cr-product-list
    data-cr-brand-archive
    data-context="brand"
    data-filtered="<?php echo $brand_filtered ? '1' : '0'; ?>"
    data-debug="<?php echo $brand_debug ? '1' : '0'; ?>"
    data-category-id="0"
    data-brand-term-id="<?php echo esc_attr( (int) $brand_term->term_id ); ?>"
    data-outlet-category-id="0"
    data-page-size="<?php echo esc_attr( CR2026_CATALOG_PAGE_SIZE ); ?>"
    data-filter-api-url="<?php echo esc_url( rest_url( 'criosrango-filter/v1/query' ) ); ?>"
    data-products-url="<?php echo esc_url( rest_url( 'cr2026/v1/catalog-page' ) ); ?>"
    data-brand-term-name="<?php echo esc_attr( $brand_term->name ); ?>"
    data-brand-term-slug="<?php echo esc_attr( $brand_term->slug ); ?>"
    data-brand-term-count="<?php echo esc_attr( (int) $brand_term->count ); ?>">
    <div class="cr-product-listing__shell cr-brand-archive__shell">
        <?php if ( function_exists( 'wp_is_mobile' ) && wp_is_mobile() ) : ?>
            <?php
            $brand_filter_action = '<button type="button" class="cr-parent-category__filters" data-cr-filter-open aria-haspopup="dialog">' . esc_html__( 'Filtros', 'crios-rango-2026' ) . '</button>';
            cr2026_render_category_toolbar( $brand_term->name, $brands_index_url, 'parent', false, $brand_filter_action );
            ?>
        <?php endif; ?>
        <div class="cr-brand-archive__back-row">
            <a class="cr-parent-category__back" href="<?php echo esc_url( $brands_index_url ); ?>"
                data-fallback-url="<?php echo esc_url( $brands_index_url ); ?>"
                data-site-path="<?php echo esc_attr( wp_parse_url( home_url( '/' ), PHP_URL_PATH ) ); ?>"
                aria-label="<?php esc_attr_e( 'Volver a marcas', 'crios-rango-2026' ); ?>">
                <?php echo cr2026_icon( 'arrow' ); ?>
            </a>
            <header class="cr-brand-archive__heading">
                <?php if ( $brand_logo_url ) : ?>
                    <img src="<?php echo esc_url( $brand_logo_url ); ?>" alt="<?php echo esc_attr( $brand_term->name ); ?>" loading="eager" decoding="async">
                <?php else : ?>
                    <h1><?php echo esc_html( $brand_term->name ); ?></h1>
                <?php endif; ?>
            </header>
            <button type="button" class="cr-parent-category__filters" data-cr-filter-open aria-haspopup="dialog"><?php esc_html_e( 'Filtros', 'crios-rango-2026' ); ?></button>
        </div>
        <?php
        $brand_orderby = isset( $_GET['orderby'] ) ? sanitize_key( wp_unslash( $_GET['orderby'] ) ) : 'date';
        if ( ! in_array( $brand_orderby, array( 'date', 'price', 'price-desc', 'title' ), true ) ) { $brand_orderby = 'date'; }
        $brand_archive_url = get_term_link( $brand_term );
        if ( is_wp_error( $brand_archive_url ) ) { $brand_archive_url = home_url( '/' ); }
        ?>
        <?php cr2026_render_category_filter_sheet( $brand_term, 'brand' ); ?>
        <div class="cr-product-listing__active-filters" data-cr-active-filter-chips hidden aria-live="polite"></div>
        <div class="cr-product-listing__ordering">
            <label for="cr-brand-product-order"><?php esc_html_e( 'Ordenar por', 'crios-rango-2026' ); ?></label>
            <span class="cr-product-listing__select-wrap">
                <select id="cr-brand-product-order" data-cr-product-order aria-label="<?php esc_attr_e( 'Ordenar productos', 'crios-rango-2026' ); ?>">
                    <option value="date"<?php selected( 'date', $brand_orderby ); ?>><?php esc_html_e( 'Más recientes', 'crios-rango-2026' ); ?></option>
                    <option value="price"<?php selected( 'price', $brand_orderby ); ?>><?php esc_html_e( 'Precio: menor a mayor', 'crios-rango-2026' ); ?></option>
                    <option value="price-desc"<?php selected( 'price-desc', $brand_orderby ); ?>><?php esc_html_e( 'Precio: mayor a menor', 'crios-rango-2026' ); ?></option>
                    <option value="title"<?php selected( 'title', $brand_orderby ); ?>><?php esc_html_e( 'Nombre A-Z', 'crios-rango-2026' ); ?></option>
                </select>
            </span>

        </div>
        <div class="cr-product-grid" data-cr-product-grid aria-live="polite">
            <?php for ( $skeleton_index = 0; $skeleton_index < 4; $skeleton_index++ ) : ?>
                <div class="cr-product-skeleton" aria-hidden="true"><span></span><i></i><b></b></div>
            <?php endfor; ?>
        </div>
        <div class="cr-product-listing__empty" data-cr-product-empty hidden>
            <p><?php echo $brand_filtered ? esc_html__( 'No encontramos productos con esos filtros.', 'crios-rango-2026' ) : esc_html__( 'No hay productos disponibles para esta marca.', 'crios-rango-2026' ); ?></p>
            <?php if ( $brand_filtered ) : ?><a href="<?php echo esc_url( $brand_remove_filter_url ); ?>"><?php esc_html_e( 'Limpiar filtros', 'crios-rango-2026' ); ?></a><?php endif; ?>
        </div>
        <button type="button" class="cr-product-listing__load-more" data-cr-product-load-more hidden>Cargar más</button>
    </div>
</main>
<?php get_footer( 'shop' ); ?>
