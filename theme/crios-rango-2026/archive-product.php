<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
if ( function_exists( 'is_shop' ) && is_shop() && ! cr2026_category_filters_selected() ) {
    get_header( 'shop' );
    $categories = cr2026_home_categories();
    $category_assets_url = trailingslashit( get_template_directory_uri() ) . 'assets/images/categories/';
    ?>
    <main id="primary" class="cr-main cr-main--woocommerce cr-category-hub">
      <div class="cr-category-hub__shell">
        <?php cr2026_render_category_toolbar( __( 'Categorías', 'crios-rango-2026' ), cr2026_category_back_url(), 'root', true ); ?>
        <?php cr2026_render_category_filter_sheet( null, 'root' ); ?>
        <div class="cr-app-category-grid cr-category-hub__grid">
        <?php foreach ( $categories as $category_index => $category ) :
          $term = get_term( (int) $category['id'], 'product_cat' );
          if ( ! $term || is_wp_error( $term ) ) { continue; }
          $term_link = get_term_link( $term );
          if ( is_wp_error( $term_link ) ) { continue; }
        ?>
          <a class="cr-app-category" href="<?php echo esc_url( $term_link ); ?>">
            <span class="cr-app-category__media"><img class="cr-app-category__image" src="<?php echo esc_url( $category_assets_url . $category['asset'] ); ?>" alt="<?php echo esc_attr( $category['label'] ); ?>" loading="<?php echo $category_index < 3 ? 'eager' : 'lazy'; ?>"<?php if ( 0 === $category_index ) : ?> fetchpriority="high"<?php endif; ?> decoding="async"></span>
            <span class="cr-app-category__label"><?php echo esc_html( $category['label'] ); ?></span>
          </a>
        <?php endforeach; ?>
        </div>
      </div>
    </main>
    <?php get_footer( 'shop' ); return;
}
$GLOBALS['cr2026_product_listing_view'] = true;
wp_enqueue_style(
    'cr2026-product-list-roboto',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&display=swap',
    array(),
    null
);
$listing_term = is_product_category() ? get_queried_object() : null;
$listing_term = $listing_term instanceof WP_Term && 'product_cat' === $listing_term->taxonomy ? $listing_term : null;
$listing_context = $listing_term ? 'archive' : 'root';
$listing_title = $listing_term ? cr2026_product_cat_display_name( $listing_term ) : __( 'Categorías', 'crios-rango-2026' );
$listing_back_url = $listing_term ? cr2026_category_back_url( $listing_term ) : home_url( '/' );
$listing_category_id = $listing_term ? (int) $listing_term->term_id : 0;
$listing_filtered = cr2026_category_filters_selected();
$listing_orderby = isset( $_GET['orderby'] ) ? sanitize_key( wp_unslash( $_GET['orderby'] ) ) : 'date';
if ( ! in_array( $listing_orderby, array( 'date', 'price', 'price-desc', 'title' ), true ) ) { $listing_orderby = 'date'; }
$remove_filter_url = remove_query_arg( array( 'size_ids', 'color_ids', 'brand_ids' ) );
get_header( 'shop' );
?>
<main id="primary" class="cr-main cr-main--woocommerce cr-product-listing" data-cr-product-list
    data-filtered="<?php echo $listing_filtered ? '1' : '0'; ?>"
    data-debug="<?php echo function_exists( 'wp_get_environment_type' ) && in_array( wp_get_environment_type(), array( 'staging', 'development', 'local' ), true ) ? '1' : '0'; ?>"
    data-category-id="<?php echo esc_attr( $listing_category_id ); ?>"
    data-page-size="<?php echo esc_attr( CR2026_CATALOG_PAGE_SIZE ); ?>"
    data-filter-api-url="<?php echo esc_url( rest_url( 'criosrango-filter/v1/query' ) ); ?>"
    data-products-url="<?php echo esc_url( rest_url( 'cr2026/v1/catalog-page' ) ); ?>">
    <div class="cr-product-listing__shell">
        <?php cr2026_render_category_toolbar( $listing_title, $listing_back_url, $listing_context, true ); ?>
        <div class="cr-product-listing__active-filters" data-cr-active-filter-chips hidden aria-live="polite"></div>
        <?php cr2026_render_category_filter_sheet( $listing_term, $listing_context ); ?>
        <div class="cr-product-listing__ordering">
            <label for="cr-product-order"><?php esc_html_e( 'Ordenar por', 'crios-rango-2026' ); ?></label>
            <span class="cr-product-listing__select-wrap">
                <select id="cr-product-order" data-cr-product-order aria-label="<?php esc_attr_e( 'Ordenar productos', 'crios-rango-2026' ); ?>">
                    <option value="date"<?php selected( 'date', $listing_orderby ); ?>><?php esc_html_e( 'Más recientes', 'crios-rango-2026' ); ?></option>
                    <option value="price"<?php selected( 'price', $listing_orderby ); ?>><?php esc_html_e( 'Precio: menor a mayor', 'crios-rango-2026' ); ?></option>
                    <option value="price-desc"<?php selected( 'price-desc', $listing_orderby ); ?>><?php esc_html_e( 'Precio: mayor a menor', 'crios-rango-2026' ); ?></option>
                    <option value="title"<?php selected( 'title', $listing_orderby ); ?>><?php esc_html_e( 'Nombre A-Z', 'crios-rango-2026' ); ?></option>
                </select>
            </span>
        </div>
        <div class="cr-product-grid" data-cr-product-grid aria-live="polite">
            <?php for ( $skeleton_index = 0; $skeleton_index < 4; $skeleton_index++ ) : ?>
                <div class="cr-product-skeleton" aria-hidden="true"><span></span><i></i><b></b></div>
            <?php endfor; ?>
        </div>
        <div class="cr-product-listing__empty" data-cr-product-empty hidden>
            <p><?php echo $listing_filtered ? esc_html__( 'No encontramos productos con esos filtros.', 'crios-rango-2026' ) : esc_html__( 'No hay productos disponibles.', 'crios-rango-2026' ); ?></p>
            <?php if ( $listing_filtered ) : ?><a href="<?php echo esc_url( $remove_filter_url ); ?>"><?php esc_html_e( 'Limpiar filtros', 'crios-rango-2026' ); ?></a><?php endif; ?>
        </div>
        <div class="cr-product-listing__sentinel" data-cr-product-sentinel aria-hidden="true"></div>
    </div>
</main>
<?php get_footer( 'shop' );