<?php
/**
 * App-style single product presentation. WooCommerce remains the product,
 * variation, stock, pricing and cart engine; this file owns the composition.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

get_header( 'shop' );

global $product;
if ( ! $product instanceof WC_Product ) {
    $product = wc_get_product( get_the_ID() );
}
?>
<main id="primary" class="cr-main cr-main--woocommerce cr-product-detail">
  <div class="cr-product-detail__shell">
    <?php while ( have_posts() ) : the_post(); ?>
      <?php if ( $product instanceof WC_Product ) :
        $product_id = $product->get_id();
        $gallery_ids = array_values( array_unique( array_filter( array_merge(
            array( $product->get_image_id() ),
            $product->get_gallery_image_ids()
        ) ) ) );
        if ( empty( $gallery_ids ) ) { $gallery_ids = array( 0 ); }
        $description_html = $product->get_description();
        $short_description_html = $product->get_short_description();
        $description_source = $short_description_html ? $short_description_html : $description_html;
        $description_text = trim( wp_strip_all_tags( $description_source ) );
        $description_lines = preg_split( '/\r\n|\r|\n/', $description_text );
        $brand_line = '';
        $composition_line = '';
        $remaining_lines = array();
        foreach ( $description_lines as $line ) {
            $line = trim( $line );
            if ( '' === $line ) { continue; }
            if ( '' === $brand_line && 0 === stripos( $line, 'Marca:' ) ) { $brand_line = $line; continue; }
            if ( '' === $composition_line && ( 0 === stripos( $line, 'Composición:' ) || 0 === stripos( $line, 'Composicion:' ) ) ) { $composition_line = $line; continue; }
            $remaining_lines[] = $line;
        }
        $product_url = get_permalink( $product_id );
        $available_variations = $product->is_type( 'variable' ) ? $product->get_available_variations() : array();
        $variation_attributes = $product->is_type( 'variable' ) ? $product->get_variation_attributes() : array();
        $variation_json = wp_json_encode( $available_variations );
        $product_attributes = $product->get_attributes();
      ?>
      <article id="product-<?php the_ID(); ?>" <?php wc_product_class( 'cr-product-detail__product', $product ); ?>
        data-cr-product-detail data-product-id="<?php echo esc_attr( $product_id ); ?>"
        data-product-name="<?php echo esc_attr( $product->get_name() ); ?>"
        data-product-url="<?php echo esc_url( $product_url ); ?>"
        data-product-type="<?php echo esc_attr( $product->get_type() ); ?>">
        <header class="cr-product-toolbar">
          <button class="cr-product-toolbar__back" type="button" data-cr-product-back aria-label="<?php esc_attr_e( 'Volver', 'crios-rango-2026' ); ?>">←</button>
          <span class="cr-product-toolbar__title"><?php echo esc_html( $product->get_name() ); ?></span>
          <a class="cr-product-toolbar__cart" href="<?php echo esc_url( wc_get_cart_url() ); ?>" aria-label="<?php esc_attr_e( 'Carrito', 'crios-rango-2026' ); ?>">♡</a>
        </header>

        <section class="cr-product-gallery" aria-label="<?php esc_attr_e( 'Imágenes del producto', 'crios-rango-2026' ); ?>" data-cr-product-gallery>
          <div class="cr-product-gallery__track" data-cr-gallery-track>
            <?php foreach ( $gallery_ids as $index => $image_id ) : ?>
              <figure class="cr-product-gallery__slide" data-cr-gallery-slide="<?php echo esc_attr( $index ); ?>">
                <?php
                if ( $image_id ) {
                    echo wp_get_attachment_image( $image_id, 'woocommerce_single', false, array(
                        'class' => 'cr-product-gallery__image',
                        'loading' => 0 === $index ? 'eager' : 'lazy',
                        'alt' => esc_attr( $product->get_name() ),
                    ) );
                } else {
                    echo wc_placeholder_img( 'woocommerce_single', array( 'class' => 'cr-product-gallery__image' ) );
                }
                ?>
              </figure>
            <?php endforeach; ?>
          </div>
          <?php if ( count( $gallery_ids ) > 1 ) : ?>
            <div class="cr-product-gallery__dots" role="tablist" aria-label="<?php esc_attr_e( 'Seleccionar imagen', 'crios-rango-2026' ); ?>" data-cr-gallery-dots>
              <?php foreach ( $gallery_ids as $index => $image_id ) : ?>
                <button type="button" class="cr-product-gallery__dot<?php echo 0 === $index ? ' is-active' : ''; ?>" data-cr-gallery-dot="<?php echo esc_attr( $index ); ?>" aria-label="<?php echo esc_attr( sprintf( __( 'Imagen %d', 'crios-rango-2026' ), $index + 1 ) ); ?>" aria-current="<?php echo 0 === $index ? 'true' : 'false'; ?>"></button>
              <?php endforeach; ?>
            </div>
          <?php endif; ?>
        </section>

        <div class="cr-product-detail__content">
          <div class="cr-product-detail__eyebrow">
            <?php if ( $product->is_on_sale() ) : ?><span class="cr-product-detail__sale"><?php esc_html_e( 'OFERTA', 'crios-rango-2026' ); ?></span><?php endif; ?>
          </div>
          <h1 class="cr-product-detail__name"><?php echo esc_html( $product->get_name() ); ?></h1>
          <div class="cr-product-detail__price" data-cr-product-price><?php echo wp_kses_post( $product->get_price_html() ); ?></div>

          <?php if ( $brand_line || $composition_line || $description_text ) : ?>
            <div class="cr-product-detail__metadata">
              <?php if ( $brand_line ) : ?><p class="cr-product-detail__brand"><?php echo esc_html( $brand_line ); ?></p><?php endif; ?>
              <?php if ( $composition_line ) : ?><p class="cr-product-detail__composition"><?php echo esc_html( $composition_line ); ?></p><?php endif; ?>
              <?php if ( $remaining_lines ) : ?><div class="cr-product-detail__description"><?php echo wp_kses_post( wpautop( implode( "\n", $remaining_lines ) ) ); ?></div><?php endif; ?>
            </div>
          <?php endif; ?>

          <div class="cr-product-detail__purchase">
            <?php if ( $product->is_type( 'variable' ) ) : ?>
              <form class="variations_form cart cr-product-variation-form" action="<?php echo esc_url( apply_filters( 'woocommerce_add_to_cart_form_action', $product->get_permalink() ) ); ?>" method="post" enctype="multipart/form-data"
                data-product_id="<?php echo esc_attr( $product_id ); ?>" data-product_variations="<?php echo esc_attr( $variation_json ); ?>">
                <div class="cr-product-variation-chips" data-cr-variation-chips>
                  <?php foreach ( $variation_attributes as $attribute_name => $options ) :
                    $attribute_label = wc_attribute_label( $attribute_name );
                    $is_color = false !== stripos( $attribute_name, 'color' ) || false !== stripos( $attribute_name, 'colour' );
                    ?>
                    <fieldset class="cr-product-variation-group" data-attribute-name="<?php echo esc_attr( $attribute_name ); ?>" data-attribute-label="<?php echo esc_attr( $attribute_label ); ?>">
                      <legend><?php echo esc_html( $attribute_label ); ?></legend>
                      <div class="cr-product-variation-options">
                        <?php foreach ( $options as $option ) :
                          $slug = sanitize_title( $option );
                          $term = taxonomy_exists( $attribute_name ) ? get_term_by( 'slug', $slug, $attribute_name ) : false;
                          $label = $term && ! is_wp_error( $term ) ? $term->name : $option;
                          ?>
                          <button type="button" class="cr-product-variation-chip<?php echo $is_color ? ' is-color' : ''; ?>" data-cr-variation-option data-attribute="<?php echo esc_attr( $attribute_name ); ?>" data-value="<?php echo esc_attr( $slug ); ?>" data-label="<?php echo esc_attr( $label ); ?>" aria-pressed="false"><?php echo esc_html( $label ); ?></button>
                        <?php endforeach; ?>
                      </div>
                    </fieldset>
                  <?php endforeach; ?>
                </div>
                <table class="variations cr-product-variation-native" cellspacing="0" role="presentation"><tbody>
                  <?php foreach ( $variation_attributes as $attribute_name => $options ) : ?>
                    <tr><th class="label"><label for="<?php echo esc_attr( sanitize_title( $attribute_name ) ); ?>"><?php echo esc_html( wc_attribute_label( $attribute_name ) ); ?></label></th><td class="value">
                      <?php wc_dropdown_variation_attribute_options( array( 'options' => $options, 'attribute' => $attribute_name, 'product' => $product, 'selected' => false, 'show_option_none' => __( 'Elige una opción', 'crios-rango-2026' ) ) ); ?>
                    </td></tr>
                  <?php endforeach; ?>
                </tbody></table>
                <a class="reset_variations" href="#" aria-label="<?php esc_attr_e( 'Limpiar opciones', 'crios-rango-2026' ); ?>"><?php esc_html_e( 'Limpiar', 'crios-rango-2026' ); ?></a>
                <div class="single_variation_wrap">
                  <div class="woocommerce-variation single_variation" role="status" aria-live="polite"></div>
                  <div class="woocommerce-variation-add-to-cart variations_button cr-product-detail__cart-controls">
                    <div class="cr-product-quantity" data-cr-quantity>
                      <button type="button" data-cr-quantity-minus aria-label="<?php esc_attr_e( 'Reducir cantidad', 'crios-rango-2026' ); ?>">−</button>
                      <?php woocommerce_quantity_input( array( 'min_value' => 1, 'input_value' => 1 ), $product, false ); ?>
                      <button type="button" data-cr-quantity-plus aria-label="<?php esc_attr_e( 'Aumentar cantidad', 'crios-rango-2026' ); ?>">+</button>
                    </div>
                    <button type="submit" class="single_add_to_cart_button button alt" disabled><?php echo esc_html( $product->single_add_to_cart_text() ); ?></button>
                    <input type="hidden" name="add-to-cart" value="<?php echo esc_attr( $product_id ); ?>" />
                    <input type="hidden" name="product_id" value="<?php echo esc_attr( $product_id ); ?>" />
                    <input type="hidden" name="variation_id" class="variation_id" value="0" />
                  </div>
                </div>
              </form>
            <?php elseif ( $product->is_purchasable() && $product->is_in_stock() ) : ?>
              <form class="cart cr-product-simple-form" action="<?php echo esc_url( apply_filters( 'woocommerce_add_to_cart_form_action', $product->get_permalink() ) ); ?>" method="post" enctype="multipart/form-data">
                <div class="cr-product-detail__cart-controls">
                  <div class="cr-product-quantity" data-cr-quantity>
                    <button type="button" data-cr-quantity-minus aria-label="<?php esc_attr_e( 'Reducir cantidad', 'crios-rango-2026' ); ?>">−</button>
                    <?php woocommerce_quantity_input( array( 'min_value' => $product->get_min_purchase_quantity(), 'max_value' => $product->get_max_purchase_quantity(), 'input_value' => 1 ), $product, false ); ?>
                    <button type="button" data-cr-quantity-plus aria-label="<?php esc_attr_e( 'Aumentar cantidad', 'crios-rango-2026' ); ?>">+</button>
                  </div>
                  <button type="submit" name="add-to-cart" value="<?php echo esc_attr( $product_id ); ?>" class="single_add_to_cart_button button alt"><?php echo esc_html( $product->single_add_to_cart_text() ); ?></button>
                </div>
              </form>
            <?php else : ?>
              <p class="stock out-of-stock"><?php esc_html_e( 'Agotado', 'crios-rango-2026' ); ?></p>
            <?php endif; ?>
          </div>
        </div>
      </article>
      <?php endif; ?>
    <?php endwhile; ?>
  </div>
</main>
<?php get_footer( 'shop' );