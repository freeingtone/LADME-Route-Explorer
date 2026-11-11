<?php
// Server-only configuration. Keep this file as PHP; never rename it to .txt.
return [
    'enabled' => true,
    // null: use a private sibling of the web document root.
    // If your host cannot write there, set an absolute writable path OUTSIDE
    // public_html / htdocs / the web document root. Never use a public folder.
    'storage_dir' => null,
    'retention_days' => 30,
];
