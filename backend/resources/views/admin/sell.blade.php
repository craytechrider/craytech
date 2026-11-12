<x-app-layout>
    <div
        x-data="{
        addModal: false,
        editModal: false,

        productId: null,

        batchId: '',
        name: '',
        description: '',

        totalPieces: '',
        totalWeightKg: '',

        pricePerPiece: '',
        pricePerKg: ''
            }"
        class="space-y-6">
        @if ($errors->any())
        <div class="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p class="font-bold mb-2">There were errors:</p>

            <ul class="list-disc list-inside">
                @foreach ($errors->all() as $error)
                <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
        @endif

        @if (session('success'))
        <div class="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {{ session('success') }}
        </div>
        @endif

        <div class="bg-white rounded-xl shadow p-5">

            <div class="flex flex-col md:flex-row gap-4 justify-between">

                <input
                    type="text"
                    placeholder="Search product..."
                    class="w-full md:w-96 border rounded-lg px-4 py-2">

                <div class="flex gap-2">

                    <select class="border rounded-lg px-3 py-2">
                        <option>All Products</option>
                        <option>Available</option>
                        <option>Hidden</option>
                    </select>

                    <button
                        @click="addModal=true"
                        class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg">
                        + Add Product
                    </button>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">

            <!-- Total Products -->
            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Total Products</p>

                <h2 class="text-3xl font-bold mt-2">
                    {{ $products->count() }}
                </h2>
            </div>

            <!-- Total Crayfish -->
            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Total Crayfish</p>

                <h2 class="text-3xl font-bold text-blue-600 mt-2">
                    {{ number_format($products->sum('total_pieces')) }}
                </h2>

                <p class="text-xs text-gray-400 mt-1">
                    pieces
                </p>
            </div>

            <!-- Total Weight -->
            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Total Weight</p>

                <h2 class="text-3xl font-bold text-green-600 mt-2">
                    {{ number_format($products->sum('total_weight_kg'), 2) }}
                </h2>

                <p class="text-xs text-gray-400 mt-1">
                    kilograms
                </p>
            </div>

            <!-- Available Products -->
            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Available Products</p>

                <h2 class="text-3xl font-bold text-purple-600 mt-2">
                    {{ $products->where('is_available', true)->count() }}
                </h2>
            </div>

        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            @forelse($products as $product)

            <div class="bg-white rounded-xl shadow-lg overflow-hidden">

                <div class="h-52 bg-gray-100 flex items-center justify-center">

                    @if($product->image)

                    <img
                        src="{{ asset('storage/'.$product->image) }}"
                        class="w-full h-full object-cover">

                    @else

                    <div class="text-gray-400 text-center">

                        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />

                        </svg>

                        No Image

                    </div>

                    @endif

                </div>

                <div class="p-5">

                    <h2 class="text-xl font-bold text-gray-800">
                        {{ $product->name }}
                    </h2>

                    <div class="flex items-center gap-2 mt-2">

                        @if($product->is_available)

                        <span class="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                            Available
                        </span>

                        @else

                        <span class="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                            Hidden
                        </span>

                        @endif

                    </div>

                    <p class="text-gray-500 text-sm mt-3">
                        {{ $product->description }}
                    </p>

                    <div class="border-t mt-4 pt-4 space-y-3">

                        <!-- Batch -->
                        <div class="flex justify-between">

                            <span class="text-gray-500">
                                Batch
                            </span>

                            <span class="font-semibold">
                                {{ $product->batch->batch_name }}
                            </span>

                        </div>

                        <!-- Area -->
                        <div class="flex justify-between">

                            <span class="text-gray-500">
                                Area
                            </span>

                            <span class="font-semibold">
                                {{ $product->batch->area->name }}
                            </span>

                        </div>

                        <!-- Crayfish -->
                        <div class="flex justify-between">

                            <span class="text-gray-500">
                                Crayfish
                            </span>

                            <span class="font-semibold">
                                {{ $product->batch->crayfishType->name }}
                            </span>

                        </div>

                        <!-- Total Pieces -->
                        <div class="flex justify-between">

                            <span class="text-gray-500">
                                Total Crayfish
                            </span>

                            <span class="font-semibold text-blue-600">
                                {{ number_format($product->total_pieces) }} pcs
                            </span>

                        </div>

                        <!-- Total Weight -->
                        <div class="flex justify-between">

                            <span class="text-gray-500">
                                Total Weight
                            </span>

                            <span class="font-semibold text-green-600">
                                {{ number_format($product->total_weight_kg, 2) }} kg
                            </span>

                        </div>

                        <!-- Price Per Piece -->
                        <div class="flex justify-between">

                            <span class="text-gray-500">
                                Price / Piece
                            </span>

                            <span class="font-bold text-blue-600">
                                ₱{{ number_format($product->price_per_piece, 2) }}
                            </span>

                        </div>

                        <!-- Price Per Kilogram -->
                        <div class="flex justify-between">

                            <span class="text-gray-500">
                                Price / Kilogram
                            </span>

                            <span class="font-bold text-green-600">
                                ₱{{ number_format($product->price_per_kg, 2) }}
                            </span>

                        </div>

                    </div>

                    <div class="grid grid-cols-2 gap-3 mt-6">

                        <button
                            type="button"
                            @click="
        editModal = true;
        productId = {{ $product->id }};
        batchId = @js($product->batch_id);
        name = @js($product->name);
        description = @js($product->description ?? '');

        totalPieces = @js($product->total_pieces);
        totalWeightKg = @js($product->total_weight_kg);

        pricePerPiece = @js($product->price_per_piece);
        pricePerKg = @js($product->price_per_kg);
    "
                            class="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg">

                            Edit

                        </button>

                        <form
                            action="{{ route('products.destroy',$product) }}"
                            method="POST">

                            @csrf
                            @method('DELETE')

                            <button

                                onclick="return confirm('Delete this product?')"

                                class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg">

                                Delete

                            </button>

                        </form>

                    </div>

                </div>

            </div>

            @empty

            <div class="col-span-full">

                <div class="bg-white rounded-xl shadow p-12 text-center">

                    <h2 class="text-2xl font-bold text-gray-500">

                        No products found

                    </h2>

                    <p class="text-gray-400 mt-2">

                        Click <b>Add Product</b> to create your first product.

                    </p>

                </div>

            </div>

            @endforelse

        </div>
        <!-- Add Product Modal -->

        <template x-teleport="body">

            <div
                x-show="addModal"
                x-cloak
                x-transition.opacity
                class="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">

                <div
                    @click.away="addModal=false"
                    class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                    <!-- Header -->

                    <div class="border-b px-6 py-4 flex justify-between items-center flex-shrink-0">

                        <h2 class="text-xl font-bold text-gray-800">
                            Add Product
                        </h2>

                        <button
                            type="button"
                            @click="addModal=false"
                            class="text-gray-500 hover:text-red-600 text-2xl">

                            &times;

                        </button>

                    </div>

                    <!-- Form -->

                    <form
                        action="{{ route('products.store') }}"
                        method="POST"
                        enctype="multipart/form-data"
                        class="flex flex-col flex-1 min-h-0">

                        @csrf

                        <!-- Scrollable Content -->

                        <div class="flex-1 overflow-y-auto p-6 space-y-5">

                            <!-- Batch -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Batch
                                </label>

                                <select
                                    name="batch_id"
                                    required
                                    class="w-full border rounded-lg px-3 py-2">

                                    <option value="">
                                        Select Batch
                                    </option>

                                    @foreach($batches as $batch)

                                    <option value="{{ $batch->id }}">

                                        {{ $batch->batch_name }}
                                        -
                                        {{ $batch->area->name }}
                                        -
                                        {{ $batch->crayfishType->name }}

                                        (Alive: {{ $batch->current_population }})

                                    </option>

                                    @endforeach

                                </select>

                            </div>

                            <!-- Product Name -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Product Name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    required
                                    class="w-full border rounded-lg px-3 py-2">

                            </div>

                            <!-- Selling Type -->

                            <div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                                    <div>
                                        <label class="block text-sm font-medium mb-2">
                                            Total Crayfish
                                        </label>

                                        <div class="relative">
                                            <input
                                                type="number"
                                                name="total_pieces"
                                                min="1"
                                                required
                                                class="w-full border rounded-lg px-3 py-2 pr-16">

                                            <span class="absolute right-3 top-2.5 text-gray-500">
                                                pcs
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium mb-2">
                                            Total Weight
                                        </label>

                                        <div class="relative">
                                            <input
                                                type="number"
                                                name="total_weight_kg"
                                                step="0.01"
                                                min="0.01"
                                                required
                                                class="w-full border rounded-lg px-3 py-2 pr-16">

                                            <span class="absolute right-3 top-2.5 text-gray-500">
                                                kg
                                            </span>
                                        </div>
                                    </div>

                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                                    <div>
                                        <label class="block text-sm font-medium mb-2">
                                            Price per Piece
                                        </label>

                                        <div class="relative">
                                            <span class="absolute left-3 top-2.5 text-gray-500">
                                                ₱
                                            </span>

                                            <input
                                                type="number"
                                                name="price_per_piece"
                                                step="0.01"
                                                min="0.01"
                                                required
                                                class="w-full border rounded-lg px-3 py-2 pl-8">
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium mb-2">
                                            Price per Kilogram
                                        </label>

                                        <div class="relative">
                                            <span class="absolute left-3 top-2.5 text-gray-500">
                                                ₱
                                            </span>

                                            <input
                                                type="number"
                                                name="price_per_kg"
                                                step="0.01"
                                                min="0.01"
                                                required
                                                class="w-full border rounded-lg px-3 py-2 pl-8">
                                        </div>
                                    </div>

                                </div>

                            </div>



                            <!-- Image -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Product Image
                                </label>

                                <input
                                    type="file"
                                    name="image"
                                    accept="image/*"
                                    class="w-full border rounded-lg px-3 py-2">

                            </div>

                            <!-- Description -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    rows="4"
                                    class="w-full border rounded-lg px-3 py-2"></textarea>

                            </div>

                        </div>

                        <!-- Footer -->

                        <div class="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0 bg-white">

                            <button
                                type="button"
                                @click="addModal=false"
                                class="px-5 py-2 border rounded-lg hover:bg-gray-100">

                                Cancel

                            </button>

                            <button
                                type="submit"
                                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">

                                Save Product

                            </button>

                        </div>

                    </form>

                </div>

            </div>

        </template>
        <!-- Edit Product Modal -->

        <template x-teleport="body">

            <div
                x-show="editModal"
                x-cloak
                x-transition.opacity
                class="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">

                <div
                    @click.away="editModal=false"
                    class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                    <!-- Header -->

                    <div class="border-b px-6 py-4 flex justify-between items-center flex-shrink-0">

                        <h2 class="text-xl font-bold text-gray-800">
                            Edit Product
                        </h2>

                        <button
                            type="button"
                            @click="editModal=false"
                            class="text-gray-500 hover:text-red-600 text-2xl">

                            &times;

                        </button>

                    </div>

                    <!-- Form -->

                    <form
                        :action="'{{ url('/products') }}/' + productId"
                        method="POST"
                        enctype="multipart/form-data"
                        class="flex flex-col flex-1 min-h-0">

                        @csrf
                        @method('PUT')

                        <!-- Scrollable Content -->

                        <div class="flex-1 overflow-y-auto p-6 space-y-5">

                            <!-- Batch -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Batch
                                </label>

                                <select
                                    name="batch_id"
                                    x-model="batchId"
                                    required
                                    class="w-full border rounded-lg px-3 py-2">

                                    @foreach($batches as $batch)

                                    <option value="{{ $batch->id }}">

                                        {{ $batch->batch_name }}
                                        -
                                        {{ $batch->area->name }}
                                        -
                                        {{ $batch->crayfishType->name }}

                                    </option>

                                    @endforeach

                                </select>

                            </div>

                            <!-- Product Name -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Product Name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    x-model="name"
                                    required
                                    class="w-full border rounded-lg px-3 py-2">

                            </div>

                            <!-- Total Crayfish -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Total Crayfish
                                </label>

                                <div class="relative">

                                    <input
                                        type="number"
                                        name="total_pieces"
                                        min="1"
                                        x-model="totalPieces"
                                        required
                                        class="w-full border rounded-lg px-3 py-2 pr-16">

                                    <span class="absolute right-3 top-2.5 text-gray-500">
                                        pcs
                                    </span>

                                </div>

                            </div>


                            <!-- Total Weight -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Total Weight
                                </label>

                                <div class="relative">

                                    <input
                                        type="number"
                                        name="total_weight_kg"
                                        step="0.01"
                                        min="0.01"
                                        x-model="totalWeightKg"
                                        required
                                        class="w-full border rounded-lg px-3 py-2 pr-16">

                                    <span class="absolute right-3 top-2.5 text-gray-500">
                                        kg
                                    </span>

                                </div>

                            </div>


                            <!-- Prices -->

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <!-- Price Per Piece -->

                                <div>

                                    <label class="block text-sm font-medium mb-2">
                                        Price per Piece
                                    </label>

                                    <div class="relative">

                                        <span class="absolute left-3 top-2.5 text-gray-500">
                                            ₱
                                        </span>

                                        <input
                                            type="number"
                                            name="price_per_piece"
                                            step="0.01"
                                            min="0.01"
                                            x-model="pricePerPiece"
                                            required
                                            class="w-full border rounded-lg px-3 py-2 pl-8">

                                    </div>

                                </div>


                                <!-- Price Per KG -->

                                <div>

                                    <label class="block text-sm font-medium mb-2">
                                        Price per Kilogram
                                    </label>

                                    <div class="relative">

                                        <span class="absolute left-3 top-2.5 text-gray-500">
                                            ₱
                                        </span>

                                        <input
                                            type="number"
                                            name="price_per_kg"
                                            step="0.01"
                                            min="0.01"
                                            x-model="pricePerKg"
                                            required
                                            class="w-full border rounded-lg px-3 py-2 pl-8">

                                    </div>

                                </div>

                            </div>

                            <!-- Image -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Replace Image
                                </label>

                                <input
                                    type="file"
                                    name="image"
                                    accept="image/*"
                                    class="w-full border rounded-lg px-3 py-2">

                            </div>

                            <!-- Description -->

                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    rows="4"
                                    x-model="description"
                                    class="w-full border rounded-lg px-3 py-2"></textarea>

                            </div>

                        </div>

                        <!-- Footer -->

                        <div class="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0 bg-white">

                            <button
                                type="button"
                                @click="editModal=false"
                                class="border px-5 py-2 rounded-lg hover:bg-gray-100">

                                Cancel

                            </button>

                            <button
                                type="submit"
                                class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg">

                                Update Product

                            </button>

                        </div>

                    </form>

                </div>

            </div>

        </template>

    </div>

</x-app-layout>