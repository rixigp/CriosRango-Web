<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
if ( function_exists( 'is_shop' ) && is_shop() ) {
    get_header( 'shop' );
    $categories = cr2026_home_categories();
    $category_assets_url = trailingslashit( get_template_directory_uri() ) . 'assets/images/categories/';
    ?>
    <main id="primary" class="cr-main cr-main--woocommerce cr-category-hub">
      <div class="cr-category-hub__shell">
        <h1 class="cr-category-hub__title"><?php esc_html_e( 'Categorías', 'crios-rango-2026' ); ?></h1>
        <div class="cr-app-category-grid cr-category-hub__grid">
        <?php foreach ( $categories as $category ) :
          $term = get_term( (int) $category['id'], 'product_cat' );
          if ( ! $term || is_wp_error( $term ) ) { continue; }
          $term_link = get_term_link( $term );
          if ( is_wp_error( $term_link ) ) { continue; }
        ?>
          <a class="cr-app-category" href="<?php echo esc_url( $term_link ); ?>">
            <span class="cr-app-category__media"><img class="cr-app-category__image" src="<?php echo esc_url( $category_assets_url . $category['asset'] ); ?>" alt="<?php echo esc_attr( $category['label'] ); ?>" loading="lazy" decoding="async"></span>
            <span class="cr-app-category__label"><?php echo esc_html( $category['label'] ); ?></span>
          </a>
        <?php endforeach; ?>
        </div>
      </div>
    </main>
    <?php get_footer( 'shop' ); return;
}
get_header( 'shop' );
do_action( 'woocommerce_before_main_content' );
if ( is_product_category() ) {
    $category_term = get_queried_object();
    if ( $category_term instanceof WP_Term ) {
        echo '<button type="button" class="cr-category-filter-sheet__trigger--archive" data-cr-filter-open aria-haspopup="dialog">' . esc_html__( 'Filtros', 'crios-rango-2026' ) . '</button>';
        cr2026_render_category_filter_sheet( $category_term, 'archive' );
    }
}
if ( woocommerce_product_loop() ) {
    do_action( 'woocommerce_before_shop_loop' );
    woocommerce_product_loop_start();
    if ( wc_get_loop_prop( 'total' ) ) {
        while ( have_posts() ) {
            the_post();
            do_action( 'woocommerce_shop_loop' );
            wc_get_template_part( 'content', 'product' );
        }
    }
    woocommerce_product_loop_end();
    do_action( 'woocommerce_after_shop_loop' );
} else { do_action( 'woocommerce_no_products_found' ); }
do_action( 'woocommerce_after_main_content' );
get_footer( 'shop' );
