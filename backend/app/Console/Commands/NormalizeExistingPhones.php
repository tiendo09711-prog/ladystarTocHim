<?php

namespace App\Console\Commands;

use App\Support\PhoneNormalizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NormalizeExistingPhones extends Command
{
    protected $signature = 'app:normalize-existing-phones {--dry-run : Report changes without updating records}';

    protected $description = 'Normalize legacy phone values and report unique collisions safely';

    private const PHONE_COLUMNS = [
        ['table' => 'users', 'column' => 'phone', 'unique' => true],
        ['table' => 'addresses', 'column' => 'phone', 'unique' => false],
        ['table' => 'orders', 'column' => 'customer_phone', 'unique' => false],
        ['table' => 'appointments', 'column' => 'customer_phone', 'unique' => false],
        ['table' => 'consultation_requests', 'column' => 'phone', 'unique' => false],
        ['table' => 'branches', 'column' => 'phone', 'unique' => false],
        ['table' => 'store_settings', 'column' => 'support_phone', 'unique' => false],
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $collisions = 0;

        foreach (self::PHONE_COLUMNS as $config) {
            if (! Schema::hasTable($config['table']) || ! Schema::hasColumn($config['table'], $config['column'])) {
                continue;
            }

            [$updates, $tableCollisions] = $config['unique']
                ? $this->normalizeUniqueColumn($config['table'], $config['column'], $dryRun)
                : $this->normalizeColumn($config['table'], $config['column'], $dryRun);
            $collisions += $tableCollisions;
            $verb = $dryRun ? 'will update' : 'updated';
            $this->line("{$config['table']}: {$updates} {$verb}; {$tableCollisions} collisions");
        }

        return $collisions > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function normalizeUniqueColumn(string $table, string $column, bool $dryRun): array
    {
        $rows = DB::table($table)->whereNotNull($column)->where($column, '!=', '')->orderBy('id')->get(['id', $column]);
        $candidates = $rows->map(fn ($row) => [
            'id' => (int) $row->id,
            'raw' => (string) $row->{$column},
            'canonical' => PhoneNormalizer::normalize($row->{$column}),
        ])->filter(fn ($row) => $row['canonical'] !== null);
        $collisionGroups = $candidates->groupBy('canonical')->filter(fn ($group) => $group->count() > 1);
        foreach ($collisionGroups as $canonical => $group) {
            $this->warn("{$table} collision {$canonical}: IDs ".$group->pluck('id')->implode(', '));
        }
        $collisionIds = $collisionGroups->flatten(1)->pluck('id')->flip();
        $updates = 0;

        foreach ($candidates as $candidate) {
            if ($candidate['raw'] === $candidate['canonical'] || $collisionIds->has($candidate['id'])) {
                continue;
            }
            $updates++;
            if (! $dryRun) {
                DB::table($table)->where('id', $candidate['id'])->update([$column => $candidate['canonical']]);
            }
        }

        return [$updates, $collisionGroups->count()];
    }

    private function normalizeColumn(string $table, string $column, bool $dryRun): array
    {
        $updates = 0;
        DB::table($table)->whereNotNull($column)->where($column, '!=', '')->orderBy('id')->chunkById(500, function ($rows) use ($table, $column, $dryRun, &$updates) {
            foreach ($rows as $row) {
                $canonical = PhoneNormalizer::normalize($row->{$column});
                if ($canonical === null || $canonical === $row->{$column}) {
                    continue;
                }
                $updates++;
                if (! $dryRun) {
                    DB::table($table)->where('id', $row->id)->update([$column => $canonical]);
                }
            }
        }, 'id', 'id');

        return [$updates, 0];
    }
}
