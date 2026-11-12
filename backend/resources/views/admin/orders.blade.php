<x-app-layout>

    <div
        x-data="{
            orderModal: false,
            selectedProduct: '',
            selectedSellingType: 'piece',
            quantity: 1,
            items: [],

            addItem() {
                if (!this.selectedProduct || !this.quantity) {
                    return;
                }

                const product = this.$refs.productSelect.options[
                    this.$refs.productSelect.selectedIndex
                ];

                this.items.push({
                    product_id: this.selectedProduct,
                    name: product.dataset.name,
                    selling_type: this.selectedSellingType,
                    quantity: parseFloat(this.quantity),
                    price: this.selectedSellingType === 'piece'
                        ? parseFloat(product.dataset.piecePrice)
                        : parseFloat(product.dataset.kgPrice)
                });

                this.selectedProduct = '';
                this.quantity = 1;
            },

            removeItem(index) {
                this.items.splice(index, 1);
            },

            get total() {
                return this.items.reduce(
                    (sum, item) => sum + (item.quantity * item.price),
                    0
                );
            }
        }"
        class="space-y-6">

        {{-- Success Message --}}
        @if(session('success'))
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {{ session('success') }}
        </div>
        @endif

        {{-- Error Messages --}}
        @if($errors->any())
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p class="font-bold mb-2">There were errors:</p>

            <ul class="list-disc list-inside">
                @foreach($errors->all() as $error)
                <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
        @endif


        {{-- Header --}}
        <div class="bg-white rounded-xl shadow p-5">

            <div class="flex flex-col md:flex-row justify-between gap-4">

                <div>
                    <h1 class="text-2xl font-bold text-gray-800">
                        Orders
                    </h1>

                    <p class="text-gray-500 text-sm mt-1">
                        Manage customer and walk-in orders.
                    </p>
                </div>

                <button
                    type="button"
                    @click="orderModal = true"
                    class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg">
                    + New Walk-in Order
                </button>

            </div>

        </div>


        {{-- Statistics --}}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">

            {{-- Total --}}
            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">
                    Total Orders
                </p>

                <h2 class="text-3xl font-bold mt-2">
                    {{ $orders->count() }}
                </h2>
            </div>


            {{-- Pending --}}
            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">
                    Pending
                </p>

                <h2 class="text-3xl font-bold text-yellow-500 mt-2">
                    {{ $orders->where('status', 'pending')->count() }}
                </h2>
            </div>


            {{-- Completed --}}
            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">
                    Completed
                </p>

                <h2 class="text-3xl font-bold text-green-600 mt-2">
                    {{ $orders->where('status', 'completed')->count() }}
                </h2>
            </div>


            {{-- Cancelled --}}
            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">
                    Cancelled
                </p>

                <h2 class="text-3xl font-bold text-red-600 mt-2">
                    {{ $orders->where('status', 'cancelled')->count() }}
                </h2>
            </div>

        </div>


        {{-- Orders Table --}}
        <div class="bg-white rounded-xl shadow overflow-hidden">

            <div class="p-5 border-b">
                <h2 class="text-lg font-bold text-gray-800">
                    Order List
                </h2>
            </div>

            <div class="overflow-x-auto">

                <table class="w-full">

                    <thead class="bg-gray-50">

                        <tr>
                            <th class="text-left px-5 py-3 text-sm text-gray-500">
                                Order #
                            </th>

                            <th class="text-left px-5 py-3 text-sm text-gray-500">
                                Customer
                            </th>

                            <th class="text-left px-5 py-3 text-sm text-gray-500">
                                Type
                            </th>

                            <th class="text-left px-5 py-3 text-sm text-gray-500">
                                Items
                            </th>

                            <th class="text-left px-5 py-3 text-sm text-gray-500">
                                Total
                            </th>

                            <th class="text-left px-5 py-3 text-sm text-gray-500">
                                Status
                            </th>

                            <th class="text-right px-5 py-3 text-sm text-gray-500">
                                Action
                            </th>
                        </tr>

                    </thead>


                    <tbody class="divide-y">

                        @forelse($orders as $order)

                        <tr class="hover:bg-gray-50">

                            <td class="px-5 py-4 font-semibold">
                                #{{ $order->id }}
                            </td>


                            <td class="px-5 py-4">

                                <div class="font-semibold text-gray-800">
                                    {{ $order->customer_name }}
                                </div>

                                @if($order->customer_contact)
                                <div class="text-xs text-gray-500">
                                    {{ $order->customer_contact }}
                                </div>
                                @endif

                            </td>


                            <td class="px-5 py-4">

                                @if($order->order_type === 'walk_in')

                                <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                                    Walk-in
                                </span>

                                @else

                                <span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                                    Customer
                                </span>

                                @endif

                            </td>


                            <td class="px-5 py-4">

                                {{ $order->items->count() }}

                                {{ $order->items->count() == 1 ? 'item' : 'items' }}

                            </td>


                            <td class="px-5 py-4 font-bold text-green-600">
                                ₱{{ number_format($order->total_amount, 2) }}
                            </td>


                            <td class="px-5 py-4">

                                @if($order->status === 'pending')

                                <span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
                                    Pending
                                </span>

                                @elseif($order->status === 'completed')

                                <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                                    Completed
                                </span>

                                @else

                                <span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                                    Cancelled
                                </span>

                                @endif

                            </td>


                            <td class="px-5 py-4">

                                <div class="flex justify-end gap-2">

                                    <a
                                        href="{{ route('orders.show', $order) }}"
                                        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">
                                        View
                                    </a>


                                    @if($order->status !== 'cancelled')

                                    <form
                                        action="{{ route('orders.cancel', $order) }}"
                                        method="POST"
                                        onsubmit="return confirm('Cancel this order and restore the stock?')">

                                        @csrf

                                        <button
                                            type="submit"
                                            class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm">
                                            Cancel
                                        </button>

                                    </form>

                                    @endif

                                </div>

                            </td>

                        </tr>

                        @empty

                        <tr>
                            <td
                                colspan="7"
                                class="px-5 py-12 text-center text-gray-500">

                                <p class="text-xl font-semibold">
                                    No orders yet
                                </p>

                                <p class="text-sm mt-1">
                                    Create a walk-in order to get started.
                                </p>

                            </td>
                        </tr>

                        @endforelse

                    </tbody>

                </table>

            </div>

        </div>


        {{-- WALK-IN ORDER MODAL --}}
        <template x-teleport="body">

            <div
                x-show="orderModal"
                x-cloak
                x-transition.opacity
                class="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">

                <div
                    @click.away="orderModal = false"
                    class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

                    {{-- Modal Header --}}
                    <div class="border-b px-6 py-4 flex justify-between items-center">

                        <div>
                            <h2 class="text-xl font-bold text-gray-800">
                                New Walk-in Order
                            </h2>

                            <p class="text-sm text-gray-500">
                                Add products to the customer's order.
                            </p>
                        </div>

                        <button
                            type="button"
                            @click="orderModal = false"
                            class="text-gray-500 hover:text-red-600 text-2xl">
                            &times;
                        </button>

                    </div>


                    {{-- Form --}}
                    <form
                        action="{{ route('orders.store') }}"
                        method="POST"
                        class="flex flex-col flex-1 min-h-0">

                        @csrf

                        <input
                            type="hidden"
                            name="order_type"
                            value="walk_in">


                        {{-- Scrollable Content --}}
                        <div class="flex-1 overflow-y-auto p-6 space-y-5">

                            {{-- Customer --}}
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <div>

                                    <label class="block text-sm font-medium mb-2">
                                        Customer Name
                                    </label>

                                    <input
                                        type="text"
                                        name="customer_name"
                                        required
                                        placeholder="Walk-in Customer"
                                        class="w-full border rounded-lg px-3 py-2">

                                </div>


                                <div>

                                    <label class="block text-sm font-medium mb-2">
                                        Contact Number
                                    </label>

                                    <input
                                        type="text"
                                        name="customer_contact"
                                        placeholder="Optional"
                                        class="w-full border rounded-lg px-3 py-2">

                                </div>

                            </div>


                            {{-- Add Product --}}
                            <div class="border rounded-xl p-4 bg-gray-50">

                                <h3 class="font-semibold text-gray-800 mb-4">
                                    Add Product
                                </h3>


                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

                                    {{-- Product --}}
                                    <div>

                                        <label class="block text-sm font-medium mb-2">
                                            Product
                                        </label>

                                        <select
                                            x-ref="productSelect"
                                            x-model="selectedProduct"
                                            class="w-full border rounded-lg px-3 py-2">

                                            <option value="">
                                                Select Product
                                            </option>

                                            @foreach($products as $product)

                                            <option
                                                value="{{ $product->id }}"
                                                data-name="{{ $product->name }}"
                                                data-piece-price="{{ $product->price_per_piece }}"
                                                data-kg-price="{{ $product->price_per_kg }}">

                                                {{ $product->name }}

                                            </option>

                                            @endforeach

                                        </select>

                                    </div>


                                    {{-- Selling Type --}}
                                    <div>

                                        <label class="block text-sm font-medium mb-2">
                                            Selling Type
                                        </label>

                                        <select
                                            x-model="selectedSellingType"
                                            class="w-full border rounded-lg px-3 py-2">

                                            <option value="piece">
                                                Per Piece
                                            </option>

                                            <option value="kilogram">
                                                Per Kilogram
                                            </option>

                                        </select>

                                    </div>


                                    {{-- Quantity --}}
                                    <div>

                                        <label class="block text-sm font-medium mb-2">
                                            Quantity
                                        </label>

                                        <div class="flex gap-2">

                                            <input
                                                type="number"
                                                x-model="quantity"
                                                min="0.01"
                                                step="0.01"
                                                class="w-full border rounded-lg px-3 py-2">

                                            <button
                                                type="button"
                                                @click="addItem()"
                                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg">
                                                Add
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            </div>


                            {{-- Order Items --}}
                            <div>

                                <h3 class="font-semibold text-gray-800 mb-3">
                                    Order Items
                                </h3>


                                <div
                                    x-show="items.length === 0"
                                    class="border rounded-lg p-6 text-center text-gray-400">
                                    No products added yet.
                                </div>


                                <div
                                    x-show="items.length > 0"
                                    class="border rounded-lg overflow-hidden">

                                    <table class="w-full">

                                        <thead class="bg-gray-50">

                                            <tr>

                                                <th class="text-left px-4 py-3 text-sm">
                                                    Product
                                                </th>

                                                <th class="text-left px-4 py-3 text-sm">
                                                    Type
                                                </th>

                                                <th class="text-left px-4 py-3 text-sm">
                                                    Quantity
                                                </th>

                                                <th class="text-left px-4 py-3 text-sm">
                                                    Price
                                                </th>

                                                <th class="text-right px-4 py-3 text-sm">
                                                    Subtotal
                                                </th>

                                                <th></th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            <template
                                                x-for="(item, index) in items"
                                                :key="index">

                                                <tr class="border-t">

                                                    <td class="px-4 py-3">

                                                        <span x-text="item.name"></span>

                                                        <input
                                                            type="hidden"
                                                            :name="'items[' + index + '][product_id]'"
                                                            :value="item.product_id">

                                                    </td>


                                                    <td class="px-4 py-3">

                                                        <span
                                                            x-text="item.selling_type === 'piece'
                                                                ? 'Per Piece'
                                                                : 'Per Kilogram'"></span>

                                                        <input
                                                            type="hidden"
                                                            :name="'items[' + index + '][selling_type]'"
                                                            :value="item.selling_type">

                                                    </td>


                                                    <td class="px-4 py-3">

                                                        <span x-text="item.quantity"></span>

                                                        <input
                                                            type="hidden"
                                                            :name="'items[' + index + '][quantity]'"
                                                            :value="item.quantity">

                                                    </td>


                                                    <td class="px-4 py-3">

                                                        ₱<span
                                                            x-text="item.price.toFixed(2)"></span>

                                                    </td>


                                                    <td class="px-4 py-3 text-right font-semibold">

                                                        ₱<span
                                                            x-text="(item.quantity * item.price).toFixed(2)"></span>

                                                    </td>


                                                    <td class="px-4 py-3 text-right">

                                                        <button
                                                            type="button"
                                                            @click="removeItem(index)"
                                                            class="text-red-600 hover:text-red-800">
                                                            Remove
                                                        </button>

                                                    </td>

                                                </tr>

                                            </template>

                                        </tbody>

                                    </table>

                                </div>

                            </div>


                            {{-- Notes --}}
                            <div>

                                <label class="block text-sm font-medium mb-2">
                                    Notes
                                </label>

                                <textarea
                                    name="notes"
                                    rows="3"
                                    placeholder="Optional notes..."
                                    class="w-full border rounded-lg px-3 py-2"></textarea>

                            </div>


                            {{-- Total --}}
                            <div class="bg-green-50 border border-green-200 rounded-xl p-5">

                                <div class="flex justify-between items-center">

                                    <span class="text-gray-600 font-medium">
                                        Order Total
                                    </span>

                                    <span class="text-2xl font-bold text-green-600">
                                        ₱<span x-text="total.toFixed(2)"></span>
                                    </span>

                                </div>

                            </div>

                        </div>


                        {{-- Footer --}}
                        <div class="border-t px-6 py-4 flex justify-end gap-3 bg-white">

                            <button
                                type="button"
                                @click="orderModal = false"
                                class="px-5 py-2 border rounded-lg hover:bg-gray-100">
                                Cancel
                            </button>

                            <button
                                type="submit"
                                :disabled="items.length === 0"
                                :class="items.length === 0
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'"
                                class="text-white px-6 py-2 rounded-lg">
                                Create Order
                            </button>

                        </div>

                    </form>

                </div>

            </div>

        </template>

    </div>

</x-app-layout>