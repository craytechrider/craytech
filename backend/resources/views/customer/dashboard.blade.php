<x-app-layout>
    <div class="p-6">
        <h1 class="text-3xl font-bold mb-6">Customer Dashboard</h1>

        <!-- Products Section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @foreach($products as $product)
            <div class="bg-white rounded-lg shadow p-4">
                @if($product->image_url)
                <img src="{{ asset('storage/' . $product->image_url) }}"
                    alt="{{ $product->name }}"
                    class="w-full h-40 object-cover rounded">
                @else
                <img src="{{ asset('images/background.jpg') }}"
                    alt="No image"
                    class="w-full h-40 object-cover rounded">
                @endif

                <h2 class="text-lg font-semibold mt-2">{{ $product->name }}</h2>
                <p class="text-gray-700">₱{{ $product->price }}</p>
                <p class="text-gray-500 text-sm">{{ $product->description }}</p>

                <!-- Add to Cart -->
                <form action="{{ route('customer.cart.add') }}" method="POST" class="inline-block mt-2">
                    @csrf
                    <input type="hidden" name="product_id" value="{{ $product->id }}">
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Add to Cart
                    </button>
                </form>

                <!-- Buy Now -->
                <form action="{{ route('customer.buyNow') }}" method="POST" class="inline-block mt-2 ml-2">
                    @csrf
                    <input type="hidden" name="product_id" value="{{ $product->id }}">
                    <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Buy Now
                    </button>
                </form>
            </div>
            @endforeach
        </div>

        <!-- My Cart button (global access) -->
        <div class="mt-6">
            <a href="{{ route('customer.cart') }}"
                class="inline-block px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                My Cart
            </a>
        </div>
    </div>
</x-app-layout>