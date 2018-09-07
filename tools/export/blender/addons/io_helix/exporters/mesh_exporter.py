import struct
from .. import data, data_types, property_types, object_types


class SubMesh:
    stc = None
    name = None
    num_uvs = 0
    vertex_stride = 0
    material_index = 0
    vertex_data = []
    index_data = []
    hash_index_map = {}
    index_count = 0

    def get_vertex_hash(self, pos, normal, uvs):
        vertex_hash = "/" + str(pos) + "/" + str(normal) + "/"
        for i in range(0, self.num_uvs):
            vertex_hash = vertex_hash + str(uvs[i]) + "/"
        return vertex_hash

    def add_vertex(self, pos, normal, uvs):
        assert len(uvs) == self.num_uvs

        vertex_hash = self.get_vertex_hash(pos, normal, uvs)

        if vertex_hash in self.hash_index_map:
            index = self.hash_index_map[vertex_hash]
        else:
            index = self.index_count
            self.hash_index_map[vertex_hash] = index
            self.index_count += 1
            self.vertex_data.extend(list(pos))
            self.vertex_data.extend(list(normal))
            for uv in uvs:
                self.vertex_data.extend(list(uv))

        self.index_data.append(index)


def write_submesh(sub_mesh, file, object_map, src_mesh):
    sub_mesh_index = data.start_object(file, object_types.MESH, object_map)
    object_map.map(src_mesh, sub_mesh_index)
    data.write_string_prop(file, property_types.NAME, sub_mesh.name)
    num_vertices = int(len(sub_mesh.vertex_data) / sub_mesh.vertex_stride)
    data.write_uint32_prop(file, property_types.NUM_VERTICES, num_vertices)

    write_attribute(file, "hx_position", 3, data_types.FLOAT32)
    write_attribute(file, "hx_normal", 3, data_types.FLOAT32)

    for i in range(0, sub_mesh.num_uvs):
        name = "hx_texCoord"
        if i > 0:
            name = name + str(i)
        write_attribute(file, name, 2, data_types.FLOAT32)

    if num_vertices > 65535:
        # we'll need 32 bit to index all vertices
        index_type = data_types.UINT32
    else:
        # 16 bit indices is enough
        index_type = data_types.UINT16

    data.write_uint32_prop(file, property_types.NUM_INDICES, len(sub_mesh.index_data))
    data.write_uint8_prop(file, property_types.INDEX_TYPE, index_type)

    # knowing format and count, we can write the actual indices
    if index_type == data_types.UINT16:
        data.write_uint16_array_prop(file, property_types.INDEX_DATA, sub_mesh.index_data)
    else:
        data.write_uint32_array_prop(file, property_types.INDEX_DATA, sub_mesh.index_data)

    # TODO: Handle skinning data in multiple streams?
    data.write_float32_array_prop(file, property_types.VERTEX_STREAM_DATA, sub_mesh.vertex_data)
    data.end_object(file)


def get_submesh(src, material_index, list):
    for s in list:
        if s.material_index == material_index:
            return s

    sub = SubMesh()
    sub.src = src
    sub.name = src.name
    sub.material_index = material_index
    sub.num_uvs = len(src.uv_layers)
    # positions (3), normals (3), uvs (2 per layer)
    sub.vertex_stride = 6 + sub.num_uvs * 2

    # multiple HX.Mesh objects due to more materials being used
    if len(list) > 0:
        sub.name = sub.name + "_" + str(len(list))

    list.append(sub)
    return sub


def write(mesh, file, object_map):
    sub_meshes = []

    def add_vertex(loop_index):
        vi = mesh.loops[loop_index].vertex_index
        v = mesh.vertices[vi].co
        n = mesh.vertices[vi].normal
        uvs = []

        if not p.use_smooth:
            n = p.normal

        for uv_layer in mesh.uv_layers:
            uvs.append(uv_layer.data[loop_index].uv)

        sub_mesh.add_vertex(v, n, uvs)

    for p in mesh.polygons:
        sub_mesh = get_submesh(mesh, p.material_index, sub_meshes)
        for i, loop_index in enumerate(p.loop_indices):
            # triangulation
            if i >= 2:
                add_vertex(p.loop_indices[0])
                add_vertex(p.loop_indices[i - 1])
                add_vertex(p.loop_indices[i])
                pass

    # we'll use the fact that meshes are sorted by material index when we're linking
    # then we can just loop through the mesh.materials list and link MeshInstance baseIndex + subIndex --> materialIndex
    sub_meshes.sort(key=lambda sub_mesh: str(sub_mesh.material_index))

    for s in sub_meshes:
        write_submesh(s, file, object_map, mesh)


def write_attribute(file, name, num_components, data_type, stream_index = 0):
    data.start_property(file, property_types.VERTEX_ATTRIBUTE)
    file.write(name.encode("utf-8"))
    # write end-of-string, and attribute info
    file.write(struct.pack("<BBBB", 0, num_components, data_type, stream_index))
