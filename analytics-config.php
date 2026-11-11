<?php
// Server-only configuration. Keep this file as PHP; never rename it to .txt.
return [
    'enabled' => true,
    // null: use a private sibling of the web document root.
    // If your host cannot write there, set an absolute writable path OUTSIDE
    // public_html / htdocs / the web document root. Never use a public folder.
    'storage_dir' => null,
    // true  : record the connecting IP address (kept retention_days) and require a PRIVATE folder outside the web root.
    // false : count page views only; no IP address is stored. Use this on hosts where PHP may only
    //         touch its own web folder (for example InfinityFree). The total is then kept in a protected
    //         folder inside the web root.
    'log_ip' => true,
    'retention_days' => 30,
];
