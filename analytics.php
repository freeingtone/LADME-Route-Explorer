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
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
        $originPort = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_PORT);
        $originAuthority = $originHost . ($originPort ? ':' . $originPort : '');
        if (strtolower($originAuthority) !== strtolower($_SERVER['HTTP_HOST'] ?? '')) reply(403, ['error' => 'cross_origin']);
    }
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') reply(415, ['error' => 'json_required']);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 256) reply(413, ['error' => 'body_too_large']);
}
$documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
if ($documentRoot === false || $documentRoot === DIRECTORY_SEPARATOR) reply(503, ['error' => 'private_storage_required']);
$directory = $config['storage_dir'] ?? (dirname($documentRoot) . '/ladme-private-' . substr(hash('sha256', __DIR__), 0, 12));
// Validate parent before creating anything; refuse storage within the web root.
$parent = realpath(dirname($directory));
if ($parent === false || inside($parent, $documentRoot)) reply(503, ['error' => 'private_storage_required']);
if (!is_dir($directory) && !@mkdir($directory, 0700, false) && !is_dir($directory)) reply(503, ['error' => 'storage_unavailable']);
$realDirectory = realpath($directory);
if ($realDirectory === false || inside($realDirectory, $documentRoot)) reply(503, ['error' => 'private_storage_required']);
$file = $realDirectory . '/visits.json';
$lockFile = $realDirectory . '/visits.lock';
if (is_link($file) || is_link($lockFile)) reply(503, ['error' => 'storage_unavailable']);
$lock = @fopen($lockFile, 'c');
if ($lock === false || !flock($lock, LOCK_EX)) reply(503, ['error' => 'storage_unavailable']);
@chmod($lockFile, 0600);
try {
    $state = ['total_page_views' => 0, 'visits' => []];
    if (is_file($file)) {
        $raw = file_get_contents($file);
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
        // REMOTE_ADDR is the direct connection address. Never trust client-supplied
        // X-Forwarded-For / X-Real-IP without an explicitly configured trusted proxy.
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        if (filter_var($ip, FILTER_VALIDATE_IP) === false) throw new RuntimeException('invalid_address');
        $state['total_page_views']++;
        $state['visits'][] = ['accessed_at' => gmdate('c'), 'ip' => $ip];
    }
    // Atomic replacement under a separate lock prevents lost concurrent updates
    // and preserves the previous file if writing fails.
    $temporary = tempnam($realDirectory, '.visits-');
    if ($temporary === false) throw new RuntimeException('write_failed');
    @chmod($temporary, 0600);
    $encoded = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false || file_put_contents($temporary, $encoded) === false || !rename($temporary, $file)) {
        @unlink($temporary);
        throw new RuntimeException('write_failed');
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    reply(200, ['enabled' => true, 'page_views' => $state['total_page_views'], 'retention_days' => $days]);
} catch (Throwable $error) {
    flock($lock, LOCK_UN);
    fclose($lock);
    // Do not expose paths, addresses or log contents to public clients.
    reply(503, ['error' => 'storage_unavailable']);
}
