<x-app-layout>
    <div class="p-6">
        <h1 class="text-2xl font-bold mb-6">My Orders</h1>

        <div x-data="{ openModal: false, selectedOrder: {} }">
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-gray-200">
                        <th class="p-3 text-left">Order #</th>
                        <th class="p-3 text-left">Date</th>
                        <th class="p-3 text-left">Status</th>
                        <th class="p-3 text-left">Total</th>
                        <th class="p-3 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($orders as $order)
                    <tr>
                        <td class="p-3">ORD-{{ $order->id }}</td>
                        <td class="p-3">{{ $order->created_at->format('F d, Y') }}</td>
                        <td class="p-3">
                            @if($order->status === 'pending')
                            <span class="px-2 py-1 bg-yellow-500 text-white rounded">Pending</span>
                            @elseif($order->status === 'confirmed')
                            <span class="px-2 py-1 bg-green-600 text-white rounded">Confirmed</span>
                            @elseif($order->status === 'cancelled')
                            <span class="px-2 py-1 bg-red-600 text-white rounded">Cancelled</span>
                            @endif
                        </td>
                        <td class="p-3">₱{{ $order->total }}</td>
                        <td class="p-3">
                            <button
                                @click="
                                        openModal = true;
                                        selectedOrder = {
                                            id: {{ $order->id }},
                                            status: '{{ $order->status }}',
                                            total: '{{ $order->total }}',
                                            date: '{{ $order->created_at->format('F d, Y') }}'
                                        }
                                    "
                                class="px-3 py-1 bg-blue-600 text-white rounded">
                                View
                            </button>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="5" class="p-3 text-center text-gray-500">You don’t have any orders yet.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>

            <!-- Order Modal -->
            <div x-show="openModal" @click.away="openModal = false"
                class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div class="bg-white p-6 rounded shadow-lg w-96">
                    <h2 class="text-lg font-semibold mb-4">Order Details</h2>
                    <p><strong>Order #:</strong> ORD-<span x-text="selectedOrder.id"></span></p>
                    <p><strong>Date:</strong> <span x-text="selectedOrder.date"></span></p>
                    <p><strong>Status:</strong> <span x-text="selectedOrder.status"></span></p>
                    <p><strong>Total:</strong> ₱<span x-text="selectedOrder.total"></span></p>

                    <div class="mt-4 flex justify-end space-x-2">
                        <!-- Pay -->
                        <template x-if="selectedOrder.status === 'pending'">
                            <form :action="`/orders/${selectedOrder.id}/pay`" method="POST">
                                @csrf
                                <button type="submit" class="px-3 py-1 bg-green-600 text-white rounded">
                                    Pay (Mock)
                                </button>
                            </form>
                        </template>

                        <!-- Cancel -->
                        <template x-if="selectedOrder.status === 'pending'">
                            <form :action="`/orders/${selectedOrder.id}/cancel`" method="POST">
                                @csrf @method('DELETE')
                                <button type="submit" class="px-3 py-1 bg-red-600 text-white rounded">Cancel</button>
                            </form>
                        </template>


                        <button type="button" @click="openModal = false"
                            class="px-3 py-1 bg-gray-400 text-white rounded">Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>