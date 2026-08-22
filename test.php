<?php
$tests = ["1", "20", "100", 1, "+1", "01", "1.0", "1e2", 0, -1, "abc", "", array(), new stdClass(), true];
foreach ($tests as $v) {
    echo "Testing: " . json_encode($v) . "\n";
    if (!is_scalar($v) || is_bool($v)) {
        echo "  Rejected by is_scalar/is_bool\n";
        continue;
    }
    $vStr = (string)$v;
    $vFiltered = filter_var($vStr, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
    if ($vFiltered === false || (string)$vFiltered !== $vStr) {
         echo "  Rejected by filter_var/canonical check. filtered: " . var_export($vFiltered, true) . "\n";
    } else {
         echo "  Accepted: " . $vFiltered . "\n";
    }
}
