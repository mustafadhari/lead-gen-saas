<?php
/**
 * One-off: normalise Indian phone numbers in persons.contact_numbers to E.164 (+91XXXXXXXXXX)
 * Run: php fix_phones.php (from crm/ directory)
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$app->make('db'); // boot DB

$pdo = $app['db']->connection()->getPdo();

function normalise(string $raw): ?string {
    $digits = preg_replace('/[^\d+]/', '', $raw);
    if (!$digits) return null;
    if (str_starts_with($digits, '+')) return $digits;
    if (strlen($digits) === 12 && str_starts_with($digits, '91')) return '+' . $digits;
    if (strlen($digits) === 11 && str_starts_with($digits, '0')) return '+91' . substr($digits, 1);
    if (strlen($digits) === 10) return '+91' . $digits;
    return $digits;
}

$stmt = $pdo->query("SELECT id, name, contact_numbers FROM persons WHERE contact_numbers != '[]'");
$rows = $stmt->fetchAll(PDO::FETCH_OBJ);

$fixed = 0;
foreach ($rows as $row) {
    $phones = json_decode($row->contact_numbers, true);
    if (!is_array($phones)) continue;

    $changed = false;
    foreach ($phones as &$phone) {
        $normalised = normalise($phone['value'] ?? '');
        if ($normalised && $normalised !== $phone['value']) {
            echo "  [{$row->id}] {$row->name}: {$phone['value']} → {$normalised}\n";
            $phone['value'] = $normalised;
            $changed = true;
        }
    }
    unset($phone);

    if ($changed) {
        $json = json_encode($phones, JSON_UNESCAPED_UNICODE);
        $upd = $pdo->prepare("UPDATE persons SET contact_numbers = ? WHERE id = ?");
        $upd->execute([$json, $row->id]);
        $fixed++;
    }
}

echo "\n✅ Fixed $fixed / " . count($rows) . " persons.\n";
