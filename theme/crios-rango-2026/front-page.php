<?php
get_header();

$home_config = cr2026_get_home_config();
$hero_ids    = array_values(
    array_filter(
        array_map( 'absint', (array) $home_config['hero_ids'] )
    )
);

/*
 * Home categories.
 *
 * IDs, labels, order and visual assets are the approved shared KMP baseline
 * used by the current Android/iOS application.
 */
$categories = array(
    array(
        'id'    => 560,
        'label' => 'Bautizo',
        'asset' => 'category_bautizo.png',
    ),
    array(
        'id'    => 292,
        'label' => 'Bebe niña',
        'asset' => 'category_bebe_nina.png',
    ),
    array(
        'id'    => 294,
        'label' => 'Bebé niño',
        'asset' => 'category_bebe_nino.png',
    ),
    array(
        'id'    => 420,
        'label' => 'Calzado',
        'asset' => 'category_calzado.png',
    ),
    array(
        'id'    => 504,
        'label' => 'Comunión niña',
        'asset' => 'category_comunion_nina.png',
    ),
    array(
        'id'    => 509,
        'label' => 'Comunión niño',
        'asset' => 'category_comunion_nino.png',
    ),
    array(
        'id'    => 70,
        'label' => 'Hombre',
        'asset' => 'category_hombre.png',
    ),
    array(
        'id'    => 71,
        'label' => 'Mujer',
        'asset' => 'category_mujer.png',
    ),
    array(
        'id'    => 68,
        'label' => 'Niña',
        'asset' => 'category_nina.png',
    ),
    array(
        'id'    => 310,
        'label' => 'Niño',
        'asset' => 'category_nino.png',
    ),
    array(
        'id'    => 67,
        'label' => 'Recién nacido',
        'asset' => 'category_recien_nacido.png',
    ),
    array(
        'id'    => 445,
        'label' => 'Outlet',
        'asset' => 'category_outlet.png',
    ),
);

$category_assets_url = trailingslashit( get_template_directory_uri() ) . 'assets/images/categories/';
?>

<main id="primary" class="cr-main cr-home cr-home--app">

    <section
        class="cr-hero cr-app-hero"
        aria-label="<?php esc_attr_e( 'Destacados', 'crios-rango-2026' ); ?>"
    >
        <?php if ( ! empty( $hero_ids ) ) : ?>

            <div
                class="cr-hero__slides cr-app-hero__slides"
                data-cr-hero
            >
                <?php foreach ( $hero_ids as $index => $hero_id ) : ?>

                    <article
                        class="cr-hero__slide<?php echo 0 === $index ? ' is-active' : ''; ?>"
                        data-cr-hero-slide
                    >
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

            <div
                class="cr-app-hero__fallback"
                aria-hidden="true"
            ></div>

        <?php endif; ?>
    </section>

    <section
        id="categorias"
        class="cr-app-categories"
        aria-labelledby="cr-home-categories-title"
    >
        <div class="cr-app-shell">

            <h1
                id="cr-home-categories-title"
                class="cr-app-section-title"
            >
                <?php esc_html_e( 'Categorías', 'crios-rango-2026' ); ?>
            </h1>

            <div class="cr-app-category-grid">

                <?php foreach ( $categories as $category ) : ?>

                    <?php
                    $term = get_term(
                        (int) $category['id'],
                        'product_cat'
                    );

                    if ( ! $term || is_wp_error( $term ) ) {
                        continue;
                    }

                    $term_link = get_term_link( $term );

                    if ( is_wp_error( $term_link ) ) {
                        continue;
                    }

                    $image_url = $category_assets_url . $category['asset'];
                    ?>

                    <a
                        class="cr-app-category"
                        href="<?php echo esc_url( $term_link ); ?>"
                    >
                        <span class="cr-app-category__media">

                            <img
                                src="<?php echo esc_url( $image_url ); ?>"
                                alt="<?php echo esc_attr( $category['label'] ); ?>"
                                class="cr-app-category__image"
                                decoding="async"
                            >

                        </span>

                        <span class="cr-app-category__label">
                            <?php echo esc_html( $category['label'] ); ?>
                        </span>
                    </a>

                <?php endforeach; ?>

            </div>
        </div>
    </section>

</main>

<?php
get_footer();
