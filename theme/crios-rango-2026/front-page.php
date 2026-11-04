<?php
get_header();

$home_config = cr2026_get_home_config();
$hero_ids    = array_values(
    array_filter(
        array_map( 'absint', (array) $home_config['hero_ids'] )
    )
);

/* Shared canonical app category inventory. */
$categories = cr2026_home_categories();

$category_assets_url = trailingslashit( get_template_directory_uri() ) . 'assets/images/categories/';
?>

<main id="primary" class="cr-main cr-home cr-home--app">

    <section
        class="cr-hero cr-app-hero"
        aria-label="<?php esc_attr_e( 'Destacados', 'crios-rango-2026' ); ?>"
    >
        <?php if ( ! empty( $hero_ids ) ) : ?>
            <div class="cr-hero__slides cr-app-hero__slides" data-cr-hero>
                <?php foreach ( $hero_ids as $index => $hero_id ) : ?>
                    <article class="cr-hero__slide<?php echo 0 === $index ? ' is-active' : ''; ?>" data-cr-hero-slide>
                        <?php
                        echo wp_get_attachment_image(
                            $hero_id,
                            'full',
                            false,
                            array(
                                'class'         => 'cr-hero__image cr-app-hero__image',
                                'fetchpriority' => 0 === $index ? 'high' : 'auto',
                                'loading'       => 0 === $index ? 'eager' : 'lazy',
                            )
                        );
                        ?>
                    </article>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <div class="cr-app-hero__fallback" aria-hidden="true"></div>
        <?php endif; ?>
    </section>

    <section id="categorias" class="cr-app-categories" aria-labelledby="cr-home-categories-title">
        <div class="cr-app-shell">
            <h1 id="cr-home-categories-title" class="cr-app-section-title">
                <?php esc_html_e( 'Categorías', 'crios-rango-2026' ); ?>
            </h1>
            <div class="cr-app-category-grid">
                <?php foreach ( $categories as $category ) : ?>
                    <?php
                    $term = get_term( (int) $category['id'], 'product_cat' );
                    if ( ! $term || is_wp_error( $term ) ) {
                        continue;
                    }
                    $term_link = get_term_link( $term );
                    if ( is_wp_error( $term_link ) ) {
                        continue;
                    }
                    $image_url = $category_assets_url . $category['asset'];
                    ?>
                    <a class="cr-app-category" href="<?php echo esc_url( $term_link ); ?>">
                        <span class="cr-app-category__media">
                            <img
                                src="<?php echo esc_url( $image_url ); ?>"
                                alt="<?php echo esc_attr( $category['label'] ); ?>"
                                class="cr-app-category__image"
                                decoding="async"
                            >
                        </span>
                        <span class="cr-app-category__label"><?php echo esc_html( $category['label'] ); ?></span>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <?php
    $home_products = cr2026_home_novedades();
    $winter_term   = cr2026_home_outlet_term( 'winter' );
    $summer_term   = cr2026_home_outlet_term( 'summer' );
    $outlet_root   = get_term( 445, 'product_cat' );
    $outlet_url    = ( $outlet_root && ! is_wp_error( $outlet_root ) ) ? get_term_link( $outlet_root ) : cr2026_shop_url();
    $winter_url    = ( $winter_term && ! is_wp_error( $winter_term ) ) ? get_term_link( $winter_term ) : $outlet_url;
    $summer_url    = ( $summer_term && ! is_wp_error( $summer_term ) ) ? get_term_link( $summer_term ) : $outlet_url;
    $winter_image  = cr2026_home_outlet_image_url( 'winter' );
    $summer_image  = cr2026_home_outlet_image_url( 'summer' );
    $home_brands   = cr2026_home_brands();
    $brand_pages   = array_chunk( $home_brands, 8 );
    ?>

    <section class="cr-home-section cr-home-novedades" aria-labelledby="cr-home-novedades-title">
        <div class="cr-home-section__header">
            <h2 id="cr-home-novedades-title">Novedades</h2>
            <a href="<?php echo esc_url( cr2026_home_novedades_url() ); ?>">Ver todo</a>
        </div>
        <?php if ( ! empty( $home_products ) ) : ?>
            <div class="cr-home-products" aria-label="Últimas novedades">
                <?php foreach ( $home_products as $product ) : ?>
                    <?php
                    $product_url = get_permalink( $product->get_id() );
                    $image_id    = $product->get_image_id();
                    ?>
                    <a class="cr-home-product" href="<?php echo esc_url( $product_url ); ?>">
                        <span class="cr-home-product__image">
                            <?php
                            if ( $image_id ) {
                                echo wp_get_attachment_image(
                                    $image_id,
                                    'woocommerce_thumbnail',
                                    false,
                                    array(
                                        'class'    => 'cr-home-product__photo',
                                        'loading'  => 'lazy',
                                        'decoding' => 'async',
                                        'sizes'    => '158px',
                                    )
                                );
                            } elseif ( function_exists( 'wc_placeholder_img' ) ) {
                                echo wp_kses_post( wc_placeholder_img( 'woocommerce_thumbnail', array( 'class' => 'cr-home-product__photo', 'loading' => 'lazy' ) ) );
                            }
                            ?>
                        </span>
                        <span class="cr-home-product__name"><?php echo esc_html( $product->get_name() ); ?></span>
                        <span class="cr-home-product__price"><?php echo wp_kses_post( wc_price( (float) $product->get_price() ) ); ?></span>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <p class="cr-home-section__empty">No hay novedades disponibles.</p>
        <?php endif; ?>
    </section>

    <section class="cr-home-section cr-home-outlet" aria-labelledby="cr-home-outlet-title">
        <div class="cr-home-section__header">
            <h2 id="cr-home-outlet-title">Outlet</h2>
            <a href="<?php echo esc_url( $outlet_url ); ?>">Ver todo</a>
        </div>
        <div class="cr-home-outlet__grid">
            <a class="cr-home-outlet-card" href="<?php echo esc_url( $winter_url ); ?>">
                <?php if ( $winter_image ) : ?><img class="cr-home-outlet-card__image" src="<?php echo esc_url( $winter_image ); ?>" alt="" loading="lazy" decoding="async"><?php endif; ?>
                <span class="cr-home-outlet-card__copy"><strong>Outlet</strong><span>Invierno</span></span>
            </a>
            <a class="cr-home-outlet-card" href="<?php echo esc_url( $summer_url ); ?>">
                <?php if ( $summer_image ) : ?><img class="cr-home-outlet-card__image" src="<?php echo esc_url( $summer_image ); ?>" alt="" loading="lazy" decoding="async"><?php endif; ?>
                <span class="cr-home-outlet-card__copy"><strong>Outlet</strong><span>Verano</span></span>
            </a>
        </div>
    </section>

    <section class="cr-home-section cr-home-brands" aria-labelledby="cr-home-brands-title">
        <div class="cr-home-section__header">
            <h2 id="cr-home-brands-title">Marcas</h2>
            <a href="<?php echo esc_url( cr2026_home_brands_url() ); ?>">Ver todas</a>
        </div>
        <?php if ( ! empty( $brand_pages ) ) : ?>
            <div class="cr-home-brand-pager" data-cr-brand-pager>
                <?php foreach ( $brand_pages as $page_index => $page_brands ) : ?>
                    <div class="cr-home-brand-page" data-cr-brand-page aria-label="<?php echo esc_attr( sprintf( 'Página %d de %d', $page_index + 1, count( $brand_pages ) ) ); ?>">
                        <div class="cr-home-brand-grid">
                            <?php foreach ( $page_brands as $brand ) : ?>
                                <?php
                                $brand_url   = get_term_link( $brand );
                                $brand_image = cr2026_home_brand_image_url( $brand );
                                if ( is_wp_error( $brand_url ) ) {
                                    continue;
                                }
                                ?>
                                <a class="cr-home-brand" href="<?php echo esc_url( $brand_url ); ?>">
                                    <?php if ( $brand_image ) : ?>
                                        <img src="<?php echo esc_url( $brand_image ); ?>" alt="<?php echo esc_attr( $brand->name ); ?>" loading="lazy" decoding="async">
                                    <?php else : ?>
                                        <span><?php echo esc_html( $brand->name ); ?></span>
                                    <?php endif; ?>
                                </a>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            <?php if ( count( $brand_pages ) > 1 ) : ?>
                <div class="cr-home-brand-dots" data-cr-brand-dots aria-label="Páginas de marcas">
                    <?php foreach ( $brand_pages as $page_index => $unused_page ) : ?>
                        <button type="button" class="cr-home-brand-dot<?php echo 0 === $page_index ? ' is-active' : ''; ?>" data-cr-brand-dot="<?php echo esc_attr( $page_index ); ?>" aria-label="<?php echo esc_attr( sprintf( 'Ir a página %d', $page_index + 1 ) ); ?>" aria-current="<?php echo 0 === $page_index ? 'true' : 'false'; ?>"></button>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        <?php else : ?>
            <p class="cr-home-section__empty">No hay marcas disponibles.</p>
        <?php endif; ?>
    </section>

</main>
<?php
get_footer();
