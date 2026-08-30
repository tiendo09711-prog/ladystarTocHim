<?php

namespace App\Console\Commands;

use App\Models\AfterSalesMedium;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PrivatizeAfterSalesMedia extends Command
{
    protected $signature = 'after-sales:privatize-media';

    protected $description = 'Move legacy after-sales evidence from public storage to private storage';

    public function handle(): int
    {
        $moved = 0;
        $missing = 0;

        AfterSalesMedium::where('disk', 'public')->orderBy('id')->chunkById(100, function ($media) use (&$moved, &$missing) {
            foreach ($media as $medium) {
                if (Storage::disk('local')->exists($medium->path)) {
                    $medium->update(['disk' => 'local']);
                    Storage::disk('public')->delete($medium->path);
                    $moved++;

                    continue;
                }
                if (! Storage::disk('public')->exists($medium->path)) {
                    $this->warn("Missing media #{$medium->id}: {$medium->path}");
                    $missing++;

                    continue;
                }

                $stream = Storage::disk('public')->readStream($medium->path);
                if ($stream === false || ! Storage::disk('local')->writeStream($medium->path, $stream)) {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                    $this->error("Failed to copy media #{$medium->id}");

                    continue;
                }
                if (is_resource($stream)) {
                    fclose($stream);
                }
                $medium->update(['disk' => 'local']);
                Storage::disk('public')->delete($medium->path);
                $moved++;
            }
        });

        $this->info("Moved: {$moved}; missing: {$missing}");

        return self::SUCCESS;
    }
}
