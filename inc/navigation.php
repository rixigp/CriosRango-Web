<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function cr2026_primary_menu_fallback() {
    echo '<ul class="cr-nav-list">';
    echo '<li><a href="' . esc_url( home_url( '/' ) ) . '">' . esc_html__( 'Inicio', 'crios-rango-2026' ) . '</a></li>';
    echo '<li><a href="' . esc_url( cr2026_shop_url() ) . '">' . esc_html__( 'Tienda', 'crios-rango-2026' ) . '</a></li>';
    echo '<li><a href="' . esc_url( home_url( '/categoria-producto/outlet/' ) ) . '">' . esc_html__( 'Outlet', 'crios-rango-2026' ) . '</a></li>';
    echo '<li><a href="' . esc_url( home_url( '/contacto/' ) ) . '">' . esc_html__( 'Contacto', 'crios-rango-2026' ) . '</a></li>';
    echo '</ul>';
}
