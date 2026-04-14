<?php
/**
 * MarkedUp Proxy Capture Helper (cURL Version)
 * Allows fetching remote HTML content to bypass CORS for client-side rendering.
 */

// 1. Allow any origin to access this script
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 2. Handle the "Preflight" OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit;
}

header("Content-Type: text/html; charset=UTF-8");

if (!isset($_GET['url']) || empty($_GET['url'])) {
    http_response_code(400);
    echo "Error: No URL provided.";
    exit;
}

$url = $_GET['url'];

// Basic URL validation
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo "Error: Invalid URL format.";
    exit;
}

// 3. Fetch content using cURL (more robust than file_get_contents on many shared hosts)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Allow fetching sites with expired/invalid SSL

$content = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($content === false || $httpCode >= 400) {
    http_response_code(502);
    echo "Error: Failed to fetch the requested URL (HTTP $httpCode).";
    exit;
}

// 4. Pass through the correct Content-Type
if ($contentType) {
    header("Content-Type: " . $contentType);
}

// 5. If it's HTML, inject <base> tag to fix relative assets
if (stripos($contentType, 'text/html') !== false) {
    $base_tag = "<base href=\"" . htmlspecialchars($url) . "\">";
    if (stripos($content, '<head>') !== false) {
        $content = str_ireplace('<head>', "<head>\n    $base_tag", $content);
    } else {
        $content = $base_tag . $content;
    }
}

echo $content;
?>
