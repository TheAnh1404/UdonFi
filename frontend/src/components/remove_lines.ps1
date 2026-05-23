$f = 'd:\TheAnhProject\UdonFi\frontend\src\components\PoolsPage.tsx'
$lines = Get-Content $f
$before = $lines[0..1149]
$after = $lines[2142..($lines.Length-1)]
$result = $before + $after
$result | Set-Content $f -Encoding UTF8
Write-Host "Done. Lines before: $($lines.Length), Lines after: $($result.Length)"
