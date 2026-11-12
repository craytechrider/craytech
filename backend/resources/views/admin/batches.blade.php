<x-app-layout>

    <div
        x-data="{
addBatch:false,
updateBatch:false,

batchId:'',
batchName:'',
areaId:'',
crayfishTypeId:'',
initialPopulation:'',
currentPopulation:'',
dateAdded:''
}"
        class="space-y-6">

        <div class="flex justify-between items-center">

            <div>
                <h1 class="text-3xl font-bold text-gray-800">
                    Batch Management
                </h1>

                <p class="text-gray-500">
                    Manage crayfish breeding batches.
                </p>
            </div>

            <button
                @click="addBatch=true"
                class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold">

                + Add Batch

            </button>

        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">

            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Total Batches</p>

                <h2 class="text-3xl font-bold mt-2">
                    {{ $batches->count() }}
                </h2>
            </div>

            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Total Crayfish</p>

                <h2 class="text-3xl font-bold mt-2">
                    {{ $batches->sum('current_population') }}
                </h2>
            </div>

            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Average Mortality</p>

                <h2 class="text-3xl font-bold mt-2">

                    @if($batches->count())

                    {{ number_format(
$batches->avg(function($batch){

return (($batch->initial_population-$batch->current_population)/$batch->initial_population)*100;

}),2) }}%

                    @else

                    0%

                    @endif

                </h2>
            </div>

            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Latest Updates</p>

                <h2 class="text-3xl font-bold mt-2">

                    {{ \App\Models\BatchUpdate::whereDate('created_at',today())->count() }}

                </h2>
            </div>

        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            @forelse($batches as $batch)

            <div class="bg-white rounded-xl shadow-lg overflow-hidden">

                <div class="bg-blue-600 text-white px-5 py-3">
                    <h2 class="text-lg font-bold">
                        {{ $batch->batch_name }}
                    </h2>
                </div>

                <div class="p-5 space-y-3">

                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">Area</span>
                        <span>{{ $batch->area->name }}</span>
                    </div>

                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">Crayfish Type</span>
                        <span>{{ $batch->crayfishType->name }}</span>
                    </div>

                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">Initial Population</span>
                        <span>{{ number_format($batch->initial_population) }}</span>
                    </div>

                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">Current Population</span>
                        <span>{{ number_format($batch->current_population) }}</span>
                    </div>

                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">Mortality</span>

                        <span class="font-bold text-red-600">
                            {{ number_format((($batch->initial_population-$batch->current_population)/$batch->initial_population)*100,2) }}%
                        </span>
                    </div>

                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">Date Added</span>
                        <span>{{ \Carbon\Carbon::parse($batch->date_added)->format('M d, Y') }}</span>
                    </div>

                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">Latest Update</span>

                        <span>
                            {{ optional($batch->updates->sortByDesc('created_at')->first())->created_at?->format('M d, Y') ?? 'No updates yet' }}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 gap-3 pt-3">

                        <button
                            @click="
                    updateBatch=true;

                    batchId={{ $batch->id }};
                    batchName='{{ addslashes($batch->batch_name) }}';
                    currentPopulation={{ $batch->current_population }};
                "
                            class="bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg">

                            Update

                        </button>

                        <form
                            action="{{ route('batches.destroy',$batch) }}"
                            method="POST">

                            @csrf
                            @method('DELETE')

                            <button
                                onclick="return confirm('Delete this batch?')"
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

                        No batches found

                    </h2>

                    <p class="text-gray-400 mt-2">

                        Click <b>Add Batch</b> to create your first batch.

                    </p>

                </div>

            </div>

            @endforelse

        </div><!-- Add Batch Modal -->
        <div
            x-show="addBatch"
            x-transition
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div
                @click.away="addBatch=false"
                class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">

                <div class="flex justify-between items-center mb-6">

                    <h2 class="text-2xl font-bold">
                        Add New Batch
                    </h2>

                    <button
                        @click="addBatch=false"
                        class="text-gray-500 hover:text-red-600 text-2xl">
                        &times;
                    </button>

                </div>

                <form action="{{ route('batches.store') }}" method="POST">

                    @csrf

                    <div class="grid grid-cols-2 gap-5">

                        <div>
                            <label class="font-medium">Batch Name</label>

                            <input
                                type="text"
                                name="batch_name"
                                required
                                class="w-full border rounded-lg px-4 py-2 mt-2">
                        </div>

                        <div>
                            <label class="font-medium">Area</label>

                            <select
                                name="area_id"
                                required
                                class="w-full border rounded-lg px-4 py-2 mt-2">

                                <option value="">Select Area</option>

                                @foreach($areas as $area)

                                <option value="{{ $area->id }}">
                                    {{ $area->name }}
                                    ({{ $area->areaType->name }})
                                </option>

                                @endforeach

                            </select>

                        </div>

                        <div>
                            <label class="font-medium">Crayfish Type</label>

                            <select
                                name="crayfish_type_id"
                                required
                                class="w-full border rounded-lg px-4 py-2 mt-2">

                                <option value="">Select Type</option>

                                @foreach($crayfishTypes as $type)

                                <option value="{{ $type->id }}">
                                    {{ $type->name }}
                                </option>

                                @endforeach

                            </select>

                        </div>

                        <div>
                            <label class="font-medium">
                                Initial Population
                            </label>

                            <input
                                type="number"
                                name="initial_population"
                                min="1"
                                required
                                class="w-full border rounded-lg px-4 py-2 mt-2">

                        </div>

                        <div class="col-span-2">

                            <label class="font-medium">
                                Date Added
                            </label>

                            <input
                                type="date"
                                name="date_added"
                                required
                                value="{{ date('Y-m-d') }}"
                                class="w-full border rounded-lg px-4 py-2 mt-2">

                        </div>

                    </div>

                    <div class="flex justify-end gap-3 mt-8">

                        <button
                            type="button"
                            @click="addBatch=false"
                            class="border px-5 py-2 rounded-lg">

                            Cancel

                        </button>

                        <button
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">

                            Save Batch

                        </button>

                    </div>

                </form>

            </div>

        </div><!-- Update Population Modal -->
        <div
            x-show="updateBatch"
            x-transition
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div
                @click.away="updateBatch=false"
                class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">

                <div class="flex justify-between items-center mb-6">

                    <h2 class="text-2xl font-bold">
                        Update Population
                    </h2>

                    <button
                        @click="updateBatch=false"
                        class="text-gray-500 hover:text-red-600 text-2xl">
                        &times;
                    </button>

                </div>

                <form
                    :action="'{{ url('batches') }}/' + batchId"
                    method="POST">

                    @csrf
                    @method('PUT')

                    <div class="space-y-5">

                        <div>

                            <label class="font-medium">
                                Batch Name
                            </label>

                            <input
                                type="text"
                                x-model="batchName"
                                readonly
                                class="w-full border rounded-lg px-4 py-2 mt-2 bg-gray-100">

                        </div>

                        <div>

                            <label class="font-medium">
                                Current Population
                            </label>

                            <input
                                type="number"
                                x-model="currentPopulation"
                                readonly
                                class="w-full border rounded-lg px-4 py-2 mt-2 bg-gray-100">

                        </div>

                        <div>

                            <label class="font-medium">
                                New Population
                            </label>

                            <input
                                type="number"
                                name="current_population"
                                min="0"
                                required
                                class="w-full border rounded-lg px-4 py-2 mt-2">

                        </div>

                    </div>

                    <div class="flex justify-end gap-3 mt-8">

                        <button
                            type="button"
                            @click="updateBatch=false"
                            class="border px-5 py-2 rounded-lg">

                            Cancel

                        </button>

                        <button
                            class="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg">

                            Update Population

                        </button>

                    </div>

                </form>

            </div>

        </div>

    </div>

</x-app-layout>