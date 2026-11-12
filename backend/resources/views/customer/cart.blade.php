<x-app-layout>
    <div class="p-6">
        <h1 class="text-2xl font-bold mb-6">My Cart</h1>

        <table class="w-full border-collapse">
            <thead>
                <tr class="bg-gray-200">
                    <th class="p-3 text-left">Product</th>
                    <th class="p-3 text-left">Quantity</th>
                    <th class="p-3 text-left">Price</th>
                    <th class="p-3 text-left">Actions</th>
                </tr>
            </thead>
            <tbody>
                @forelse($products as $product)
                <tr>
                    <td class="p-3">{{ $product->name }}</td>
                    <td class="p-3">{{ $cart[$product->id] }}</td>
                    <td class="p-3">₱{{ $product->price * $cart[$product->id] }}</td>
                    <td class="p-3">
                        <form action="{{ route('customer.cart.remove', $product->id) }}" method="POST">
                            @csrf @method('DELETE')
                            <button class="px-3 py-1 bg-red-600 text-white rounded">Remove</button>
                        </form>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="4" class="p-3 text-center text-gray-500">Your cart is empty.</td>
                </tr>
                @endforelse
            </tbody>
        </table>

        <div class="mt-6 flex justify-between items-center" x-data="{ openCheckout: false }">
            <p class="text-lg font-semibold">
                Total: ₱{{ $products->sum(fn($p) => $p->price * $cart[$p->id]) }}
            </p>
            <button @click="openCheckout = true"
                class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Proceed to Checkout
            </button>

            <!-- Checkout Modal -->
            <div x-show="openCheckout" @click.away="openCheckout = false"
                class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div class="bg-white p-6 rounded shadow-lg w-96">
                    <h2 class="text-lg font-semibold mb-4">Confirm Checkout</h2>
                    <p class="mb-4">Are you sure you want to place this order?</p>

                    <div class="mt-4 flex justify-end space-x-2">
                        <form action="{{ route('customer.buyNow') }}" method="POST">
                            @csrf
                            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">
                                Yes, Place Order
                            </button>
                        </form>
                        <button @click="openCheckout = false"
                            class="px-4 py-2 bg-gray-400 text-white rounded">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>