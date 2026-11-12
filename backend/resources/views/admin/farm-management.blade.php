<x-app-layout>
    <div x-data="{
    addArea:false,
    crayfishModal:false,
    areaTypeModal:false,
    occupied:0,

    editCrayfishModal:false,
    crayfishId:'',
    crayfishName:'',
    crayfishDescription:'',

    editAreaTypeModal:false,
    areaTypeId:'',
    areaTypeName:'',
    areaTypeDescription:'',

    editArea:false,
    areaId:'',
    areaName:'',
    areaType:'',
    areaCapacity:'',
    areaOccupied:0,
    areaCrayfishType:'',
    areaTotalCrayfish:''
}"
        class="space-y-6">

        <!-- Header -->
        <div class="bg-white rounded-xl shadow p-6">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800">Farm Management</h1>
                    <p class="text-gray-500">Manage crayfish types, area types and farm areas.</p>
                </div>

                <div class="flex gap-3">
                    <button @click="crayfishModal=true"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">
                        + Crayfish Types
                    </button>

                    <button @click="areaTypeModal=true"
                        class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg">
                        + Area Types
                    </button>
                </div>
            </div>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">

            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Total Areas</p>
                <h2 class="text-3xl font-bold mt-2">{{ $areas->count() }}</h2>
            </div>

            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Occupied</p>
                <h2 class="text-3xl font-bold text-red-600 mt-2">{{ $areas->where('occupied',1)->count() }}</h2>
            </div>

            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Available</p>
                <h2 class="text-3xl font-bold text-green-600 mt-2">{{ $areas->where('occupied',0)->count() }}</h2>
            </div>

            <div class="bg-white rounded-xl shadow p-5">
                <p class="text-gray-500 text-sm">Total Crayfish</p>
                <h2 class="text-3xl font-bold text-blue-600 mt-2">{{ number_format($areas->sum('total_crayfish')) }}</h2>
            </div>

        </div>

        <!-- Farm Areas -->
        <div class="bg-white rounded-xl shadow">

            <div class="flex justify-between items-center p-6 border-b">
                <div>
                    <h2 class="text-xl font-bold">Farm Areas</h2>
                    <p class="text-gray-500 text-sm">Manage all tanks, ponds, breeding and hatching areas.</p>
                </div>

                <button @click="addArea=true"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">
                    + Add Area
                </button>
            </div>

            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                    @forelse($areas as $area)

                    <div class="bg-white border rounded-xl shadow-sm hover:shadow-lg transition p-5">

                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-xl font-bold">{{ $area->name }}</h3>
                                <p class="text-gray-500">{{ $area->areaType->name }}</p>
                            </div>

                            @if($area->occupied)
                            <span class="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                                Occupied
                            </span>
                            @else
                            <span class="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                                Available
                            </span>
                            @endif
                        </div>

                        <div class="mt-5 space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-500">Capacity</span>
                                <strong>{{ $area->capacity }}</strong>
                            </div>

                            <div class="flex justify-between">
                                <span class="text-gray-500">Total Crayfish</span>
                                <strong>{{ $area->total_crayfish }}</strong>
                            </div>

                            <div class="flex justify-between">
                                <span class="text-gray-500">Crayfish Type</span>
                                <strong>{{ $area->crayfishType?->name ?? 'None' }}</strong>
                            </div>
                        </div>

                        <div class="flex gap-2 mt-5">
                            <button
                                @click="
        editArea=true;
        areaId={{ $area->id }};
        areaName='{{ addslashes($area->name) }}';
        areaType={{ $area->area_type_id }};
areaCapacity={{ $area->capacity }};
areaOccupied={{ $area->occupied }};
areaCrayfishType={{ $area->crayfish_type_id ?? 'null' }};
areaTotalCrayfish={{ $area->total_crayfish }};
    "
                                class="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg">
                                Edit
                            </button>

                            <form action="{{ route('areas.destroy',$area) }}" method="POST" class="w-full">
                                @csrf
                                @method('DELETE')

                                <button
                                    onclick="return confirm('Delete this area?')"
                                    class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg">
                                    Delete
                                </button>
                            </form>
                        </div>

                    </div>

                    @empty

                    <div class="col-span-full">
                        <div class="border-2 border-dashed rounded-xl py-20 text-center">
                            <h2 class="text-2xl font-bold text-gray-400">No Farm Areas</h2>
                            <p class="text-gray-500 mt-2">Click "Add Area" to create your first area.</p>
                        </div>
                    </div>

                    @endforelse

                </div>
            </div>

        </div>
        <!-- Add Area Modal -->
        <div x-show="addArea" x-transition class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div @click.away="addArea=false" class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">

                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Add Farm Area</h2>

                    <button @click="addArea=false"
                        class="text-gray-500 hover:text-red-600 text-2xl">
                        &times;
                    </button>
                </div>

                <form action="{{ route('areas.store') }}" method="POST">

                    @csrf

                    <div class="grid grid-cols-2 gap-5">

                        <div>
                            <label class="block text-sm font-medium mb-2">Area Name</label>

                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Tank 01"
                                class="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2">Area Type</label>

                            <select
                                name="area_type_id"
                                required
                                class="w-full border rounded-lg px-4 py-2">

                                <option value="">Select Area Type</option>

                                @foreach($areaTypes as $type)
                                <option value="{{ $type->id }}">
                                    {{ $type->name }}
                                </option>
                                @endforeach

                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2">Capacity</label>

                            <input
                                type="number"
                                name="capacity"
                                min="0"
                                required
                                class="w-full border rounded-lg px-4 py-2">
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2">Status</label>

                            <select
                                x-model="occupied"
                                name="occupied"
                                class="w-full border rounded-lg px-4 py-2">

                                <option value="0">Available</option>
                                <option value="1">Occupied</option>

                            </select>
                        </div>

                        <div x-show="occupied==1">
                            <label class="block text-sm font-medium mb-2">Crayfish Type</label>

                            <select
                                name="crayfish_type_id"
                                class="w-full border rounded-lg px-4 py-2">

                                <option value="">Select Crayfish Type</option>

                                @foreach($crayfishTypes as $type)
                                <option value="{{ $type->id }}">
                                    {{ $type->name }}
                                </option>
                                @endforeach

                            </select>
                        </div>

                        <div x-show="occupied==1">
                            <label class="block text-sm font-medium mb-2">Total Crayfish</label>

                            <input
                                type="number"
                                name="total_crayfish"
                                min="0"
                                value="0"
                                class="w-full border rounded-lg px-4 py-2">
                        </div>

                    </div>

                    <div class="flex justify-end gap-3 mt-8">

                        <button
                            type="button"
                            @click="addArea=false"
                            class="border px-5 py-2 rounded-lg">
                            Cancel
                        </button>

                        <button
                            type="submit"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                            Save Area
                        </button>

                    </div>

                </form>

            </div>

        </div>
        <!-- Edit Area Modal -->
        <div x-show="editArea" x-transition class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div @click.away="editArea=false" class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">

                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Edit Area</h2>

                    <button @click="editArea=false"
                        class="text-gray-500 hover:text-red-600 text-2xl">
                        &times;
                    </button>
                </div>

                <form :action="'{{ url('areas') }}/' + areaId" method="POST">

                    @csrf
                    @method('PUT')

                    <div class="grid grid-cols-2 gap-5">

                        <div>
                            <label>Area Name</label>
                            <input
                                x-model="areaName"
                                type="text"
                                name="name"
                                class="w-full border rounded-lg px-4 py-2 mt-2"
                                required>
                        </div>

                        <div>
                            <label>Area Type</label>

                            <select
                                x-model="areaType"
                                name="area_type_id"
                                class="w-full border rounded-lg px-4 py-2 mt-2">

                                @foreach($areaTypes as $type)
                                <option value="{{ $type->id }}">
                                    {{ $type->name }}
                                </option>
                                @endforeach

                            </select>
                        </div>

                        <div>
                            <label>Capacity</label>

                            <input
                                x-model="areaCapacity"
                                type="number"
                                name="capacity"
                                class="w-full border rounded-lg px-4 py-2 mt-2">
                        </div>

                        <div>
                            <label>Status</label>

                            <select
                                x-model="areaOccupied"
                                name="occupied"
                                class="w-full border rounded-lg px-4 py-2 mt-2">

                                <option value="0">Available</option>
                                <option value="1">Occupied</option>

                            </select>
                        </div>

                        <div x-show="areaOccupied==1">
                            <label>Crayfish Type</label>

                            <select
                                x-model="areaCrayfishType"
                                name="crayfish_type_id"
                                class="w-full border rounded-lg px-4 py-2 mt-2">

                                <option value="">Select Crayfish</option>

                                @foreach($crayfishTypes as $type)
                                <option value="{{ $type->id }}">
                                    {{ $type->name }}
                                </option>
                                @endforeach

                            </select>
                        </div>

                        <div x-show="areaOccupied==1">
                            <label>Total Crayfish</label>

                            <input
                                x-model="areaTotalCrayfish"
                                type="number"
                                name="total_crayfish"
                                class="w-full border rounded-lg px-4 py-2 mt-2">
                        </div>

                    </div>

                    <div class="flex justify-end gap-3 mt-8">

                        <button
                            type="button"
                            @click="editArea=false"
                            class="border px-5 py-2 rounded-lg">
                            Cancel
                        </button>

                        <button
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                            Update Area
                        </button>

                    </div>

                </form>

            </div>

        </div>
        <!-- Crayfish Types Modal -->
        <div x-show="crayfishModal" x-transition class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div @click.away="crayfishModal=false" class="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">

                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Crayfish Types</h2>

                    <button @click="crayfishModal=false"
                        class="text-gray-500 hover:text-red-600 text-2xl">
                        &times;
                    </button>
                </div>

                <form action="{{ route('crayfish-types.store') }}" method="POST" class="flex gap-3 mb-6">
                    @csrf

                    <input
                        type="text"
                        name="name"
                        required
                        placeholder="Crayfish Type"
                        class="flex-1 border rounded-lg px-4 py-2">

                    <input
                        type="text"
                        name="description"
                        placeholder="Description"
                        class="flex-1 border rounded-lg px-4 py-2">

                    <button
                        class="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg">
                        Add
                    </button>
                </form>

                <div class="overflow-y-auto max-h-96">

                    <table class="w-full">

                        <thead class="bg-gray-100">
                            <tr>
                                <th class="text-left p-3">Name</th>
                                <th class="text-left p-3">Description</th>
                                <th class="text-center p-3">Actions</th>
                            </tr>
                        </thead>

                        <tbody>

                            @foreach($crayfishTypes as $type)

                            <tr class="border-b">

                                <td class="p-3">{{ $type->name }}</td>

                                <td class="p-3">{{ $type->description }}</td>

                                <td class="p-3 text-center">

                                    <button
                                        @click="
        editCrayfishModal=true;
        crayfishId={{ $type->id }};
        crayfishName='{{ addslashes($type->name) }}';
        crayfishDescription='{{ addslashes($type->description) }}';
    "
                                        class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded">
                                        Edit
                                    </button>

                                    <form action="{{ route('crayfish-types.destroy',$type) }}" method="POST" class="inline">
                                        @csrf
                                        @method('DELETE')

                                        <button
                                            onclick="return confirm('Delete this crayfish type?')"
                                            class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                                            Delete
                                        </button>
                                    </form>

                                </td>

                            </tr>

                            @endforeach

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
        <!-- Edit Crayfish Modal -->
        <div x-show="editCrayfishModal" x-transition class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div @click.away="editCrayfishModal=false" class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">

                <h2 class="text-2xl font-bold mb-6">
                    Edit Crayfish Type
                </h2>

                <form :action="'/crayfish-types/' + crayfishId" method="POST">

                    @csrf
                    @method('PUT')

                    <div class="mb-4">
                        <label>Name</label>

                        <input
                            x-model="crayfishName"
                            type="text"
                            name="name"
                            class="w-full border rounded-lg px-4 py-2 mt-2"
                            required>
                    </div>

                    <div class="mb-5">
                        <label>Description</label>

                        <textarea
                            x-model="crayfishDescription"
                            name="description"
                            rows="3"
                            class="w-full border rounded-lg px-4 py-2 mt-2"></textarea>
                    </div>

                    <div class="flex justify-end gap-3">

                        <button
                            type="button"
                            @click="editCrayfishModal=false"
                            class="border px-5 py-2 rounded-lg">
                            Cancel
                        </button>

                        <button
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                            Update
                        </button>

                    </div>

                </form>

            </div>

        </div>

        <!-- Area Types Modal -->
        <div x-show="areaTypeModal" x-transition class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div @click.away="areaTypeModal=false" class="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">

                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Area Types</h2>

                    <button @click="areaTypeModal=false"
                        class="text-gray-500 hover:text-red-600 text-2xl">
                        &times;
                    </button>
                </div>

                <form action="{{ route('area-types.store') }}" method="POST" class="flex gap-3 mb-6">
                    @csrf

                    <input
                        type="text"
                        name="name"
                        required
                        placeholder="Area Type"
                        class="flex-1 border rounded-lg px-4 py-2">

                    <input
                        type="text"
                        name="description"
                        placeholder="Description"
                        class="flex-1 border rounded-lg px-4 py-2">

                    <button
                        class="bg-green-600 hover:bg-green-700 text-white px-5 rounded-lg">
                        Add
                    </button>
                </form>

                <div class="overflow-y-auto max-h-96">

                    <table class="w-full">

                        <thead class="bg-gray-100">
                            <tr>
                                <th class="text-left p-3">Name</th>
                                <th class="text-left p-3">Description</th>
                                <th class="text-center p-3">Actions</th>
                            </tr>
                        </thead>

                        <tbody>

                            @foreach($areaTypes as $type)

                            <tr class="border-b">

                                <td class="p-3">{{ $type->name }}</td>

                                <td class="p-3">{{ $type->description }}</td>

                                <td class="p-3 text-center">

                                    <button
                                        @click="
        editAreaTypeModal=true;
        areaTypeId={{ $type->id }};
        areaTypeName='{{ addslashes($type->name) }}';
        areaTypeDescription='{{ addslashes($type->description) }}';
    "
                                        class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded">
                                        Edit
                                    </button>

                                    <form action="{{ route('area-types.destroy',$type) }}" method="POST" class="inline">
                                        @csrf
                                        @method('DELETE')

                                        <button
                                            onclick="return confirm('Delete this area type?')"
                                            class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                                            Delete
                                        </button>
                                    </form>

                                </td>

                            </tr>

                            @endforeach

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
        <!-- Edit Area Type Modal -->
        <div x-show="editAreaTypeModal" x-transition class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

            <div @click.away="editAreaTypeModal=false" class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">

                <h2 class="text-2xl font-bold mb-6">
                    Edit Area Type
                </h2>

                <form :action="'/area-types/' + areaTypeId" method="POST">

                    @csrf
                    @method('PUT')

                    <div class="mb-4">
                        <label>Name</label>

                        <input
                            x-model="areaTypeName"
                            type="text"
                            name="name"
                            class="w-full border rounded-lg px-4 py-2 mt-2"
                            required>
                    </div>

                    <div class="mb-5">
                        <label>Description</label>

                        <textarea
                            x-model="areaTypeDescription"
                            name="description"
                            rows="3"
                            class="w-full border rounded-lg px-4 py-2 mt-2"></textarea>
                    </div>

                    <div class="flex justify-end gap-3">

                        <button
                            type="button"
                            @click="editAreaTypeModal=false"
                            class="border px-5 py-2 rounded-lg">
                            Cancel
                        </button>

                        <button
                            class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
                            Update
                        </button>

                    </div>

                </form>

            </div>

        </div>
    </div>

</x-app-layout>