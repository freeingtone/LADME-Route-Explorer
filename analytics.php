<?php
declare(strict_types=1);
// Requires PHP 7.4+. No database or third-party analytics service.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}
// The public reply carries only a short code. The detail goes to the server's private error log.
function fail(string $code, string $detail): void {
    error_log('[LADME counter] ' . $code . ': ' . $detail);
    reply(503, ['error' => $code]);
}
function inside(string $path, string $root): bool {
    return $path === $root || strpos($path, rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR) === 0;
}
$config = require __DIR__ . '/analytics-config.php';
if (empty($config['enabled'])) reply(200, ['enabled' => false]);
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method !== 'POST' && $method !== 'GET') {
    header('Allow: GET, POST');
    reply(405, ['error' => 'method_not_allowed']);
}
if ($method === 'POST') {
    // Reject cross-site browser writes. Do not enable CORS for this endpoint.
    if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && !in_array($_SERVER['HTTP_SEC_FETCH_SITE'], ['same-origin', 'none'], true)) reply(403, ['error' => 'cross_site']);
    // Browsers that send Sec-Fetch-Site (checked above) already proved same-origin; the Origin/Host
    // comparison is only the fallback for older browsers, because proxies and CDNs can rewrite Host.
    if (!isset($_SERVER['HTTP_SEC_FETCH_SITE']) && isset($_SERVER['HTTP_ORIGIN'])) {
        $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
        $originPort = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_PORT);
        $originAuthority = $originHost . ($originPort ? ':' . $originPort : '');
        if (strtolower($originAuthority) !== strtolower($_SERVER['HTTP_HOST'] ?? '')) reply(403, ['error' => 'cross_origin']);
    }
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') reply(415, ['error' => 'json_required']);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 256) reply(413, ['error' => 'body_too_large']);
}
$documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
if ($documentRoot === false || $documentRoot === DIRECTORY_SEPARATOR) fail('private_storage_required', 'DOCUMENT_ROOT is empty, unreadable or "/" (open_basedir or CGI setup?).');
// log_ip = false keeps only a total number, no IP addresses. With nothing personal stored, a host that
// only lets PHP touch its own web folder (for example InfinityFree) may keep that number inside the web root.
$logIp = !array_key_exists('log_ip', $config) || $config['log_ip'] !== false;
$hash = substr(hash('sha256', __DIR__), 0, 12);
$candidates = [];
if (!empty($config['storage_dir'])) {
    $candidates[] = [(string)$config['storage_dir'], false];
} else {
    $candidates[] = [dirname($documentRoot) . '/ladme-private-' . $hash, false];
    if (!$logIp) $candidates[] = [$documentRoot . '/.ladme-counter-' . $hash, true];
}
$realDirectory = null; $inWebRoot = false; $problems = [];
foreach ($candidates as [$directory, $webRootAllowed]) {
    $parent = realpath(dirname($directory));
    if ($parent === false) { $problems[] = 'folder above ' . $directory . ' is not reachable (open_basedir?)'; continue; }
    if (!$webRootAllowed && inside($parent, $documentRoot)) { $problems[] = $directory . ' is inside the web root; with IP logging it must be outside'; continue; }
    if (!is_dir($directory) && !@mkdir($directory, 0700, false) && !is_dir($directory)) { $problems[] = 'cannot create ' . $directory . ' (parent not writable by the PHP user)'; continue; }
    $real = realpath($directory);
    if ($real === false) { $problems[] = $directory . ' is unreadable'; continue; }
    if (!$webRootAllowed && inside($real, $documentRoot)) { $problems[] = $directory . ' resolves inside the web root'; continue; }
    $realDirectory = $real; $inWebRoot = $webRootAllowed; break;
}
if ($realDirectory === null) {
    fail(count($problems) && strpos(implode(' ', $problems), 'cannot create') !== false ? 'storage_unavailable' : 'private_storage_required',
        implode('; ', $problems) . '. Set storage_dir to a writable folder outside the web root, or set log_ip to false for a count-only counter.');
}
if ($inWebRoot) {
    // Defence in depth for the web-root fallback: (1) the server is told to refuse every request here,
    // (2) the data file is a .php file that exits at once, so even if (1) is ignored a browser sees nothing.
    $htaccess = $realDirectory . '/.htaccess';
    if (!is_file($htaccess)) @file_put_contents($htaccess, "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
    $index = $realDirectory . '/index.html';
    if (!is_file($index)) @file_put_contents($index, '');
}
$guard = $inWebRoot ? "<?php http_response_code(404); exit; ?>\n" : '';
$file = $realDirectory . ($inWebRoot ? '/visits.php' : '/visits.json');
$lockFile = $realDirectory . '/visits.lock';
if (is_link($file) || is_link($lockFile)) fail('storage_unavailable', 'the data or lock file is a symlink; refusing to follow it.');
$lock = @fopen($lockFile, 'c');
if ($lock === false || !flock($lock, LOCK_EX)) fail('storage_unavailable', 'cannot open or lock ' . $lockFile . ' (check permissions).');
@chmod($lockFile, 0600);
try {
    $state = ['total_page_views' => 0, 'visits' => []];
    if (is_file($file)) {
        $raw = file_get_contents($file);
        if ($raw !== false && $guard !== '' && strpos($raw, $guard) === 0) $raw = substr($raw, strlen($guard));
        $decoded = $raw === false ? null : json_decode($raw, true);
        if (!is_array($decoded) || !isset($decoded['total_page_views'], $decoded['visits']) || !is_int($decoded['total_page_views']) || !is_array($decoded['visits'])) throw new RuntimeException('invalid_state');
        $state = $decoded;
    }
    $days = max(1, min(30, (int)($config['retention_days'] ?? 30)));
    $cutoff = time() - $days * 86400;
    $state['visits'] = array_values(array_filter($state['visits'], static function ($visit) use ($cutoff): bool {
        return isset($visit['accessed_at']) && strtotime($visit['accessed_at']) >= $cutoff;
    }));
    if ($method === 'POST') {
        $state['total_page_views']++;
        if ($logIp) {
            // REMOTE_ADDR is the direct connection address. Never trust client-supplied
            // X-Forwarded-For / X-Real-IP without an explicitly configured trusted proxy.
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            if (filter_var($ip, FILTER_VALIDATE_IP) === false) throw new RuntimeException('invalid_address');
            $state['visits'][] = ['accessed_at' => gmdate('c'), 'ip' => $ip];
        }
    }
    // Atomic replacement under a separate lock prevents lost concurrent updates
    // and preserves the previous file if writing fails.
    $temporary = tempnam($realDirectory, '.visits-');
    if ($temporary === false) throw new RuntimeException('write_failed');
    @chmod($temporary, 0600);
    $encoded = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false || file_put_contents($temporary, $guard . $encoded) === false || !rename($temporary, $file)) {
        @unlink($temporary);
        throw new RuntimeException('write_failed');
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    reply(200, ['enabled' => true, 'page_views' => $state['total_page_views'], 'retention_days' => $days, 'logs_ip' => $logIp]);
} catch (Throwable $error) {
    flock($lock, LOCK_UN);
    fclose($lock);
    // Do not expose paths, addresses or log contents to public clients; the reason goes to the private log.
    fail('storage_unavailable', get_class($error) . ': ' . $error->getMessage());
}
