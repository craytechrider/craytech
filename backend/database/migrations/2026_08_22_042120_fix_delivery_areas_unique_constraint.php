<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('delivery_areas')) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 1. Remove any old unique indexes involving the location columns
        |--------------------------------------------------------------------------
        */

        $indexes = DB::select(
            'SHOW INDEX FROM `delivery_areas`'
        );

        $groupedIndexes = [];

        foreach ($indexes as $index) {
            if (
                $index->Key_name === 'PRIMARY' ||
                (int) $index->Non_unique !== 0
            ) {
                continue;
            }

            $groupedIndexes[$index->Key_name][] = [
                'column' => $index->Column_name,
                'position' => (int) $index->Seq_in_index,
            ];
        }

        foreach ($groupedIndexes as $indexName => $columns) {
            usort(
                $columns,
                fn($a, $b) =>
                $a['position'] <=> $b['position']
            );

            $columnNames = array_map(
                fn($column) => $column['column'],
                $columns
            );

            /*
             * Remove the old 4-column unique index.
             */
            if ($columnNames === [
                'country',
                'region',
                'province',
                'municipality',
            ]) {
                DB::statement(
                    'ALTER TABLE `delivery_areas`
                     DROP INDEX `' . $indexName . '`'
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 2. Reduce VARCHAR lengths
        |--------------------------------------------------------------------------
        |
        | This prevents MySQL's:
        |
        | "Specified key was too long; max key length is 3072 bytes"
        |
        */

        Schema::table('delivery_areas', function (Blueprint $table) {
            $table->string('country', 100)->change();
            $table->string('region', 150)->change();
            $table->string('province', 150)->change();
            $table->string('municipality', 150)->change();
            $table->string('barangay', 150)->change();
        });

        /*
        |--------------------------------------------------------------------------
        | 3. Check whether the new unique index already exists
        |--------------------------------------------------------------------------
        */

        $indexes = DB::select(
            'SHOW INDEX FROM `delivery_areas`'
        );

        $hasCorrectIndex = false;

        $groupedIndexes = [];

        foreach ($indexes as $index) {
            if (
                $index->Key_name === 'PRIMARY' ||
                (int) $index->Non_unique !== 0
            ) {
                continue;
            }

            $groupedIndexes[$index->Key_name][] = [
                'column' => $index->Column_name,
                'position' => (int) $index->Seq_in_index,
            ];
        }

        foreach ($groupedIndexes as $columns) {
            usort(
                $columns,
                fn($a, $b) =>
                $a['position'] <=> $b['position']
            );

            $columnNames = array_map(
                fn($column) => $column['column'],
                $columns
            );

            if ($columnNames === [
                'country',
                'region',
                'province',
                'municipality',
                'barangay',
            ]) {
                $hasCorrectIndex = true;
                break;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 4. Create the correct unique index
        |--------------------------------------------------------------------------
        */

        if (!$hasCorrectIndex) {
            DB::statement(
                'ALTER TABLE `delivery_areas`
                 ADD UNIQUE INDEX `delivery_areas_location_unique`
                 (
                    `country`,
                    `region`,
                    `province`,
                    `municipality`,
                    `barangay`
                 )'
            );
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('delivery_areas')) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Remove the new unique index
        |--------------------------------------------------------------------------
        */

        $indexes = DB::select(
            'SHOW INDEX FROM `delivery_areas`'
        );

        foreach ($indexes as $index) {
            if (
                $index->Key_name ===
                'delivery_areas_location_unique'
            ) {
                DB::statement(
                    'ALTER TABLE `delivery_areas`
                     DROP INDEX `delivery_areas_location_unique`'
                );

                break;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Restore the original column lengths
        |--------------------------------------------------------------------------
        */

        Schema::table('delivery_areas', function (Blueprint $table) {
            $table->string('country', 191)->change();
            $table->string('region', 191)->change();
            $table->string('province', 191)->change();
            $table->string('municipality', 191)->change();
            $table->string('barangay', 191)->change();
        });
    }
};
