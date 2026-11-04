<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function cr2026_asset_version( $relative_path ) {
    $path = CR2026_DIR . '/' . ltrim( $relative_path, '/' );
    return file_exists( $path ) ? (string) filemtime( $path ) : CR2026_VERSION;
}

function cr2026_enqueue_assets() {
    $main_style_dependencies = array();

    if ( is_front_page() ) {
        wp_enqueue_style(
            'cr2026-roboto',
            'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400&display=swap',
            array(),
            null
        );
        $main_style_dependencies[] = 'cr2026-roboto';
    }

    wp_enqueue_style(
        'cr2026-main',
        CR2026_URI . '/assets/css/main.css',
        $main_style_dependencies,
        cr2026_asset_version( 'assets/css/main.css' )
    );

    wp_enqueue_script(
        'cr2026-main',
        CR2026_URI . '/assets/js/main.js',
        array(),
        cr2026_asset_version( 'assets/js/main.js' ),
        true
    );

    wp_localize_script( 'cr2026-main', 'CR2026', array(
        'menuLabelOpen'  => __( 'Abrir menú', 'crios-rango-2026' ),
        'menuLabelClose' => __( 'Cerrar menú', 'crios-rango-2026' ),
    ) );
}
add_action( 'wp_enqueue_scripts', 'cr2026_enqueue_assets', 30 );
