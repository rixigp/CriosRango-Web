<?php
get_header();

$home_config = cr2026_get_home_config();
$hero_ids    = array_values( array_filter( array_map( 'absint', (array) $home_config['hero_ids'] ) ) );

/*
 * Home 0.2.0: the mobile app is the design contract.
 * Keep this list curated and ordered exactly like the app instead of exposing
 * the WooCommerce category tree automatically.
 */
$categories = array(
    'bautizo'       => 'Bautizo',
    'bebe-nina'     => 'Bebe niña',
    'bebe-nino'     => 'Bebé niño',
    'calzado'       => 'Calzado',
    'comunion-nina' => 'Comunión niña',
    'comunion-nino' => 'Comunión niño',
    'nino'          => 'Niño',
    'mujer'         => 'Mujer',
    'nina'          => 'Niña',
);
?>
<main id="primary" class="cr-main cr-home cr-home--app">
    <section class="cr-hero cr-app-hero" aria-label="<?php esc_attr_e( 'Destacados', 'crios-rango-2026' ); ?>">
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
            <h1 id="cr-home-categories-title" class="cr-app-section-title"><?php esc_html_e( 'Categorías', 'crios-rango-2026' ); ?></h1>

            <div class="cr-app-category-grid">
                <?php foreach ( $categories as $slug => $label ) :
                    $term = get_term_by( 'slug', $slug, 'product_cat' );
                    if ( ! $term || is_wp_error( $term ) ) {
                        continue;
                    }

                    $term_link = get_term_link( $term );
                    if ( is_wp_error( $term_link ) ) {
                        continue;
                    }

                    $thumb_id = cr2026_category_image_id( $term );
                    ?>
                    <a class="cr-app-category" href="<?php echo esc_url( $term_link ); ?>">
                        <span class="cr-app-category__media">
                            <?php if ( $thumb_id ) : ?>
                                <?php
                                echo wp_get_attachment_image(
                                    $thumb_id,
                                    'medium_large',
                                    false,
                                    array(
                                        'class'   => 'cr-app-category__image',
                                        'loading' => 'lazy',
                                    )
                                );
                                ?>
                            <?php else : ?>
                                <span class="cr-app-category__empty" aria-hidden="true"></span>
                            <?php endif; ?>
                        </span>
                        <span class="cr-app-category__label"><?php echo esc_html( $label ); ?></span>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
</main>
<?php get_footer(); ?>
