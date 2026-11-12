<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Batch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * Get all products.
     */
    public function index()
    {
        try {
            $products = Product::with([
                'batch.area.areaType',
                'batch.crayfishType',
            ])
                ->latest()
                ->get();

            $products->transform(function ($product) {

                if ($product->image) {
                    $product->image_url =
                        url('/storage/' . ltrim($product->image, '/'));
                } else {
                    $product->image_url = null;
                }

                return $product;
            });

            return response()->json([
                'success' => true,
                'data' => $products,
            ]);
        } catch (\Throwable $e) {

            return response()->json([
                'success' => false,
                'message' => 'Failed to load products.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * Create product.
     * KG ONLY.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|exists:batches,id',

            'name' => 'required|string|max:255',

            'description' => 'nullable|string',

            'total_weight_kg' => 'required|numeric|min:0.01',

            'price_per_kg' => 'required|numeric|min:0.01',

            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        try {

            DB::beginTransaction();

            $batch = Batch::findOrFail(
                $validated['batch_id']
            );

            $totalWeight = (float) $validated['total_weight_kg'];

            /*
            |--------------------------------------------------------------------------
            | Upload image
            |--------------------------------------------------------------------------
            */

            $imagePath = null;

            if ($request->hasFile('image')) {

                $imagePath = $request
                    ->file('image')
                    ->store('products', 'public');
            }

            /*
            |--------------------------------------------------------------------------
            | Create product
            |--------------------------------------------------------------------------
            */

            $product = Product::create([

                'batch_id' =>
                $validated['batch_id'],

                'name' =>
                $validated['name'],

                'description' =>
                $validated['description'] ?? null,

                'total_weight_kg' =>
                $totalWeight,

                'available_weight_kg' =>
                $totalWeight,

                'price_per_kg' =>
                $validated['price_per_kg'],

                'image' =>
                $imagePath,

                'status' =>
                true,

                'is_available' =>
                true,
            ]);

            DB::commit();

            /*
            |--------------------------------------------------------------------------
            | Reload relationships
            |--------------------------------------------------------------------------
            */

            $product->load([
                'batch.area.areaType',
                'batch.crayfishType',
            ]);

            /*
            |--------------------------------------------------------------------------
            | Image URL
            |--------------------------------------------------------------------------
            */

            if ($product->image) {

                $product->image_url =
                    url('/storage/' . ltrim($product->image, '/'));
            } else {

                $product->image_url = null;
            }

            return response()->json([
                'success' => true,
                'message' => 'Product added successfully.',
                'data' => $product,
            ], 201);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to create product.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * Update product.
     * KG ONLY.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'batch_id' => 'required|exists:batches,id',

            'name' => 'required|string|max:255',

            'description' => 'nullable|string',

            'total_weight_kg' => 'required|numeric|min:0.01',

            'price_per_kg' => 'required|numeric|min:0.01',

            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        try {

            DB::beginTransaction();

            /*
            |--------------------------------------------------------------------------
            | Calculate already sold weight
            |--------------------------------------------------------------------------
            */

            $oldTotalWeight =
                (float) $product->total_weight_kg;

            $oldAvailableWeight =
                (float) $product->available_weight_kg;

            $alreadySoldWeight =
                $oldTotalWeight - $oldAvailableWeight;

            /*
            |--------------------------------------------------------------------------
            | New weight
            |--------------------------------------------------------------------------
            */

            $newTotalWeight =
                (float) $validated['total_weight_kg'];

            /*
            |--------------------------------------------------------------------------
            | Prevent total below sold quantity
            |--------------------------------------------------------------------------
            */

            if ($newTotalWeight < $alreadySoldWeight) {

                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' =>
                    'Total weight cannot be lower than the quantity already sold.',
                ], 422);
            }

            /*
            |--------------------------------------------------------------------------
            | Calculate available weight
            |--------------------------------------------------------------------------
            */

            $newAvailableWeight =
                $newTotalWeight - $alreadySoldWeight;

            /*
            |--------------------------------------------------------------------------
            | Image
            |--------------------------------------------------------------------------
            */

            $imagePath = $product->image;

            if ($request->hasFile('image')) {

                if ($product->image) {

                    Storage::disk('public')->delete(
                        $product->image
                    );
                }

                $imagePath = $request
                    ->file('image')
                    ->store('products', 'public');
            }

            /*
            |--------------------------------------------------------------------------
            | Update product
            |--------------------------------------------------------------------------
            */

            $product->update([

                'batch_id' =>
                $validated['batch_id'],

                'name' =>
                $validated['name'],

                'description' =>
                $validated['description'] ?? null,

                'total_weight_kg' =>
                $newTotalWeight,

                'available_weight_kg' =>
                $newAvailableWeight,

                'price_per_kg' =>
                $validated['price_per_kg'],

                'image' =>
                $imagePath,

                'is_available' =>
                $newAvailableWeight > 0,
            ]);

            DB::commit();

            /*
            |--------------------------------------------------------------------------
            | Reload relationships
            |--------------------------------------------------------------------------
            */

            $product->load([
                'batch.area.areaType',
                'batch.crayfishType',
            ]);

            /*
            |--------------------------------------------------------------------------
            | Image URL
            |--------------------------------------------------------------------------
            */

            if ($product->image) {

                $product->image_url =
                    url('/storage/' . ltrim($product->image, '/'));
            } else {

                $product->image_url = null;
            }

            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully.',
                'data' => $product,
            ]);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to update product.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * Delete product.
     */
    public function destroy(Product $product)
    {
        try {

            DB::beginTransaction();

            /*
            |--------------------------------------------------------------------------
            | Delete image
            |--------------------------------------------------------------------------
            */

            if ($product->image) {

                Storage::disk('public')->delete(
                    $product->image
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Delete product
            |--------------------------------------------------------------------------
            */

            $product->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Product deleted successfully.',
            ]);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete product.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
