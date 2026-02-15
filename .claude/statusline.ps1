try {
    # Read JSON from stdin
    $inputData = [Console]::In.ReadToEnd()

    if ([string]::IsNullOrWhiteSpace($inputData)) {
        Write-Output "No input data"
        exit 1
    }

    $json = $inputData | ConvertFrom-Json -ErrorAction Stop

    # Model info
    $model = if ($json.model.PSObject.Properties['display_name'] -and $json.model.display_name) {
        $json.model.display_name
    } elseif ($json.model.PSObject.Properties['id'] -and $json.model.id) {
        $json.model.id
    } else {
        "Unknown"
    }

    # Token calculation
    $totalIn = if ($json.context_window.PSObject.Properties['total_input_tokens']) {
        [int]$json.context_window.total_input_tokens
    } else { 0 }

    $totalOut = if ($json.context_window.PSObject.Properties['total_output_tokens']) {
        [int]$json.context_window.total_output_tokens
    } else { 0 }

    $total = $totalIn + $totalOut
    $tokens = if ($total -ge 1000) {
        '{0:F1}k' -f ($total / 1000)
    } else {
        $total
    }

    $usedPct = if ($json.context_window.PSObject.Properties['used_percentage']) {
        $json.context_window.used_percentage
    } else { $null }

    # Git branch
    $cwd = if ($json.workspace.PSObject.Properties['current_dir']) {
        $json.workspace.current_dir
    } else {
        Get-Location
    }

    $branch = ''
    try {
        Push-Location $cwd
        $branch = git rev-parse --abbrev-ref HEAD 2>$null
    } catch {
        $branch = ''
    } finally {
        Pop-Location
    }

    # Time until reset
    $now = Get-Date
    $nextHour = $now.Date.AddHours($now.Hour + 1)
    $remaining = $nextHour - $now
    $reset = '{0}m{1}s' -f $remaining.Minutes, $remaining.Seconds

    # Build output
    $output = "$model | Token: $tokens"
    if ($usedPct) { $output += " ($usedPct%)" }
    $output += " | Reset: $reset"
    if ($branch) { $output += " | $branch" }

    Write-Output $output
} catch {
    Write-Output "Error: $($_.Exception.Message)"
    exit 1
}
