<form role="search" method="get" class="cr-search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
    <label class="screen-reader-text" for="cr-search-field"><?php esc_html_e( 'Buscar productos', 'crios-rango-2026' ); ?></label>
    <?php echo cr2026_icon( 'search' ); ?>
    <input id="cr-search-field" type="search" name="s" value="<?php echo esc_attr( get_search_query() ); ?>" placeholder="<?php esc_attr_e( 'Buscar productos…', 'crios-rango-2026' ); ?>" autocomplete="off">
    <input type="hidden" name="post_type" value="product">
    <button type="button" class="cr-search-form__clear" data-cr-search-clear aria-label="<?php esc_attr_e( 'Limpiar búsqueda', 'crios-rango-2026' ); ?>">×</button>
    <button type="submit" class="cr-search-form__submit"><?php esc_html_e( 'Buscar', 'crios-rango-2026' ); ?></button>
</form>
